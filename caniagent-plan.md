# caniagent — Implementation & Research Plan

> **Can I Agent?** — A "Can I Use"-style readiness map for the agentic-commerce stack.
> Inspired by [caniuse.com](https://caniuse.com), branded as Internet Court.
> An **interactive heatmap** of the six-layer agent-commerce stack: each layer (and each
> standard/protocol within it, and each integration *between* layers) is colored on a
> green→red **readiness scale**. Hover any cell to read *why* it has that color.
>
> This file drives **two parallel threads**:
> - **Thread A — BUILD** (this repo, in `frontend/`): build 5 interactive page variants.
> - **Thread B — RESEARCH** (separate Claude Code session): investigate every entry and
>   write the color justification. See **§7** for the copy-paste prompt + how to run it.
>
> The two threads meet at a shared **data contract** (§4). Build can start against mock
> data immediately; research output drops in and the pages light up.

---

## 0. TL;DR for each thread

**Thread A (build):** Read §1–§6. Build against the mock data in
`frontend/src/data/caniagent/readiness.sample.json` (§4) until real data lands. Per
`CLAUDE.md` work-mode, orchestrate via sub-agents — do not implement in the main session.
Ship 5 variant routes + an index, behind `noindex`, `npm run build` clean.

**Thread B (research):** Read §4 (schema) and §7 (your prompt + entry list). Fan out one
research sub-agent per entry. Each produces `score` (1–5), `status`, `summary`, and a
2-paragraph `reason`, with `sources`. Write everything to
`frontend/src/data/caniagent/readiness.json` matching the schema exactly.

---

## 1. Concept & goals

caniuse.com answers *"can I use this web feature in browsers today?"* with a colored
support grid. **caniagent** answers *"can I build autonomous agent-to-agent commerce
today — and which parts of the stack are actually ready?"*

The subject matter is the **six-layer agentic-commerce stack** already visualized in the
homepage "Stack" animation (`AnimatedStack.tsx`). caniagent turns that static narrative
into an **interactive readiness heatmap**:

1. **Per-layer heatmap** — each of the 6 layers gets a color (green = production-ready,
   red = theoretical/missing) reflecting how mature/usable that layer is *today*.
2. **Per-standard heatmap** — within each layer, each named standard/protocol
   (ERC-7857, A2A, x402, GenLayer, …) gets its own readiness color.
3. **Connections/integrations heatmap** — the *edges between layers* (e.g. does
   negotiation → contracts actually compose? does payment ↔ execution integrate?) are
   **also** color-coded. This is the part the user emphasized: *"show not only a heatmap
   of each level but also of the connections and integrations between each of them, in a
   clever way."*
4. **Hover-to-explain** — hovering any cell/node/edge reveals a short card with the
   `summary` + the first `reason` paragraph; clicking opens the full reason + sources.

**Design goal:** 5 distinct interactive treatments (§3) so the user can pick a direction,
exactly like the `hero-previews` page did for heroes. Some lean Can-I-Use (dense, tabular,
familiar); some lean Internet Court (editorial, red-accent, motion-rich).

**Non-goals:** real-time data, backend, auth. This is a static, content-driven marketing
artifact. Color/justification data is authored (by Thread B), committed as JSON.

---

## 2. Where it lives (routing)

next-intl App Router, `[locale]` segment, `localePrefix: "as-needed"` (en has no prefix).
Mirror the `hero-previews` pattern (internal, `robots: noindex`).

```
frontend/src/app/[locale]/caniagent/
  page.tsx              # index: explains caniagent + links to all 5 variants (the "previews" hub)
  grid/page.tsx         # Variant 1 — Classic Grid (Can I Use style)
  stack/page.tsx        # Variant 2 — Living Stack heatmap (Internet Court style)
  graph/page.tsx        # Variant 3 — Constellation graph
  matrix/page.tsx       # Variant 4 — Adjacency matrix
  roadmap/page.tsx      # Variant 5 — Maturity roadmap

frontend/src/components/caniagent/   # shared building blocks (see §5)
frontend/src/data/caniagent/
  taxonomy.ts                 # the fixed entry list: layers, standards, connections (IDs)
  readiness.sample.json       # MOCK data for build (Thread A commits this first)
  readiness.json              # REAL data (Thread B writes this; same schema)
  load.ts                     # merges taxonomy + readiness, typed accessors
```

- All variant pages and the index export `robots: { index: false, follow: false }` while
  in preview, same as `hero-previews/page.tsx`.
- Use `Link` from `@/i18n/routing` (not `next/link`) for internal nav.
- i18n: chrome/labels go through `getTranslations("caniagent")` and into **all five**
  `messages/*.json`. The readiness *content* (reasons) stays English-only in the JSON for
  now (note this as a follow-up; do not block on translating reasons).
- Reuse `SectionHeading`, `Accent`, `Header`/`Footer` (already in the locale layout).

---

## 3. The five variants  (REVISED after round-1 review)

**Round-1 verdict:** grid ❌, graph ❌, matrix ❌ — dropped. **Stack**: liked the *idea*,
design was broken → rebuild from scratch. **Roadmap**: liked → mix into the stack. So
round 2 = **5 fresh variants, all Stack×Roadmap**, built from scratch.

**Hard constraints for every round-2 variant:**
- **NO left-side arrows / arc rails / spines for connections.** (Round-1 stack & roadmap
  drew connection arcs on a left gutter — the user explicitly disliked these.) Show
  integrations *inline* — in seams, columns, connectors, tabs, or badges.
- **No back-arrow links** or other left-edge nav affordances on variant pages.
- **Robust, static-first.** Render correct with zero JS; animation is progressive
  enhancement only. Do **not** depend on DOM-measured `getBoundingClientRect` /
  `getTotalLength` SVG geometry for correctness — that is what broke round-1. Prefer CSS /
  inline layout; if SVG is used, use a fixed viewBox with computed coordinates.
- Keep **Stack DNA** (6 layers stacked = the agentic-commerce lifecycle) and mix in
  **Roadmap DNA** (maturity axis Theoretical→Experimental→Emerging→Available→Production,
  mapping score 1→5).
- Satisfy all four requirements: per-layer heatmap + per-standard heatmap + connections +
  hover-to-explain (`ReasonCard`). Real data is in `readiness.json` now.

### Variant 1 — "Strata"  (route `strata`)
Geological strata. 6 full-width horizontal bands stacked (the layers). **Inside each band a
left→right maturity axis**; standards plotted as nodes at their maturity position. Band
tinted by layer readiness. **Connections live in the seams**: the divider between two
adjacent bands is colored by their integration score (a "fault line"); non-adjacent
integrations (e.g. 01↔06) shown as small colored markers at the band's right edge.

### Variant 2 — "Ledger"  (route `ledger`)
Editorial caniuse-style table. Rows = layers. Columns: **# · Layer · Standards** (colored
chips) **· Readiness** (filled %-bar) **· Integrations** (a compact inline strip of colored
mini-squares, one per connection involving this layer — like a caniuse support row, NO
arcs). Dense, scannable, professional.

