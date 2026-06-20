#!/usr/bin/env node
/**
 * Build-time translation system for the Internet Court Next.js app.
 *
 * Translates `messages/en.json` (source of truth) into every non-default locale
 * incrementally, with a committed cache so builds are deterministic and the API
 * is only called for genuinely new / changed strings.
 *
 * Usage:
 *   node scripts/translate.mjs                # translate all target locales
 *   node scripts/translate.mjs --locale es    # limit to one locale
 *   node scripts/translate.mjs --check        # CI: exit 1 if anything is untranslated (no API calls)
 *   node scripts/translate.mjs --help
 *
 * Env:
 *   ANTHROPIC_API_KEY   required to call the API. If unset, the script reuses the
 *                       cache + existing locale files, warns about gaps, and exits 0.
 *   TRANSLATE_MODEL     model id (default: claude-haiku-4-5-20251001).
 *
 * Cache shape (messages/.translation-cache.json — committed, NOT gitignored):
 *   { "<locale>": { "<dotpath>": { "srcHash": "<sha256 of english source>", "value": "<translation>" } } }
 *
 * Incremental rule, per locale, per leaf:
 *   1. cache hit (srcHash matches current English) -> reuse cached value.
 *   2. else if the existing locale file has a non-empty value at that path -> ADOPT it
 *      (trust the file as the translation for the current source hash; seed the cache).
 *   3. else -> mark for (re)translation via the API.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(HERE, "..", "messages");
const EN_PATH = join(MESSAGES_DIR, "en.json");
const CACHE_PATH = join(MESSAGES_DIR, ".translation-cache.json");
const GLOSSARY_PATH = join(HERE, "translation-glossary.json");

// Target locales: every locale in src/i18n/routing.ts except the default `en`.
// KEEP IN SYNC with frontend/src/i18n/routing.ts `locales`.
const LOCALES = ["es", "ko", "zh", "ru"];

const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-4-5-20251001";
const CHUNK_SIZE = 80; // max strings per API request
const API_KEY = process.env.ANTHROPIC_API_KEY;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "translate.mjs — incremental build-time translation",
      "",
      "  node scripts/translate.mjs              translate all target locales",
      "  node scripts/translate.mjs --locale es  limit to one locale",
      "  node scripts/translate.mjs --check      CI mode: exit 1 if any leaf is untranslated (no API calls)",
      "  node scripts/translate.mjs --help       this message",
      "",
      `Target locales: ${LOCALES.join(", ")}`,
      `Model: ${MODEL} (override with TRANSLATE_MODEL)`,
      "Auth: ANTHROPIC_API_KEY (optional — without it the script reuses cache/files and exits 0)",
    ].join("\n"),
  );
  process.exit(0);
}

const CHECK_MODE = args.includes("--check");
let onlyLocale = null;
{
  const i = args.indexOf("--locale");
  if (i !== -1) {
    onlyLocale = args[i + 1];
    if (!onlyLocale || onlyLocale.startsWith("--")) {
      console.error("Error: --locale requires a value (e.g. --locale es)");
      process.exit(2);
    }
    if (!LOCALES.includes(onlyLocale)) {
      console.error(
        `Error: unknown locale "${onlyLocale}". Known: ${LOCALES.join(", ")}`,
      );
      process.exit(2);
    }
  }
}
const targetLocales = onlyLocale ? [onlyLocale] : LOCALES;

// ---------------------------------------------------------------------------
// Helpers: hashing, flatten / unflatten, placeholder & tag extraction
// ---------------------------------------------------------------------------
function sha256(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Flatten a nested object/array into dot-paths -> string leaves.
 * Arrays use numeric indices (e.g. `voice.do.0`, `voice.substitution.rows.0.1`).
 * Only string leaves are emitted (translatable). Non-string scalars are skipped.
 * Returns a Map preserving insertion order (matches en.json structure order).
 */
function flatten(value, prefix, out) {
  if (typeof value === "string") {
    out.set(prefix, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => {
      flatten(item, prefix ? `${prefix}.${i}` : String(i), out);
    });
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  }
  // numbers / booleans / null: not translatable, skipped
}

/**
 * Rebuild a nested structure that mirrors `template` (en.json), replacing each
 * string leaf with the translated value from `flatMap` (keyed by dot-path).
 * Preserves nesting, arrays, and key order exactly. Non-string leaves are copied
 * verbatim from the template. Missing translations fall back to the English source.
 */
function rebuild(template, flatMap, prefix) {
  if (typeof template === "string") {
    const t = flatMap.get(prefix);
    return t !== undefined && t !== "" ? t : template;
  }
  if (Array.isArray(template)) {
    return template.map((item, i) =>
      rebuild(item, flatMap, prefix ? `${prefix}.${i}` : String(i)),
    );
  }
  if (template && typeof template === "object") {
    const result = {};
    for (const [k, v] of Object.entries(template)) {
      result[k] = rebuild(v, flatMap, prefix ? `${prefix}.${k}` : k);
    }
    return result;
  }
  return template;
}

