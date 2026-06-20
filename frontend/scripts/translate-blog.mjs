#!/usr/bin/env node
/**
 * Build-time MDX blog translation for the Internet Court Next.js app.
 *
 * Mirrors scripts/translate.mjs but for blog posts. The English posts in
 * src/content/blog/en/*.mdx are the source of truth. For each target locale,
 * the human-readable frontmatter fields (title, excerpt, tag) and the full
 * Markdown body are translated via the Anthropic SDK, using the SAME glossary
 * as the JSON pipeline (scripts/translation-glossary.json).
 *
 * Usage:
 *   node scripts/translate-blog.mjs                # translate all target locales
 *   node scripts/translate-blog.mjs --locale es    # limit to one locale
 *   node scripts/translate-blog.mjs --check        # CI: exit 1 if anything is untranslated (no API calls)
 *   node scripts/translate-blog.mjs --help
 *
 * Env:
 *   ANTHROPIC_API_KEY   required to call the API. If unset, the script reuses the
 *                       cache + existing translated MDX files, warns about gaps,
 *                       and exits 0 — it NEVER overwrites committed translations.
 *   TRANSLATE_MODEL     model id (default: claude-haiku-4-5-20251001).
 *
 * Cache shape (messages/.mdx-translation-cache.json — committed, NOT gitignored):
 *   { "<locale>": { "<slug>": { "srcHash": "<sha256 of english .mdx>" } } }
 *
 * Incremental rule, per locale, per post:
 *   1. cache hit (srcHash matches current English source) -> skip (already translated).
 *   2. else if a translated .mdx already exists for that slug -> ADOPT it
 *      (treat the committed file as authoritative; seed the cache; do NOT retranslate).
 *   3. else -> mark for translation via the API.
 *
 * Translatable frontmatter fields: title, excerpt, tag.
 * Preserved verbatim: frontmatter keys, date, cover, slug/filename, code blocks,
 * inline code, URLs, image paths, and all do-not-translate glossary terms.
 */

import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(HERE, "..", "messages");
const BLOG_ROOT = join(HERE, "..", "src", "content", "blog");
const EN_DIR = join(BLOG_ROOT, "en");
const CACHE_PATH = join(MESSAGES_DIR, ".mdx-translation-cache.json");
const GLOSSARY_PATH = join(HERE, "translation-glossary.json");

// KEEP IN SYNC with frontend/src/i18n/routing.ts `locales` (minus default `en`).
const LOCALES = ["es", "ko", "zh", "ru"];

// Human-readable frontmatter fields to translate. Everything else is verbatim.
const TRANSLATABLE_FRONTMATTER = ["title", "excerpt", "tag"];

const MODEL = process.env.TRANSLATE_MODEL || "claude-haiku-4-5-20251001";
const API_KEY = process.env.ANTHROPIC_API_KEY;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "translate-blog.mjs — incremental build-time MDX translation",
      "",
      "  node scripts/translate-blog.mjs              translate all target locales",
      "  node scripts/translate-blog.mjs --locale es  limit to one locale",
      "  node scripts/translate-blog.mjs --check      CI mode: exit 1 if any post is untranslated (no API calls)",
      "  node scripts/translate-blog.mjs --help       this message",
      "",
      `Target locales: ${LOCALES.join(", ")}`,
      `Model: ${MODEL} (override with TRANSLATE_MODEL)`,
      "Auth: ANTHROPIC_API_KEY (optional — without it the script reuses committed files and exits 0)",
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
// Helpers
// ---------------------------------------------------------------------------
function sha256(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Minimal frontmatter split: returns { frontmatter (raw lines as text), body }.
 * We do NOT fully parse/serialize YAML (to preserve key order, quoting and
 * formatting exactly); instead we operate on the raw frontmatter block and only
 * rewrite the specific translatable lines.
 */
function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: "", body: raw, hasFm: false };
  return { frontmatter: m[1], body: m[2], hasFm: true };
}