### Variant 3 — "Thermal"  (route `thermal`)
Bold heat-map tiles. 6 big stacked tiles, fill = layer readiness; each holds standard heat
sub-cells. Hover/click a layer → it expands and its integrations appear as **inline
connector tabs** joining it to its connected layers (centered/right — never left). Strong
color, motion-light, very robust.

### Variant 4 — "Flow"  (route `flow`)
Vertical lifecycle pipeline (discovery→disputes reads top→bottom). 6 step cards. **Centered
vertical connector segments between consecutive cards, colored by integration readiness**
(the "pipe"). Non-adjacent integrations as right-edge colored tabs. Standards inside each
card as chips with a tiny 5-dot maturity meter.

### Variant 5 — "Lanes"  (route `lanes`)  ← the liked roadmap, refined + merged with stack
6 stacked lanes + a sticky maturity header (Theoretical→Production). Standards plotted by
maturity in their lane. **Layer readiness as a bold color block on the RIGHT edge** (% +
label) — deliberately right, not left. Connections: hovering a lane highlights the lanes it
integrates with + shows inline score badges; plus a compact always-on integration strip at
the bottom. No left arcs.

> Deliverable: **5 variant pages + 1 index hub**. Build all 5, user picks the winner →
> promote to public `/caniagent` (drop `noindex`) + wire i18n. Round-1
> grid/graph/matrix/old-stack/old-roadmap files are deleted.