// ICU placeholders like {name}, {year}. Multiset comparison (order-independent).
function extractPlaceholders(s) {
  return (s.match(/\{[^{}]*\}/g) || []).sort();
}
// Rich-text tags like <accent> and </accent>. Multiset comparison.
function extractTags(s) {
  return (s.match(/<\/?[a-zA-Z][a-zA-Z0-9_-]*\s*>/g) || []).sort();
}
function sameMultiset(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
/** Returns null if valid, else a human-readable reason. */
function validateTranslation(source, translation) {
  if (typeof translation !== "string") return "not a string";
  if (!sameMultiset(extractPlaceholders(source), extractPlaceholders(translation))) {
    return `placeholder mismatch (expected ${JSON.stringify(
      extractPlaceholders(source),
    )}, got ${JSON.stringify(extractPlaceholders(translation))})`;
  }
  if (!sameMultiset(extractTags(source), extractTags(translation))) {
    return `tag mismatch (expected ${JSON.stringify(
      extractTags(source),
    )}, got ${JSON.stringify(extractTags(translation))})`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Anthropic API
// ---------------------------------------------------------------------------
let _client = null;
async function getClient() {
  if (_client) return _client;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return _client;
}

function buildSystemPrompt(locale, glossary) {
  const note = glossary.localeNotes?.[locale] || "";
  return [
    "You are a professional localization engine for a public marketing website (Internet Court).",
    `Translate the provided English UI strings into the target locale: ${locale}.`,
    note ? `Locale note: ${note}` : "",
    "",
    "RULES:",
    ...glossary.rules.map((r) => `- ${r}`),
    "",
    "DO NOT TRANSLATE these terms — keep them EXACTLY as written, in English:",
    glossary.doNotTranslate.map((t) => `"${t}"`).join(", "),
    "",
    "INPUT/OUTPUT CONTRACT:",
    '- You receive a JSON object mapping opaque keys to English strings: {"<key>": "<english>"}.',
    '- Return ONLY a JSON object mapping the SAME keys to the translated strings: {"<key>": "<translation>"}.',
    "- Return every key you were given, and no others. No commentary, no markdown fences.",
    "- Preserve every ICU placeholder ({like_this}) and rich-text tag (<accent>...</accent>) exactly as in the source.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Translate one chunk: { key: english } -> { key: translation }. */
async function translateChunk(locale, chunkObj, glossary) {
  const client = await getClient();
  const system = buildSystemPrompt(locale, glossary);
  const userContent = JSON.stringify(chunkObj, null, 0);

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: userContent }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
    },
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse model JSON for locale "${locale}": ${e.message}\nRaw: ${text.slice(0, 500)}`,
    );
  }
  return parsed;
}

/** Re-translate a single string (used for one-shot retry on validation failure). */
async function translateOne(locale, key, english, glossary) {
  const out = await translateChunk(locale, { [key]: english }, glossary);
  return out[key];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(EN_PATH)) {
    console.error(`Error: source of truth not found at ${EN_PATH}`);
    process.exit(2);
  }
  const en = readJson(EN_PATH);
  const enFlat = new Map();
  flatten(en, "", enFlat);

  const glossary = readJson(GLOSSARY_PATH);

  // Load (or init) the cache.
  let cache = {};
  if (existsSync(CACHE_PATH)) {
    try {
      cache = readJson(CACHE_PATH);
    } catch {
      console.warn("Warning: .translation-cache.json was unreadable; rebuilding from scratch.");
      cache = {};
    }
  }

  const hasKey = Boolean(API_KEY);
  if (!hasKey && !CHECK_MODE) {
    console.log(
      "No ANTHROPIC_API_KEY set — running in offline mode (reuse cache + existing files, no API calls).",
    );
  }

  let totalUntranslated = 0;
  let cacheChanged = false;

  for (const locale of targetLocales) {
    const localePath = join(MESSAGES_DIR, `${locale}.json`);
    let existing = {};
    if (existsSync(localePath)) {
      try {
        existing = readJson(localePath);
      } catch {
        console.warn(`Warning: ${locale}.json was unreadable; treating as empty.`);
        existing = {};
      }
    }
    const existingFlat = new Map();
    flatten(existing, "", existingFlat);

    const rawLocaleCache = cache[locale] || {};
    // Paths the script itself previously filled with the English fallback (NOT
    // real translations). Tracked so we never re-ADOPT our own fallback writes
    // and never count them as translated. Stored under a reserved sentinel key
    // that can't collide with a dot-path.
    const FALLBACK_KEY = " fallback";
    const prevFallbacks = new Set(
      Array.isArray(rawLocaleCache[FALLBACK_KEY])
        ? rawLocaleCache[FALLBACK_KEY]
        : [],
    );
    // Real cache entries only (exclude the sentinel).
    const localeCache = {};
    for (const [k, v] of Object.entries(rawLocaleCache)) {
      if (k !== FALLBACK_KEY) localeCache[k] = v;
    }
    const newLocaleCache = {}; // pruned: only keys present in en.json survive

    const toTranslate = []; // [{ key, english }]
    const resolved = new Map(); // key -> value (real translation: reused/adopted/translated)
    let reused = 0;
    let adopted = 0;

    for (const [key, english] of enFlat) {
      const srcHash = sha256(english);
      const cached = localeCache[key];
      if (cached && cached.srcHash === srcHash && typeof cached.value === "string") {
        // 1. cache hit
        resolved.set(key, cached.value);
        newLocaleCache[key] = { srcHash, value: cached.value };
        reused++;
        continue;
      }
      const fileVal = existingFlat.get(key);
      // 2. ADOPT existing file value as the translation for the current source
      //    hash — but only if it's a genuine translator input, not an English
      //    fallback this script wrote on a prior run.
      if (
        typeof fileVal === "string" &&
        fileVal !== "" &&
        !(prevFallbacks.has(key) && fileVal === english)
      ) {
        resolved.set(key, fileVal);
        newLocaleCache[key] = { srcHash, value: fileVal };
        adopted++;
        cacheChanged = true;
        continue;
      }
      // 3. needs (re)translation
      toTranslate.push({ key, english });
    }

    // Count pruned cache keys (present in old cache, gone from en.json).
    const prunedCount = Object.keys(localeCache).filter(
      (k) => !enFlat.has(k),
    ).length;

    let translated = 0;
    if (toTranslate.length > 0 && hasKey && !CHECK_MODE) {
      for (let i = 0; i < toTranslate.length; i += CHUNK_SIZE) {
        const chunk = toTranslate.slice(i, i + CHUNK_SIZE);
        const chunkObj = {};
        for (const { key, english } of chunk) chunkObj[key] = english;

        const out = await translateChunk(locale, chunkObj, glossary);

        const failed = [];
        for (const { key, english } of chunk) {
          let value = out[key];
          let reason = validateTranslation(english, value);
          if (reason) {
            // one-shot retry for this single string
            try {
              value = await translateOne(locale, key, english, glossary);
              reason = validateTranslation(english, value);
            } catch (e) {
              reason = `${reason}; retry failed: ${e.message}`;
            }
          }
          if (reason) {
            failed.push(`  ${key}: ${reason}`);
            continue;
          }
          resolved.set(key, value);
          newLocaleCache[key] = { srcHash: sha256(english), value };
          translated++;
          cacheChanged = true;
        }
        if (failed.length > 0) {
          console.error(
            `\nFAILED to produce valid translations for locale "${locale}" — placeholders/tags not preserved:\n${failed.join("\n")}`,
          );
          process.exit(1);
        }
      }
    }

    // Anything still unresolved is untranslated (offline mode, check mode, or no key).
    const stillMissing = toTranslate.length - translated;
    totalUntranslated += stillMissing;

    if (!CHECK_MODE) {
      // Write the rebuilt locale file (mirrors en.json structure & order).
      // Unresolved leaves fall back to the English source via rebuild() so the
      // file is structurally complete for next-intl at runtime. Record those
      // fallback paths so future runs don't mistake them for real translations.
      const rebuilt = rebuild(en, resolved, "");
      writeFileSync(localePath, JSON.stringify(rebuilt, null, 2) + "\n", "utf8");
      const fallbackPaths = [];
      for (const [key] of enFlat) {
        if (!resolved.has(key)) fallbackPaths.push(key);
      }
      if (fallbackPaths.length > 0) newLocaleCache[FALLBACK_KEY] = fallbackPaths;
      cache[locale] = newLocaleCache;
      if (prunedCount > 0) cacheChanged = true;
    }

    const parts = [
      `${reused} reused`,
      `${adopted} adopted`,
      `${translated} translated`,
      `${prunedCount} pruned`,
    ];
    if (stillMissing > 0) parts.push(`${stillMissing} UNTRANSLATED`);
    console.log(`[${locale}] ${parts.join(" / ")}`);
  }

  // Prune locales from the cache that are no longer targets (keep listed ones).
  if (!CHECK_MODE && !onlyLocale) {
    for (const k of Object.keys(cache)) {
      if (!LOCALES.includes(k)) {
        delete cache[k];
        cacheChanged = true;
      }
    }
  }

  // Always write the cache in non-check mode so it exists as a committed,
  // deterministic build artifact. `cacheChanged` is tracked only for logging
  // clarity; rewriting an identical file is harmless and keeps the cache present
  // from the very first run (the seed/adopt path).
  void cacheChanged;
  if (!CHECK_MODE) {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
  }

  if (CHECK_MODE) {
    if (totalUntranslated > 0) {
      console.error(
        `\n--check FAILED: ${totalUntranslated} untranslated leaf(s) across ${targetLocales.join(", ")}.`,
      );
      process.exit(1);
    }
    console.log("--check passed: all leaves translated.");
    return;
  }

  if (totalUntranslated > 0) {
    console.warn(
      `\nWARNING: ${totalUntranslated} leaf(s) remain untranslated (output fell back to English).` +
        (hasKey
          ? ""
          : " Set ANTHROPIC_API_KEY to translate them."),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