/** Extract a `key: "value"` (or `key: value`) frontmatter field's string value. */
function getFmField(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`, "m");
  const m = frontmatter.match(re);
  if (!m) return null;
  let v = m[1].trim();
  // strip surrounding quotes
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

/** Replace a frontmatter field's value, preserving double-quote style. */
function setFmField(frontmatter, key, value) {
  const re = new RegExp(`^(${key}:\\s*)(.*)$`, "m");
  const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return frontmatter.replace(re, `$1"${escaped}"`);
}

function listSlugs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.mdx?$/, ""));
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
    "You are a professional localization engine for the Internet Court blog.",
    `Translate the provided English MDX blog post into the target locale: ${locale}.`,
    note ? `Locale note: ${note}` : "",
    "",
    "RULES:",
    ...glossary.rules.map((r) => `- ${r}`),
    "",
    "DO NOT TRANSLATE these terms — keep them EXACTLY as written, in English:",
    glossary.doNotTranslate.map((t) => `"${t}"`).join(", "),
    "",
    "MDX-SPECIFIC RULES:",
    "- Preserve Markdown structure exactly: headings (#), lists, blockquotes (>), bold/italic markers, links.",
    "- NEVER translate or alter: fenced code blocks, inline `code`, URLs, image paths, HTML/JSX tags and their attribute values (e.g. <Video src=\"...\" caption=\"...\"/> — you MAY translate human-readable attribute text like a caption, but NEVER the src URL).",
    "- Keep MDX comments {/* ... */} EXACTLY as written, untranslated.",
    "- Keep emphasis/strong markers around the same words (e.g. **statement** -> **<translated>**).",
    "",
    "INPUT/OUTPUT CONTRACT:",
    '- You receive a JSON object: {"frontmatter": {<field>: <english>, ...}, "body": "<english markdown body>"}.',
    '- Return ONLY a JSON object with the SAME shape: {"frontmatter": {<field>: <translation>, ...}, "body": "<translated markdown body>"}.',
    "- Translate every frontmatter field value and the body. Return the same frontmatter keys. No commentary, no markdown fences around the JSON.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function translatePost(locale, payload, glossary) {
  const client = await getClient();
  const system = buildSystemPrompt(locale, glossary);
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: JSON.stringify(payload, null, 0) }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            frontmatter: { type: "object", additionalProperties: { type: "string" } },
            body: { type: "string" },
          },
          required: ["frontmatter", "body"],
        },
      },
    },
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Failed to parse model JSON for locale "${locale}": ${e.message}\nRaw: ${text.slice(0, 500)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(EN_DIR)) {
    console.error(`Error: English blog source dir not found at ${EN_DIR}`);
    process.exit(2);
  }

  const glossary = readJson(GLOSSARY_PATH);
  const slugs = listSlugs(EN_DIR);

  let cache = {};
  if (existsSync(CACHE_PATH)) {
    try {
      cache = readJson(CACHE_PATH);
    } catch {
      console.warn(
        "Warning: .mdx-translation-cache.json was unreadable; rebuilding from scratch.",
      );
      cache = {};
    }
  }

  const hasKey = Boolean(API_KEY);
  if (!hasKey && !CHECK_MODE) {
    console.log(
      "No ANTHROPIC_API_KEY set — running in offline mode (reuse cache + committed MDX, no API calls, no overwrites).",
    );
  }

  let totalUntranslated = 0;

  for (const locale of targetLocales) {
    const outDir = join(BLOG_ROOT, locale);
    const localeCache = cache[locale] || {};
    const newLocaleCache = {};
    let reused = 0;
    let adopted = 0;
    let translated = 0;
    let missing = 0;

    for (const slug of slugs) {
      const enPath = join(EN_DIR, `${slug}.mdx`);
      const enRaw = readFileSync(enPath, "utf8");
      const srcHash = sha256(enRaw);
      const outPath = join(outDir, `${slug}.mdx`);
      const outExists = existsSync(outPath);

      const cached = localeCache[slug];
      if (cached && cached.srcHash === srcHash && outExists) {
        // 1. cache hit + file present -> already translated.
        newLocaleCache[slug] = { srcHash };
        reused++;
        continue;
      }
      if (outExists) {
        // 2. ADOPT the committed translated file as authoritative for the
        //    current source hash. Do NOT overwrite it.
        newLocaleCache[slug] = { srcHash };
        adopted++;
        continue;
      }
      // 3. needs translation.
      if (!hasKey || CHECK_MODE) {
        missing++;
        continue;
      }

      const { frontmatter, body, hasFm } = splitFrontmatter(enRaw);
      const fmPayload = {};
      for (const f of TRANSLATABLE_FRONTMATTER) {
        const v = getFmField(frontmatter, f);
        if (v != null) fmPayload[f] = v;
      }
      const result = await translatePost(
        locale,
        { frontmatter: fmPayload, body },
        glossary,
      );

      let newFm = frontmatter;
      for (const f of Object.keys(fmPayload)) {
        const tv = result.frontmatter?.[f];
        if (typeof tv === "string" && tv !== "") {
          newFm = setFmField(newFm, f, tv);
        }
      }
      const newBody = typeof result.body === "string" ? result.body : body;
      const out = hasFm
        ? `---\n${newFm}\n---\n\n${newBody.replace(/^\n+/, "")}`
        : newBody;

      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      writeFileSync(outPath, out.endsWith("\n") ? out : out + "\n", "utf8");
      newLocaleCache[slug] = { srcHash };
      translated++;
    }

    totalUntranslated += missing;
    cache[locale] = newLocaleCache;

    const parts = [
      `${reused} reused`,
      `${adopted} adopted`,
      `${translated} translated`,
    ];
    if (missing > 0) parts.push(`${missing} UNTRANSLATED`);
    console.log(`[${locale}] ${parts.join(" / ")}`);
  }

  // Prune locales no longer targeted (full runs only).
  if (!CHECK_MODE && !onlyLocale) {
    for (const k of Object.keys(cache)) {
      if (!LOCALES.includes(k)) delete cache[k];
    }
  }

  if (!CHECK_MODE) {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
  }

  if (CHECK_MODE) {
    if (totalUntranslated > 0) {
      console.error(
        `\n--check FAILED: ${totalUntranslated} untranslated post(s) across ${targetLocales.join(", ")}.`,
      );
      process.exit(1);
    }
    console.log("--check passed: all posts translated.");
    return;
  }

  if (totalUntranslated > 0) {
    console.warn(
      `\nWARNING: ${totalUntranslated} post(s) remain untranslated (blog falls back to English at runtime).` +
        (hasKey ? "" : " Set ANTHROPIC_API_KEY to translate them."),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