---

## 4. Data contract (shared by both threads) — READ THIS CAREFULLY

This is the contract where Thread A and Thread B meet. **Do not change field names without
updating both threads.**

### 4.1 The taxonomy (fixed; lives in `taxonomy.ts`, authored by Thread A)
Three entry kinds, derived from `STACK_ROWS` in `frontend/src/lib/site-content.ts`:

**Layers (6):**
| id | n | name |
|----|----|------|
| `layer-01` | 01 | Discovery, identity & reputation |
| `layer-02` | 02 | Negotiation |
| `layer-03` | 03 | Contracts & obligations |
| `layer-04` | 04 | Payment & escrow |
| `layer-05` | 05 | Execution |
| `layer-06` | 06 | Verification & disputes |

**Standards (per layer):**
| id | layer | name | what it is (seed; research confirms) |
|----|-------|------|----------------------|
| `std-erc7857`  | layer-01 | ERC-7857 | Verifiable identity / agent identity NFTs |
| `std-erc8004`  | layer-01 | ERC-8004 | Trustless agent reputation/registry |
| `std-a2a`      | layer-02 | A2A | Google Agent-to-Agent negotiation protocol |
| `std-erc7710`  | layer-03 | ERC-7710 | Smart-contract delegation |
| `std-erc8183`  | layer-03 | ERC-8183 | (confirm) obligations standard |
| `std-arkhai`   | layer-03 | Arkhai | Obligations / agreements framework |
| `std-x402`     | layer-04 | x402 | HTTP 402 stablecoin payments |
| `std-mpp`      | layer-04 | MPP | (confirm) merchant/agent payment protocol |
| `std-app`      | layer-04 | APP | (confirm) agent payments protocol |
| `std-openclaw` | layer-05 | OpenClaw | (confirm) execution framework |
| `std-hermes`   | layer-05 | Hermes | (confirm) execution/messaging |
| `std-genlayer` | layer-06 | GenLayer | Intelligent-contract AI jury |
| `std-kleros`   | layer-06 | Kleros | Decentralized arbitration |
| `std-uma`      | layer-06 | UMA | Optimistic oracle |

> Thread B: **verify each standard's identity/name first** — some (ERC-8183, MPP, APP,
> OpenClaw, Hermes) are best-guess expansions. If a name is wrong or a standard doesn't
> exist, flag it in `notes` and grade what it most plausibly refers to. Internet Court's
> own engine is GenLayer (layer-06).

