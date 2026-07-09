# tasks.md — InternetCourt Active Tasks

> Claude: Read this file at the start of every session. Update task status as you work. Add new tasks when the user requests them.

## In Progress

### Brand restyle — apply TIC one-pager look and feel site-wide (Pablo)
- Apply the Internet Court brand system (from the one-pager at `/Users/pdepablo/Documents/02 Work/01 GenLayer/07 Internet Court/00 TIC Files/One Pager/index.html`) to the whole frontend: paper `#f7f4ec` background, ink `#1c1a16`, muted `#6c665a`, band `#efe9da`, lines `#d9d3c4`/`#e7e1d4`, red `#dc2626`, oxblood accent `#c0362b`.
- Fonts: DM Sans body + DM Mono labels (already wired). Headings: Martina Plantijn is the brand serif but Pablo will supply an alternative; interim = Spectral via a single `--font-serif-brand` swap point.
- HARD CONSTRAINT: zero content changes. All copy, sections, and information stay exactly as-is. Styling only.
- Do NOT run `npm run build` (prebuild translate clobbers messages/ on concurrent runs). Dev server on :8000 (Pablo's session), webpack hot reload. Type-check with `npx tsc --noEmit` only.
- Status: DONE (uncommitted). Tokens remapped in globals.css :root; ~25 files recolored (header, footer chrome, all homepage sections, blog, FAQ, OG images, manifest). Zero copy changes; messages/ and src/content/ untouched. tsc clean; /, /faq, /blog, blog posts all 200 on Pablo's :8000 dev server.
- Serif iteration RESOLVED: Pablo rejected the serif/sans "double style" entirely. ALL headings site-wide are now DM Sans SemiBold (600), tracking -0.03em, upright, red #dc2626 accent words kept (matches his Figma frame exactly: H2 48px, CTA 52px, briefings 36px, featured post 32px, hero 64px). Spectral loader + `--font-serif-brand` REMOVED from layout.tsx; `.font-heading`/`.font-display`/`.font-quote` all = DM Sans 600. Blog blockquotes = DM Sans italic. Zero serif references left.
- AnimatedStack.tsx TDZ crash fixed (other session's pin/settle code): `onLeave: (self) => ... self.kill(true)` instead of closing over `const st` (onLeave can fire synchronously during ScrollTrigger.create after hot-reload scroll restoration). Minimal fix, approach untouched.
- Pre-existing, NOT ours: `MISSING_MESSAGE: blog.tags.FILL ME` from another session's draft `src/content/blog/en/internet-court-future.mdx` (placeholder tag).
- Round 6 (DONE, uncommitted, tsc clean, 2026-07-09): hero md-to-lg breakpoint restructured per Pablo (tablet screenshot: stacked card pushed video below fold). md-lg now = row 1: eyebrow+H1 (40px, flex-1) LEFT + SkillCommand card (`md:w-[400px] md:shrink-0`, bottom-aligned `md:items-end`) RIGHT; row 2: video FULL WIDTH directly below (aspect-video, object-contain, gap-8 reused). lg+ pixel-identical to before via reset classes (`lg:flex-col lg:items-stretch lg:gap-0`, `lg:text-[56px]` — the 56px token moved md:→lg:). Below md unchanged stack. One mounted <video>, same DOM order, CSS-only. Verified with headless-chrome screenshots at 500/768/900/1023/1440.
- Round 5 (DONE, uncommitted, tsc clean, 2026-07-09): per Pablo — (1) hero video NEVER cropped: always `aspect-video` + `object-contain` (stretch-to-column/object-cover removed), `self-center` in right column; (2) "BACKED BY" mono label removed from BackedByLogos (label prop dropped; i18n key `home.hero.backedBy` kept in messages, just unrendered); (3) marquee boxes shrunk 218x104 → 152x72 (px-4), 7 visible per 1152px row instead of 5, PartnerLogo sized via `calc(var(--logo-h)*0.72)` overrides (text factor 0.65); (4) video column widened `lg:w-[560px]` → `lg:w-[640px]` so the video outweighs the SkillCommand card (~41/59 split, H1 wraps fine at ~448px).
- Round 4 (DONE, uncommitted, tsc clean): BackedByLogos rewritten crossfade → DOUBLE BOX MARQUEE per Pablo: 2 lines of #ebe9e0 boxes (218x104), row 1 right-to-left, row 2 left-to-right (counter-scroll), all 29 logos split 15/14, duplicate-track seamless loop, 45px/s, hover pause, reduced-motion static, full-bleed no fade masks. Crossfade keyframes removed from globals.css.
- Round 3 hero restructure per Pablo (DONE, uncommitted, tsc clean): above-the-fold hero — LEFT: eyebrow + H1 (56px) + SkillCommand card underneath (~528px); RIGHT: video 560px stretching to match column height (object-cover). Full-width video panel removed. BackedByLogos generalized to `slots` prop, now 10 boxes (2 rows x 5, h-104px) cycling ALL 29 founding logos, collision-free walk documented (guard: 2*slots-1 <= N). Fold math: hero row bottom at ~523px on 900px viewport; whole logo grid ends ~818px. NOTE: preview deploy is now BEHIND local — redeploy `npx vercel --prod --yes` from frontend/ when Pablo approves.
- PREVIEW DEPLOYED for Ivan: https://internet-court-redesign.vercel.app (separate Vercel project `internet-court-redesign` on Pablo's personal scope `pdepablocom` — Pablo's login has NO access to the foundation's `internetcourt` Vercel project/staging alias, so this preview project is the workaround; deployed from `frontend/` working tree, so it includes ALL uncommitted work from every session). Figma capture script removed from layout.tsx before deploy. Hero video plays from Vercel Blob so it works on the preview.
- Round 2 from Pablo's frame (all DONE, uncommitted, tsc clean): Dispatches section rebuilt as CARD layout (HomeBlogFeatured15.tsx: #f4f3ee band, #fafafa featured card w/ date chip, 3 compact right cards, "All posts" #ebe9e0 pill; red rule + hairline divider removed). CTABand.tsx = dark rounded card (#0a0a0a, rounded-2xl, max-w-1152) on paper w/ mono eyebrow subline + SkillCommand inside. Footer.tsx = 4 flat columns (red wordmark h-5 + tagline / Blog FAQ Contact / GitHub Telegram / consortium line), top hairline removed; footer.consortium copy already matched Figma across locales.
- Figma handoff: homepage captured to Figma file "Internet Court — Web Redesign" (Pablo's AAA team, key `c2ixQzwB91aHa41ALnnBcb`, node 1:2) via generate_figma_design so Pablo can edit the design himself (font exploration etc.). TEMPORARY capture `<script src="https://mcp.figma.com/mcp/html-to-design/capture.js">` added to `[locale]/layout.tsx` body (marked with a TEMPORARY comment) — enables the in-browser re-capture toolbar; REMOVE BEFORE COMMITTING/DEPLOYING.
- Pablo's redesigned frame (node 3:79, "Desktop - 6" in same file) being implemented on the homepage: two-col hero (left: mono eyebrow "Internet Court · Consortium" + DM Sans SemiBold 64px title "An open skill for agent-to-agent contracts"; right: SkillCommand card 576px), full-width 1152px video panel below (radius 12, #0a0a0a), then "BACKED BY" row: 5 fixed containers (#ebe9e0, 128px, radius 12, gap 15) with logos CONSTANTLY CROSSFADE-SWAPPING through the full founding-partners list (staggered, no duplicates, prefers-reduced-motion safe) — replaces FoundingMarquee on homepage. Everything below stays untouched. NOTE: Pablo's Figma eyebrow uses an em dash; implemented as "·" per the no-em-dash hard rule, flagged to him. Status: DONE (uncommitted), tsc clean. Header also reworked to Pablo's chip navbar (HeaderNavChips.tsx new, MastheadLangToggle chip trigger, tic-logo-red.svg centered 32px, no hairlines). New BackedByLogos.tsx (5 slots, shared setInterval 600ms round-robin = 3s/slot staggered, collision-free mod-29 walk, reduced-motion static, document.hidden pause). HomeHero.tsx rewritten (two-col + full-width HeroVideoPlayer aspect-[1152/675]; HeroVideoPanel/dot-grid/glass card/HeroScrollCue dropped from homepage, files kept). Hero copy: en + all 4 locales seeded (subhead promoted to title so existing translations reused; backedBy added; ADOPT-rule safe). Awaiting Pablo's review.

### FAQ page (/faq) — content rework + restyle
- Removed Glossary/"Key terms" section entirely (deleted GlossarySection + GLOSSARY_TERMS + home.glossary msgs across 5 locales). No more "molt" copy there.
- Global copy rules: NO "API" anywhere (it is a skill, not an API); no em dashes; agnostic (no "built on GenLayer", no TRUE/FALSE/UNDETERMINED, no three-key jargon).
- Expanding FAQ from 3 to 16 curated Q&As (user selected from a candidate list). Order + verbatim copy finalized this session. Dispute Q keeps GenLayer/Kleros/UMA + "or whatever they want to use"; use-cases Q links the use-cases blog post; open Q adds MIT licensed; try-it Q adds Telegram.
- Restyle FaqSection to homepage design language; must scale gracefully to ~16 items.
- Status: dispatching implementer; then run dev server on localhost for user review. Not committed, not deployed.

### Homepage copy exploration — variants under /preview/home-copy + remove video
- User wants the homepage copy reviewed & explored. TWO parts:
  1. REMOVE the "See the court in motion" video section (`TheaterWatch`, `#watch`) from the LIVE homepage — redundant with the hero video panel above the fold.
  2. Build 5-10 full-homepage COPY variants behind an index at `/preview/home-copy` (noindex, inline English, following the `/preview/*` convention). Same layout, NO video section; differentiate the COPY.
- Copy must be grounded in the two Dispatch articles: `internet-court-agentic-commerce.mdx` (main) + `internet-court-use-cases.mdx`.
- Per-section guidance from user: hero stays (subhead may flex); intro paragraph may flex / optionally gain a title; Stack "one court, every layer" is good (minor discovery→disputes tweak OK); Goal "Scaffolding for agentic commerce" title+text DISLIKED → rewrite; partners/logos are perfect → leave alone.
- Approach: copywriter drafts distinct positioning + full copy deck per variant → builder implements index + prop-driven variant pages reusing live components.
- Status: User REJECTED all 8 preview variants. Pivoted to direct edits on the LIVE homepage. Video removal on `page.tsx` KEPT. Reverted `HomeHero.tsx` to HEAD (hero card must stay untouched). Deleted all 8 preview variants + `src/data/home-copy-variants.ts` + `src/components/preview/`. Direction from user: keep hero subhead "An open skill for agent-to-agent contracts"; DROP "the trust layer for agent-to-agent commerce" phrasing; intro must say the ecosystem is FRAGMENTED and Internet Court brings it together, works not just happy path but dispute path; positioning = payment rails become a REAL ECONOMY via dispute resolution + accountability (low-level infra).
- DONE (uncommitted): `messages/en.json` `home.intro.p2` rewritten (kept p1) to fragmentation + happy/dispute path; `home.cta.title` → "Payment rails move money. Internet Court makes them an economy." tsc + build clean. Other locales (es/ko/zh/ru) still hold old translations of those 2 keys → will re-translate on next build via source-hash pipeline.
- Goal section DONE (uncommitted): replaced "Scaffolding for agentic commerce" → title "From payment rails to <accent>a real economy</accent>." + 3 new paragraphs (building blocks/rails aren't an economy; economy needs accountability + adjudication agreed up front, part of the contract; AI jury rules on dispute). Removed layer enumeration (stack section already lists them); explicitly uses word "adjudication". Kept "payment rails" in title for consistency with cta.title; user can flip to "building blocks" if desired.
- Homepage copy edits all live in `messages/en.json` only (en). Other locales re-translate on next build. No builds run per user (server running elsewhere). NEXT: user review on their running server; possible title flip; then commit when user asks.

### Header redesign — 10 variants under /header-previews
- User dislikes the current header's BLOG/FAQ nav pills + the i18n language dropdown. Wants 10 distinct header designs to compare under a sub-URL.
- Pattern: mirror /hero-previews. Index at `app/[locale]/header-previews/page.tsx`; variant components in `components/site/headers/`; each routed sub-page renders the bar over a faux-homepage backdrop + BackToIndex. Noindex, inline English (no i18n).
- 10 variants (each re-thinks nav + language): bare, quiet-links, single-cta, command-bar, menu, masthead, docs-bar, dot-nav, floating-pill, two-tier.
- Status: SHIPPED INTO HEADER (uncommitted). User picked `masthead`. Rewrote `components/layout/Header.tsx` to the centered masthead (mono Blog/FAQ nav left w/ underline, centered wordmark, socials right, top hairline + doubled bottom rule, mobile reflow), productionized with real i18n/routing. Boxed globe dropdown replaced by new subtle `components/layout/MastheadLangToggle.tsx` (corner EN ⌄, 5 locales); deleted now-unused `LocaleSwitcher.tsx`. tsc clean.
- CLEANUP DONE: deleted `/header-previews` gallery (`app/[locale]/header-previews/` + `components/site/headers/`, 10 variants + scaffold). `/hero-previews` gallery was already removed by a prior session; remaining `components/site/heroes/` is LIVE homepage code (HeroScrollCue/HeroVideoPanel/HeroVideoPlayer via HomeHero) — NOT a gallery, left intact. Only stale `.next/dev/types` stubs for old hero-previews routes remain (clear on dev type regen / rm -rf .next).

### Homepage curated blog section — explicit ordered slug list
- Add a "selected writing" blog section to the homepage. Curated, NOT date-sorted/random — author hand-picks which posts show and in what order.
- Curation: `HOMEPAGE_POSTS` ordered slug array + `getPostsBySlugs()` helper in `frontend/src/lib/blog.ts` (preserves array order).
- 3 design variants behind `/preview/home-blog/*` for the user to compare and pick (following the `/preview/blog` convention from the marketing-site task). Variants: (1) Editorial Index (numbered law-review list), (2) Card Grid, (3) Featured Split (one lead + secondaries).
- Status: SHIPPED INTO HOMEPAGE (uncommitted). User picked variant `featured-15` ("Comfortable" briefing layout, heading "Briefings from the court", narrow max-w-5xl, links to /blog). Wired `<HomeBlogFeatured15 posts={getHomepagePosts(locale)} />` into `src/app/[locale]/page.tsx` between `<TheaterWatch/>` and `#goal` (added `params`/`locale` to the `Home` component). Data layer = `HOMEPAGE_POSTS` + `getHomepagePosts()` in `lib/blog.ts` (other session added locale support). Also added 3 new blog posts (how-the-ai-jury-works, escrow-and-skin-in-the-game, a-neutral-venue-for-agents) in `src/content/blog/en/`.
- CLEANUP PENDING: preview-only artifacts still in tree — `src/app/[locale]/preview/home-flow/` (index page + featured-2,5,6..18) , unused `src/components/site/HomeBlogFeatured{2,5,6..18}.tsx`, and `src/app/[locale]/preview/_components/FullFlowPreview.tsx`. Delete once user confirms (noindex but currently ship).
- NOTE: heavy cross-session contention during this work — a parallel Claude session repeatedly ran `pkill next dev` + `npm run build` in the same `frontend/`, corrupting Turbopack cache and killing dev servers.

### caniagent — interactive readiness heatmap (Can I Use × Internet Court)
- "Can I Agent?" — interactive heatmap of the 6-layer agentic-commerce stack (from the homepage Stack animation). Each layer + each standard + each integration *between* layers colored green→red on a 5-step readiness scale; hover any cell to read why.
- Two parallel threads, one shared data contract: **Thread A (build)** = 5 interactive page variants + index under `frontend/src/app/[locale]/caniagent/`; **Thread B (research, separate session)** = grade every entry and write `frontend/src/data/caniagent/readiness.json`.
- ROUND 1 (grid/stack/graph/matrix/roadmap) reviewed: grid/graph/matrix DROPPED; stack idea liked but design broken; roadmap liked. ROUND 2 = 5 fresh Stack×Roadmap variants from scratch — NO left-side connection arcs/spines (user disliked them), static-first/robust (round-1 broke on DOM-measured SVG geometry).
- ROUND 2 variants (live, noindex): Strata `/caniagent/strata` (bands + per-band maturity axis, integrations in colored seams + right markers), Ledger `/caniagent/ledger` (caniuse table: %-bars + standard chips + inline integration squares), Thermal `/caniagent/thermal` (heat tiles + standard sub-cells + inline connector tabs), Flow `/caniagent/flow` (vertical pipeline, centered colored connector pipes + right tabs + chip maturity meters), Lanes `/caniagent/lanes` (refined roadmap: maturity-column lanes, readiness block on RIGHT, connections via highlight + bottom strip). Hub `/caniagent` updated. Old round-1 files deleted. `rm -rf .next` + tsc + `npm run build` clean; all prerender across 5 locales.
- Full brief + data schema + research-agent prompt: `caniagent-plan.md` (repo root).
- Status: THREAD A BUILT + THREAD B DONE (uncommitted). Plan in `caniagent-plan.md`. Data layer (`frontend/src/data/caniagent/`: taxonomy.ts 28 entries, readiness.sample.json, load.ts) + shared components (`components/caniagent/`: scale.ts, Legend, ReasonCard) + all 5 variants + index hub under `app/[locale]/caniagent/{,grid,stack,graph,matrix,roadmap}`. `npm run build` + tsc clean; all routes prerender across 5 locales; all noindex previews.
- THREAD B (research) DONE 2026-06-20: real `frontend/src/data/caniagent/readiness.json` written — all 28 entries graded green→red w/ 2-para reasons + real sources (fanned out 8 research sub-agents, live web research). Validated: ids unique & complete, score/status agree, summaries ≤140, reasons 2-para, 1–4 sources each. `load.ts` import un-commented so pages now use real data (sample = fallback). Score spread: 2×5(prod), 8×4(avail), 12×3(emerging), 6×2(experimental). Highlights: x402=5 & Execution/MCP=5 (top); Verification layer & GenLayer=2 (honest, no boosterism — GenLayer pre-mainnet/testnet); seed names corrected — ERC-8183="Agentic Commerce" (not Obligations), MPP=Stripe/Tempo Machine Payments Protocol, APP=Google AP2, A2A=interop (not negotiation), OpenClaw/Hermes confirmed real runtimes. Weakest edge: conn-01-06 reputation loop=2 (ERC-8004 omits dispute→reputation path). Reasons are English-only (translate later via build pipeline).
- THREAD B ROUND 2 (deep adoption research) DONE 2026-06-20: per user ask, re-researched EVERY entry for REAL adoption numbers + exhaustive partners (8 more sub-agents, incl. a dedicated x402 deep-dive). Schema extended (`taxonomy.ts`): added optional `metrics[]` ({label,value,asOf,confidence}) + `partners[]` ({name,role,where}) to ReadinessEntry. `readiness.json` now version 2 with **247 partners + 126 metrics** across 28 entries. Skeptical recalibrations from hard numbers: x402 5→4 ("production but incipient": ~119-165M raw tx but only ~$50M settled/~$28k/day, ~50% wash per Artemis, only ~10-15 real paid endpoints, "480k agents" are farmed wallets); Payment layer 4→3 + MPP 4→3 (100+ is a directory listing, $0 disclosed volume) + AP2/APP 3→2 (authorization layer, moves no money, all 60+ "collaborating"); UMA 4→3 (human token-voting governance attacks, ~0 agent use); Hermes 3→4 (genuinely #1 on OpenRouter by tokens); conn-04-05 Payment→Execution 4→5 (ships in prod across Vercel/Cloudflare/Zuplo); conn-02-03 3→2 (no shipping AP2→ERC-7710 bridge); conn-01-02 & conn-03-04 3→4. New spread: 2×5, 8×4, 11×3, 7×2. tsc clean. NOTE for Thread A: `metrics`/`partners` are NOT yet rendered by ReasonCard — surface them in the card to show the deep research in-product.
- ROUND 2 VERIFIED 2026-06-20 (Playwright desktop+mobile, all 6 pages): Strata/Ledger/Thermal/Flow PASS; Lanes was BROKEN (GSAP `gsap.from`+`once` scrollTrigger stranded lanes 3-6 hidden) → FIXED (fail-safe `fromTo` start:"top bottom" + ScrollTrigger.refresh on load/fonts + 1200ms hard fallback `gsap.set autoAlpha:1 clearProps`). Flow mobile nit (right tabs overlapped titles) → FIXED (tabs `hidden sm:flex`, wrapped row below card on mobile). Polish ranking: Ledger > Strata > Thermal > Flow > Lanes. Ledger/mobile uses horizontal-scroll table (acceptable).
- ReasonCard ENHANCED 2026-06-20: now renders Thread-B round-2 `metrics[]` ("By the numbers": value prominent + label + asOf + subtle `est.` for low confidence) and `partners[]` (chips, capped at 12 + "+N more", role/where via title) in full mode only (compact unchanged). Surfaces the deep adoption research in all 5 variants. tsc clean.
- Next: (1) user picks a variant → promote to public `/caniagent`, drop noindex, wire i18n messages (currently inline English); (2) reasons English-only — translate via existing build-time pipeline when going public; (3) nothing committed yet — awaiting user's pick before committing.

### Multilingual site — build-time LLM translation (en + es/ko/zh/ru)
- Make `frontend/` multilingual via `next-intl`; default `en` at `/`, others at `/es /ko /zh /ru` (localePrefix "as-needed")
- Build step (`scripts/translate.mjs`) translates EVERYTHING with Claude, incremental + cached by source-hash, results committed; wired into prebuild, falls back to committed files w/o API key
- Glossary protects: Internet Court, molt(s), GenLayer, ERC-xxxx, skill.md, verdict labels, ICU placeholders
- Phases: (1) next-intl foundation + [locale] migration, (2) extract all copy → messages/en.json, (3) translate build step + glossary + cache, (4) blog MDX per-locale, (5) language switcher + SEO (hreflang/metadata/sitemap), (6) verify build/tsc/lint + visual all 5 locales
- Status: DONE (uncommitted). next-intl 4.13.0; en at `/`, es/ko/zh/ru prefixed (localePrefix as-needed). 320 message keys/locale, full parity. `scripts/translate.mjs` (JSON) + `scripts/translate-blog.mjs` (MDX) cached by source-hash, wired into prebuild, keyless fallback to committed files; `@anthropic-ai/sdk` dep, model TRANSLATE_MODEL default claude-haiku-4-5. Blog UI + 3 posts × 4 langs in content/blog/<locale>/ with en fallback. LocaleSwitcher in Header (native labels). SEO: hreflang+x-default on all pages, sitemap (30 urls), robots. Runtime-verified all 5 locales 200 + correct <html lang>. Fixed latent brand-page 500 ({name}→<accent>-style tag placeholders across all locale files). Build/tsc clean; lint only pre-existing StackTable/img issues.
- Post-ship fixes: (a) dev-mode "Missing <html>/<body> in root layout" → deleted pass-through `src/app/layout.tsx`; `[locale]/layout.tsx` is the root layout (owns html/body) per next-intl i18n-routing pattern. (b) middleware never ran because with a `src/` dir it must live at `src/middleware.ts`, not repo-root `middleware.ts` → moved it (unprefixed `/` and `/blog` would 404 on cold hits without it). Both verified green in dev AND prod.
- Gotchas for next time: prebuild rewrites every messages/*.json, so NEVER run two builds concurrently (file-race clobbers translations); messages/ is untracked-new (NOT gitignored) so it WILL commit fine; next-intl rich text needs `<tag></tag>` syntax, not `{name}`, when passing element callbacks; with a `src/` dir middleware MUST be `src/middleware.ts`; verify dev mode too (Turbopack dev enforces root-layout tags that prod build tolerates).
- Follow-ups: homepage `/[locale]` renders dynamic (ƒ) — confirm intentional; preview/hero-previews/caniagent routes ship in prod — decide if they should; caniagent variants currently inline English (not yet wired to i18n messages).

### Marquee logo polish — full-color, matched speed, grid height
- Logos in both marquees render at 100% (full color, full opacity, NO blur/grayscale)
- Both marquees (FoundingMarquee + PartnerMarquee) scroll at the same speed
- Logo height matches the PartnerGrid logo height — do NOT fill 100% of marquee height
- Files: FoundingMarquee.tsx, PartnerMarquee.tsx, site-content.ts (PartnerGrid = height reference only)
- Status: DONE (uncommitted). Removed grayscale/brightness/opacity-dim/hover-reveal from marquee logos. Equal speed via shared SPEED_PX_PER_SECOND=45 (duration computed from measured content width, replacing fixed 48s/40s). Marquee logos sized to grid units (gridHeight×1.2 mobile / ×1.5 desktop) via GRID_HEIGHT_BY_NAME. Build + tsc clean.

### Brand Guidelines page — professional brand book
- Build a polished, interactive brand guidelines page at `/brand` in the frontend Next app
- Sections: cover/positioning, logo (wordmark + icon, clear space, misuse), color system (red #DC2626 + neutrals + semantic, light/dark), typography (DM Sans/Mono/Serif Display + scale), voice & tone + taglines, iconography/favicon, founding-members lockup, imagery/OG, motion, applications, asset index
- Reuse real design tokens from globals.css and the actual `/logos/tic-logo-red.svg`
- Source of truth for voice: `docs/COPY_AND_VOICE.md`
- Built at `frontend/src/app/brand/page.tsx` + `frontend/src/components/brand/{CopyChip,Swatch}.tsx`. Build/lint/typecheck clean, visually verified (Stripe/Linear tier).
- Status: DONE — uncommitted in working tree. Follow-ups for a designer: reversed all-white wordmark for red/photo bgs, standalone monochrome icon export.

### Marketing site: Blog + Launch Video + Telegram link
- Full brief: `plan.md`. Branch `feat/marketing-one-pager`.
- Telegram footer link (`TELEGRAM_URL` placeholder), Blog footer link
- MDX blog engine (`/blog`, `[slug]`, 3 seed posts) + 3 index designs behind `/preview/blog`
- Launch video "Watch" homepage section (click-to-play with sound) + 3 variants behind `/preview/watch`
- Video copied locally + gitignored; prod hosting is a follow-up
- Status: SHIPPED to staging — commit `fa085f1` on `feat/marketing-one-pager`. Theater watch + Academic blog index wired live; header nav with Blog pill + Telegram/X/GitHub icon links; footer Blog+Telegram. TELEGRAM_URL=t.me/internet_court, X_URL=x.com/courtofinternet, GitHub=github.com/internet-court. Unused variants + /preview/* deleted.
- Open follow-ups: prod video hosting (mp4 gitignored → upload to Vercel Blob + swap src in TheaterWatch.tsx & launch-video.mdx, else 404 on staging/prod); real press-release copy (press-release.mdx is a public DRAFT).

### New minimal marketing website from one-pager
- Replace app-style site with a static marketing site based on the Internet Court one-pager
- Source: `/Users/rasca/Dev/genlayer/Internet Court one pager/Internet Court One Pager with Logos.pdf`
- Single-page site: video hero + skill.md "coming soon" terminal box, scrolling founding-members marquee, prominent stack table, § 01-03 one-pager copy, closing band with ivan@genlayer.foundation
- Status: Done. Final site lives in a NEW repo with clean history: https://github.com/internet-court/webpage (private, single commit `bab8435`, Next.js app at repo root, local copy at `/Users/rasca/Dev/internet-court-webpage`). The old-repo branch `feat/marketing-one-pager` (commits `00d424c`, `a841a79`) is also pushed to genlayer-foundation/internetcourt as a record. Open question: footer GitHub URL still points to github.com/internetcourt.

### Fix Verdict Semantics — PARTY_A / PARTY_B instead of TRUE / FALSE
- Replace TRUE/FALSE verdict labels with PARTY_A/PARTY_B across contracts, frontend, MCP, docs
- No Solidity redeploy needed — same uint8 values (0, 1, 2), just relabeled
- Files: case_resolution.py, InternetCourt.py, test_internetcourt.py, constants.ts, types.ts, page.tsx, docket/route.ts, tools.ts, skill.md
- Also fixed: MCP ABI mismatch (proposeOutcome was uint8, now bool to match Solidity), docs/page.tsx verdicts, test_smoke.py, test_studio_deploy.py
- Frontend build: PASS (zero errors), grep for stale TRUE/FALSE: PASS (all clean)
- Status: DONE — ready to commit

### Frontend Performance — Remove Aggressive Caching + Optimize Data Fetching
- Reduce localStorage TTL from 10min → 2min
- Add Cache-Control: no-store to API responses
- Remove/reduce 2-min in-memory server cache
- Parallelize Base + GenLayer fetches (currently sequential)
- Batch sequential RPC calls with Promise.all()
- Add timeouts to GenLayer RPC calls
- Add refresh button to cases page
- Include verdict in list API to eliminate N+1 fetches
- Status: In progress

### Fix Bridge Structural Issues + Clean Redeploy
- Phase 1: Code fixes (centralize addresses in deployments.json, delete stale files, add relay persistence)
- Phase 2: Clean deploy (BridgeSender → Factory → Receiver → Forwarder → Configure → E2E)
- Phase 3: Lock down (commit final addresses, update Vercel, verify frontend)
- Status: Phase 1 in progress

### Implement factory improvements — pagination, find by party, migration/export/import
- Add pagination to factory queries (offset/limit pattern)
- Add find-by-party-address lookup
- Add migration/export/import methods for factory data
- Full spec: `docs/FACTORY_IMPROVEMENTS.md`

### Implement min_dispute_period_seconds — timing parameter
- Add minimum dispute period enforcement from timing research
- See `docs/TIMING_RESEARCH.md` for patterns (Kleros, UMA, Aragon, Optimism)

## Backlog

### Create page — inline contract code as string constant
- Currently reads contract code from disk, breaks on Vercel
- Inline the contract code as a string constant for Vercel compatibility

### Set up Vercel environment variables via dashboard
- NEXT_PUBLIC_COURT_FACTORY_ADDRESS
- NEXT_PUBLIC_GENLAYER_RPC
- Currently bypassed — factory address hardcoded in source. NEXT_PUBLIC_COURT_FACTORY_ADDRESS still points to old factory in Vercel dashboard.

## Done

### Fix skill.md — rewrite from CLI-first to SDK-first
- Rewrote skill.md to use genlayer-js SDK as primary method
- Removed all CLI-first instructions (genlayer CLI v0.4.0 doesn't support deploy/write/call)
- Added full Quick Start with SDK examples, factory registration, lifecycle walkthrough
- Factory address: `0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE` (correct for current deployment)

### Fresh Deploy — Both Chains from Scratch
- GenLayer factory: `0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE` (studionet)
- Base factory: `0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E` (Base Sepolia)
- MockUSDC: `0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3`
- DeploymentBlock: `37666090`
- Updated 26+ files, created deploy-factory.mjs
- Swarm review fixed: LayerZero EIDs, enum label bug, stale addresses, doc refs
- Frontend build verified, both factories verified (count=0, types registered)
- Commit: `b9659a0` on `feat/bridge-deploy`

### Fresh Deploy + Comprehensive E2E Test (11 Lifecycle Cases)
- Deployed fresh MockUSDC + InternetCourtFactory to Base Sepolia
- Factory: `0x72b7544EeA6c81b434b3DD255f3EE29cC6Ca5231`, USDC: `0x852E780CBAB7fa5f88B24e51D2e6D32959DD15dF`
- Updated addresses in 8 files (scripts, frontend, bridge, MCP)
- Created comprehensive E2E script testing all 11 Agreement lifecycle paths
- All 11 cases passed: cancel, deadline expiry, mutual TRUE/FALSE, confirm, bridge TRUE/FALSE/UNDETERMINED, default judgment (none/initiator/non-initiator)
- Each case uses descriptive name as on-chain statement, visible on Basescan
- Results: `contracts/solidity/E2E_TEST_RESULTS.md`

### GenLayer Cross-Chain Registry + Factory Redeploy
- Added `deploymentBlock` immutable field to InternetCourtFactory.sol
- Deployed new factory to Base Sepolia: `0xb981298fb5E1D27ade6f88014C2f24c30137BC9a`
- Updated all hardcoded factory addresses across codebase (7 files)
- Extended relay service to register Base cases on GenLayer registry via AgreementCreated events
- Updated frontend ABI and docket route to use `deploymentBlock` (eliminates 50k block lookback)
- Updated cases list API with chain routing (Base vs GenLayer-native cases)
- Added chain badges (Base blue, GenLayer purple) to cases list page with live status fetch
- E2E verified: test case created, docket works instantly, case detail loads

### Docket / Case Timeline feature
- Full event timeline for case detail page showing all on-chain events
- Docket API: `/api/cases/[id]/docket` with chunked getLogs (10k block limit), contract state enrichment
- Deep link tabs: `?tab=docket` URL parameter support
- Source labels: Base (blue), GenLayer (purple), LayerZero (amber) color-coded badges
- Court record UI: serif headers, numbered timeline circles, staggered fade-in animations
- Rich data: inline evidence blocks, LayerZero Scan + Basescan links, verdict reasoning, escrow amounts
- 10-event lifecycle: Created → Accepted → Disputed → Evidence (A/B) → Resolution → Bridge → Verdict → Received → Claimed
- Fixed event signature mismatches (indexed vs non-indexed params in ABI items)
- Optimized block range queries (find creation block first, then narrow search)

### USDC Escrow Refactor + API + MCP
- ETH → USDC (ERC-20) escrow, one-sided deposit (creator only)
- Join deadline with auto-expiry (`reclaimOnExpiry`)
- Default judgment (`resolveByDefault` — no evidence = disputer wins)
- Evidence validation (max length, constraints)
- Next.js API routes (6 endpoints: list, detail, evidence, prepare-create/join/submit)
- MCP server (get_case, list_cases, check_deadline tools)
- 166 tests passing
- Design: `docs/plans/2026-02-13-usdc-escrow-api-mcp-design.md`
- Plan: `docs/plans/2026-02-13-usdc-escrow-api-mcp-plan.md`

### Homepage timeline redesign — merged steps, evidence examples, verdict pills
- Merged Jury Resolution + Verdict into single timeline step
- Added evidence examples per case type
- Animated consensus removed in favor of clean text + verdict pills

### GSAP ScrollTrigger animations
- Timeline draw on scroll
- Parallax orb effect
- Staggered reveals

### Latest Cases section — real contract data
- Replaces CTA section on homepage
- Fetches real contracts from GenLayer API via genlayer-js SDK

### Logo/header fix — unoptimized prop
- Added `unoptimized` prop to Next.js Image component

### Visual fixes — Guidelines box, pills, RotatingText
- Guidelines box height (min-h-[11em])
- "if disputed" pill opacity fix
- RotatingText text-left alignment

### HeroToggle redesign — argue.fun style
- Toggle button with numbered steps
- min-width for consistent sizing
- Removed skill.md pill

### Cases page — fetch timeout
- Added 15s client timeout, 10s RPC timeout to prevent infinite loading

### Create page — wired up with real deployment
- Full deployment via genlayer-js SDK
- Factory registration
- Evidence deadline field added

### API fix — replaced broken RPC with genlayer-js SDK
- Replaced broken `call_contract_function` RPC with genlayer-js SDK
- Fixed factory method names

### skill.md 404 fix
- Removed conflicting route.ts
- Now served from public/

### resolve() — prompt_non_comparative for multi-LLM support
- Switched from strict_eq to prompt_non_comparative
- Works across 5 different LLMs on studionet (GPT-5.1, Gemini 3, Grok 4, Claude Sonnet 4.5, DeepSeek V3.2)

### str→Address conversion fix for studionet
- JS SDK sends Address args as hex strings, not bytes
- Contract __init__ now handles both bytes and str conversion

### Contract headers added
- `# v0.1.0` and `# { "Depends": "py-genlayer:latest" }` headers
- Fixes `absent_runner_comment` error on studionet

### 282+ total tests — full method coverage
- 194 original unit tests + 90 direct tests in `contracts/tests/direct/`
- All tests passing

### Studionet deployment — factory + full lifecycle
- Factory deployed: `0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738` (old: `0xAA55c2768855A483b5D8C8926585Cdb940207898`)
- Full lifecycle tested — unanimous AI jury verdict (TRUE) in ~2 minutes with 5 LLMs
- Integration test scripts: deploy-and-test.mjs, test-prime-dispute.mjs

### Research argue.fun bridge implementation
- Deep dive into https://github.com/arguedotfun/arguedotfun/tree/main/bridge
- Document architecture, contracts, message flow for Internet Court adaptation
- Full research doc: `docs/ARGUE_BRIDGE_RESEARCH.md` (1,630 lines)

### Direct test suite added — 90 additional tests
- Tests in `contracts/tests/direct/`

### Integration test scripts
- `create-production-case.mjs`, `create-4th-case.mjs`

### Factory address updated
- New factory `0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738` (old had no types registered)

### Connect Vercel to GitHub for auto-deploy
- GitHub Actions auto-deploy set up (commit 851b63c)

### skill.md — complete rewrite
- CLI-first approach with genlayer CLI as primary method
- Wallet setup, no-gas clarification
- Agent quick-start / onboarding flow

### genlayer.md — comprehensive GenLayer skill file
- 1,150-line reference with all learnings from development

### docs/TIMING_RESEARCH.md — dispute timing patterns
- Research on Kleros, UMA, Aragon, Optimism timing models

### docs/FACTORY_IMPROVEMENTS.md — factory enhancement spec
- Pagination, find by party, migration/import, export methods

### Testing policy added to CLAUDE.md
- Every public method must have tests (happy path, error cases, edge cases)

### GitHub Actions CI fixed
- Node 22, lint fixes
- Pipeline green

### Vercel deployment working
- Manual deployment via CLI
- Auto-deploy via GitHub Actions (see "Connect Vercel to GitHub" entry)

### Repo moved to genlayer-foundation/internetcourt
- New home under the GenLayer Foundation org

### Logo iteration — V4 Molt lobster + scales concept
- v7-favicon-4 selected as final
- Set as favicon + header logo

### Homepage — toggle button instead of two cards
- argue.fun style toggle with min-width
- Numbered steps
- Agent mode / Human mode switch

### Homepage redesign (argue.fun style) — v0.1
- Two-path hero with "I'm an agent" (curl) / "I'm a human" (cases)
- Blue accent (#3b82f6), animations, copy button
- Files: `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`

### Logo generation — round 1
- Generated 4 concepts: courthouse-geometric, scales-digital, mc-monogram, gavel-particles
- Files: `frontend/public/logos/*.png`

### Logo generation — round 2
- Generated 3 futuristic concepts: scales-neural, scales-evolution, m-constellation
- V3 (m-constellation) selected as best direction
- Files: `frontend/public/logos/v2-*.jpg`

### Logo generation — round 3 (with GenLayer branding)
- Found GenLayer visual identity: angular geometric chevron icon, primary accent #4500F9 (electric indigo)
- Generated 6 variations: wireframe-scales, holographic-crystal, constellation-refined, neural-scales, light-beams, circuit-constellation
- Top picks: wireframe-scales (#1) and holographic-crystal (#2)
- Files: `frontend/public/logos/v3-*.jpg`, `frontend/public/logos/genlayer-reference/`

### "I'm a human" homepage update (argue.fun style)
- Updated subtitle, description, CTA to spectator framing
- "The one watching the courtroom" / "Your agents argue. You watch." / "Watch Cases"
- No subdomain — in-app route to /cases

### InternetCourtFactory — GenLayer factory/registry contract
- Contract: `contracts/InternetCourtFactory.py`
- Tests: `contracts/tests/test_factory.py` — 35 tests, all passing (0.26s)
- Type-gated registry: owner registers types, anyone can register deployed contracts
- Stores: ID, address, type, deployer, params/metadata (JSON)
- Query by ID, type, or deployer
- No hardcoded contracts — generic registry pattern

### Frontend — commit v0.1 homepage redesign
- Committed: `page.tsx`, `globals.css`, `frontend/public/logos/`
- Two-path hero, blue accent, animations

### Press release — final copy from Google Doc
- Replaced draft placeholder in `frontend/src/content/blog/en/press-release.mdx` with the approved copy (verbatim from the Google Doc, July 2, 2026 dateline)
- Frontmatter: title from doc headline, date 2026-07-02, tag "Press Release"
- Blog styling applied (bold partner/protocol names, ### About GenLayer heading); translations left to the i18n pipeline
- Not committed, not deployed