**Connections (integrations between layers):** grade these edges. Seed set (Thread A puts
exact list in `taxonomy.ts`; Thread B grades each):
- `conn-01-02` Discovery → Negotiation
- `conn-02-03` Negotiation → Contracts
- `conn-03-04` Contracts → Payment/Escrow
- `conn-04-05` Payment → Execution
- `conn-05-06` Execution → Verification
- `conn-01-06` Identity ↔ Verification (reputation feedback loop)
- `conn-03-06` Contracts ↔ Verification (obligations are what's judged)
- `conn-04-06` Escrow ↔ Verification (resolution releases funds)

### 4.2 Readiness scale (5 steps, green→red)
| score | status | meaning | color token |
|-------|--------|---------|-------------|
| 5 | `production` | Live, multiple real deployments, usable today | green `#059669` |
| 4 | `available` | Spec final + working implementations, early production | light green `#65a30d` |
| 3 | `emerging` | Draft/active spec, prototypes exist, not battle-tested | amber `#d97706` |
| 2 | `experimental` | Early proposal, single/reference impl, unstable | orange `#ea580c` |
| 1 | `theoretical` | Idea/whitepaper only, little/no working code | red `#dc2626` |

(Reuse the product's existing semantic colors where they line up: success `#059669`,
warning `#d97706`, error/red `#dc2626`. Build a 5-stop interpolated scale in
`components/caniagent/scale.ts`.)

### 4.3 Output schema (`readiness.json` — array of entries)
```jsonc
{
  "version": 1,
  "generatedAt": "2026-06-19",
  "entries": [
    {
      "id": "std-x402",            // matches taxonomy id EXACTLY
      "type": "standard",          // "layer" | "standard" | "connection"
      "layer": "layer-04",         // parent layer (standards); for connection use "from"/"to" below
      "from": null,                // connections only: source layer id
      "to": null,                  // connections only: target layer id
      "name": "x402",
      "title": "HTTP 402 stablecoin payments",
      "score": 4,                  // 1..5 per §4.2
      "status": "available",       // label matching the score
      "summary": "One sentence (<140 chars) for the hover card.",
      "reason": "Paragraph 1 — what it is and current state of adoption.\n\nParagraph 2 — why it earns THIS color: maturity, who ships it, gaps.",
      "sources": ["https://...", "https://..."],
      "notes": "",                 // optional: corrections, caveats, name disputes
      "lastReviewed": "2026-06-19"
    }
  ]
}
```
Rules:
- One entry per taxonomy id. **Every** layer, standard, and connection must appear.
- `reason` is exactly **two paragraphs**, separated by a blank line (`\n\n`).
- `score` and `status` must agree (§4.2).
- `sources`: 1–4 real URLs the agent actually consulted.

---

## 5. Shared components (`frontend/src/components/caniagent/`)
Build these once; all 5 variants consume them:
- `scale.ts` — score→color, score→label, the legend definition, a `cellStyle(score)` helper.
- `ReasonCard.tsx` — the hover/click card: name, status pill, summary, reason paragraphs,
  source links. Used by every variant.
- `Legend.tsx` — the 5-step color legend (caniuse-style).
- `useReadiness.ts` (or `load.ts`) — loads taxonomy + readiness, returns typed entries,
  with graceful fallback to `readiness.sample.json` when an id is missing real data
  (render it gray "unrated" rather than crashing).
- Keep to the codebase style: plain divs + Tailwind v4 tokens, `cn()` from `@/lib/utils`,
  GSAP for motion (already a dep; no framer-motion, no chart lib unless truly needed).

---

## 6. Build phases (Thread A)
1. **Scaffold data** — write `taxonomy.ts` (all ids from §4.1) + `readiness.sample.json`
   (plausible mock scores/reasons for every id) + `load.ts`. Commit so Thread B has the
   exact id list to grade.
2. **Shared components** — `scale.ts`, `Legend`, `ReasonCard`, loader.
3. **Variants** — build all 5 (§3) + the index hub. One sub-agent per variant is ideal.
4. **Wire real data** — when `readiness.json` lands from Thread B, switch the loader to
   prefer it; sample becomes fallback only.
5. **Verify** — `npm run build` clean, lint scoped to new files, tsc clean. Visually check
   hover/interaction on each variant. All pages `noindex`.
6. **Report** the 6 preview URLs (index + 5) to the user for a pick.

Deploy to **staging** only (`staging.internetcourt.org`), never prod unless asked.

---

## 7. Thread B — Research agent: prompt + how to run

> Open a **separate Claude Code session** in this repo. The goal: produce
> `frontend/src/data/caniagent/readiness.json` (schema in §4.3) grading every entry in the
> taxonomy (§4.1). Each entry needs a green→red readiness score and a two-paragraph reason.

### 7.1 How to run it
1. Start a fresh session in `/Users/rasca/Dev/moltcourt2`.
2. Make sure Thread A has committed `taxonomy.ts` (the authoritative id list). If not, use
   the §4.1 tables directly.
3. Paste the prompt in §7.2. It instructs the orchestrator to **fan out one research
   sub-agent per entry, in parallel** (≈28 entries: 6 layers + 14 standards + 8
   connections), each doing live web research, then merge results into one JSON file.
4. Alternatively, for deeper rigor, run the bundled **`/deep-research`** skill per layer
   (one invocation per layer covering its standards + outgoing connections) — slower but
   more sources. The fan-out prompt below is the default/faster path.

### 7.2 Copy-paste prompt for Thread B

```
You are populating readiness data for "caniagent" — a Can-I-Use-style readiness heatmap
of the agentic-commerce stack. Read `caniagent-plan.md` §4 (the data contract) in this
repo first. Your deliverable is ONE file:
`frontend/src/data/caniagent/readiness.json`, matching the schema in §4.3 exactly.

The entries to grade are defined in `frontend/src/data/caniagent/taxonomy.ts` (if it
exists) or in `caniagent-plan.md` §4.1: 6 layers, ~14 standards, ~8 connections.

Work mode (per CLAUDE.md): orchestrate only — do NOT research in the main session. Spawn
one research sub-agent PER ENTRY, running in parallel batches. Each sub-agent must:
  1. Do live web research (WebSearch/WebFetch) on its assigned entry. For STANDARDS, first
     verify the standard actually exists and the name is right (ERC-8183, MPP, APP,
     OpenClaw, Hermes are best-guesses — correct them; record disputes in `notes`).
  2. Assess current readiness for autonomous agent-to-agent commerce TODAY and assign a
     score 1–5 on the green→red scale in §4.2 (5=production, 1=theoretical), with the
     matching `status` label.
  3. Write `summary` (one sentence, <140 chars) and `reason` (EXACTLY two paragraphs
     separated by a blank line: ¶1 what it is + current state; ¶2 why it earns THIS color).
  4. Return a single JSON object for that entry (schema §4.3) with 1–4 real `sources` URLs.

For LAYER entries, judge the layer holistically (rolling up its standards). For CONNECTION
entries, judge whether the two layers actually compose/integrate today (shared standards,
real end-to-end examples) — set `from`/`to` to the layer ids.

Be calibrated and skeptical: a shiny whitepaper with no shipping code is a 1–2, not a 4.
Internet Court's own engine is GenLayer (layer-06) — grade it on real GenLayer maturity,
no boosterism.

After all sub-agents return, the main session merges every object into the §4.3 envelope
(`version`, `generatedAt` = today's date passed in, `entries: [...]`), validates that every
taxonomy id appears exactly once and score/status agree, and writes the file. Report any
ids you could not confidently grade.
```

### 7.3 Hand-off back to Thread A
When `readiness.json` is committed, ping Thread A (or the user) so phase 4 (wire real data)
runs and the heatmaps reflect researched colors.

---

## 8. Open questions / decisions for the user
- **Brand name:** "caniagent" working title. Confirm spelling/wordmark ("Can I Agent?",
  "caniagent.org/.com"). Affects index hero copy only.
- **Public launch:** preview-only (`noindex`) until a variant is chosen, then promote one
  to a public `/caniagent`. Confirm that lifecycle.
- **Standard taxonomy:** confirm the standards list (§4.1) is the right scope, or
  add/remove protocols before Thread B runs.
- **Reason translation:** ship English-only reasons first; translate later via the existing
  build-time pipeline. OK?
```
