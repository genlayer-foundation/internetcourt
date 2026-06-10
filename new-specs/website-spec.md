# Internet Court — Website Spec (v2)

> A working specification for the rebuilt internetcourt.org. Lives as a single Markdown document so it can be iterated on, edited, commented on, or pasted into any tool. Every section that used to be a separate file is now a top-level section here.

**Version:** v0.1 · **Last revised:** 2026-05-04

---

## Table of contents

- [1. Overview](#1-overview)
- [2. Information architecture](#2-information-architecture)
- [3. Design system](#3-design-system)
- [4. Components](#4-components)
- [5. Content style](#5-content-style)
- [6. Pages](#6-pages)
  - [6.1 Home `/`](#61-home-)
  - [6.2 Standard `/standard`](#62-standard-standard)
  - [6.3 Seal `/seal`](#63-seal-seal)
  - [6.4 Adjudicators `/adjudicators`](#64-adjudicators-adjudicators)
  - [6.5 Docs `/docs`](#65-docs-docs)
  - [6.6 About `/about`](#66-about-about)
- [7. Shared](#7-shared)
  - [7.1 Header](#71-header)
  - [7.2 Footer](#72-footer)
  - [7.3 SEO & OG cards](#73-seo--og-cards)
- [8. Appendices](#8-appendices)
  - [8.1 Version log](#81-version-log)
  - [8.2 Open questions](#82-open-questions)

---

## How to read this

The current live site at internetcourt.org was a fast first pass. It still ships great visual language — the `#0a0913` / `#DC2626` / DM Sans palette, the rounded `#f7f7f7` panels, the terminal command box, the case-lifecycle row — and we keep all of that. The content underneath has moved on. The two-pillar narrative (the **Standard** + the **Seal**), the L6 keystone framing, the Adjudicator rename, and the partner-earns-the-seal model all need first-class room on the site. This document is the bridge.

Sections are numbered. The original cross-file references (e.g. *"see [§6.3 Seal](#63-seal-seal)"*) have been rewritten as anchors inside this document. Any reference of the form `/standard#bundle-pattern` is a *site* route — it points to a place on the rebuilt website, not a section of this document.

When something is **locked**, the spec says so. When something is **open**, the spec says so and points to [§8.2 Open questions](#82-open-questions).

### Source-of-truth dependencies

Everything in this spec is downstream of these working docs in the project root:

- `Internet Court — Strategy & Narrative v4.md` — the live editing copy of the narrative.
- `IC_Layer_Atlas_v0.1.md` — the layer-by-layer atlas (partners, integration angles).
- `HANDOFF_court_of_internet_slide.md` — design rationale for the keystone slide and visual language.

If those move, this spec moves with them.

---

## 1. Overview

### Why we're rebuilding

The narrative has moved. The current live site at internetcourt.org leads with *"Dispute resolution for the agent economy"* and a single-page lifecycle walkthrough. That copy is superseded. The two pillars we now lead with — **the Standard** (the open spec for adjudication) and **the Seal** (*"Protected by Internet Court"*) — both deserve first-class space on the site. The 7-layer agent transaction stack with Internet Court at L6 is the spine. Partners earn the seal rather than co-author the spec. The rename to **Adjudicator** has to be visible everywhere copy used to say "Evaluator" or "AI jury."

The live site's visual language stays. The information architecture and the words on it change.

### Goals for v2

The site has to do four things, in order of priority.

1. **Make the missing-layer claim land in 5 seconds.** A protocol or infra builder hitting the homepage should leave with one sentence in their head: *Internet Court is the L6 keystone in the agent transaction stack — without it, the rest of the stack does not work.*
2. **Make the seal legible to non-developers.** A founder, an end user, an integrator scrolling past the architecture should see a recognizable trust mark and understand that *"Protected by Internet Court"* is for agent commerce what FDIC is for banking and HTTPS is for the web.
3. **Give partners and Adjudicators a concrete on-ramp.** Anyone reading the site who runs an Adjudicator (Kleros, UMA, Pledo, Saluma, GenLayer) or a contract-side standard (ERC-8004, A2A, Arkhai, ERC-8183, x402, MPP) should leave knowing how they fit into the spec and what "earning the seal" means for them.
4. **Open the developer surface.** A `/docs` page that's real enough on day one to convince a builder this is a working spec, not a manifesto. Quickstart, factory API sketch, contract-side and Adjudicator-side interfaces, schemas, and a link to GitHub.

### What stays from the live site

- Visual language: dark accents on a light canvas, IC red `#DC2626` reserved for IC territory, `#f7f7f7` panel surfaces, DM Sans / DM Serif Display italic / DM Mono type stack, lavender accents.
- Header: rounded-pill nav on `#f7f7f7`, IC red wordmark left, monospace nav links, max-width container.
- Hero pattern: oversized heading (DM Serif Display feel), subtle background motion, two-button audience-aware CTA pair below.
- Terminal command box (dark `#1a1817` panel, IC-red `$`, copy icon).
- The numbered red-square step pattern.
- The "case lifecycle" row pattern: title + icon left, animated example pill on the right, "If disputed…" callout in IC-red bordered card.
- Footer pattern: light-bordered, three-section, low chrome.

### What changes

- **Tagline.** *"Dispute resolution for the agent economy"* → *"The neutral venue for agent disputes."*
- **Lead frame.** Single-page lifecycle walkthrough → multi-page architecture (Standard / Seal / Adjudicators / Docs / About) with the homepage doing the "missing layer" land.
- **Vocabulary.** Evaluator → Adjudicator. AI jury → Adjudicator (or, when emphasizing the on-chain AI tier specifically, *AI validator network* / *GenLayer-tier Adjudicator*). "AI court" → never.
- **GenLayer attribution.** "Powered by GenLayer" footer line goes away. GenLayer appears as one logo among Accredited Adjudicators on equal footing.
- **Two-pillar split.** The site is no longer one story. It's two stories that reinforce each other (architecture + seal). The home has to introduce both; the dedicated pages own the depth.
- **Partner stack.** Logos organized by layer (L1–L7) as we accumulate them — the partner wall is itself a visualization of the stack.
- **App-side pages.** The current `/cases`, `/create`, `/join` routes are the live app. They keep existing but are not in scope for this marketing-site spec. We link out to them; we don't rewrite them here.

### Audiences (in priority order on the homepage)

| Priority | Audience | What they're looking for | What we show first |
|---|---|---|---|
| 1 | Protocol / infra builders | Where this fits in the stack and whether the architecture holds up | The 7-layer diagram, L6 keystone, how the standard works |
| 2 | Adjudicator partners (Kleros, UMA, Pledo, Saluma, ADR providers) | What "Accredited Adjudicator" means and how to earn the seal | The seal + Adjudicator types page, with explicit accreditation criteria |
| 3 | App / contract builders, agent ecosystems | A trust signal they can display, and a factory they can deploy through | The seal page, the seal embed spec, the contract-side interface in docs |
| 4 | End users, founders, press | One-sentence understanding + one recognizable visual mark | Hero + seal preview |

### Non-goals

- This site does **not** become a product app. The live `/cases`, `/create`, `/join` flows are separate. Marketing site links to them; doesn't replicate them.
- This site does **not** carry GenLayer brand. Discreet equal-footing logo only.
- This site does **not** try to teach the entire L6 spec on the homepage. The homepage gestures; `/standard` and `/docs` carry the depth.
- This site does **not** advertise a token, fee schedule, or commercial model. Internet Court is positioned as a public-good foundation; the protocol does not monetize.

### Success criteria

- A builder who has never heard of Internet Court can describe in one sentence what it does after 60 seconds on the homepage.
- A reader of either *Stripe Press* or the *Ethereum Foundation* blog would feel the tone is in the same neighborhood.
- The seal artifact appears at least once before the fold of any page where the home, the seal page, or the about page is the entry point.
- "Adjudicator" appears more often than "Evaluator," "AI jury," or "AI court" combined. (Target: zero of those three.)
- The L6 / 7-layer diagram appears on at least three pages (home, standard, adjudicators) so the spine is unmistakable.

---

## 2. Information architecture

### Sitemap

```
/                       Home — the missing-layer land + two-pillar intro
├── /standard           The open spec, deep dive
├── /seal               Protected by Internet Court — what it certifies
├── /adjudicators       Adjudicator types, accreditation program
├── /docs               Developer surface (quickstart, interfaces, schemas)
└── /about              Foundation, governance, partners, contact
```

Out of scope for this spec but linked from header where relevant:

```
/cases                  (live app — case explorer)
/create                 (live app — contract creation)
/join                   (live app — Adjudicator onboarding stub)
github.com/internetcourt   (link out, opens in new tab)
```

### Primary navigation

The header pill carries five marketing nav items plus a primary CTA. Mobile collapses to a hamburger.

| Order | Label | Route | Why it's there |
|---|---|---|---|
| 1 | Standard | `/standard` | Pillar 1 — the architecture story |
| 2 | Seal | `/seal` | Pillar 2 — the trust mark story |
| 3 | Adjudicators | `/adjudicators` | The partner-program on-ramp |
| 4 | Docs | `/docs` | The dev surface |
| 5 | About | `/about` | Foundation, governance |
| CTA | Read the spec | `/standard` (primary) or `/docs` (secondary) | One-click entry to the substance |

The live site's `Cases / Create / Join / Docs` nav can either move to a secondary "App" pill (light-grey, smaller) on the far right, or move into the footer. **Recommendation**: app links go in the footer for v2. The marketing site reads cleaner without them in the header. (See [§8.2 Open questions](#82-open-questions).)

### Page jobs (one-line each)

| Page | One-line job | Primary audience | Primary CTA |
|---|---|---|---|
| Home | Land the missing-layer claim and introduce both pillars | Protocol / infra builders | "Read the spec" → /standard |
| Standard | Convince a technical reader the architecture holds up | Protocol / infra builders, Adjudicator partners | "See the docs" → /docs |
| Seal | Make *"Protected by Internet Court"* legible as a recognizable trust mark | App builders, end users, founders | "Embed the seal" → /docs#seal |
| Adjudicators | Explain Adjudicator types and how to become Accredited | Kleros, UMA, Pledo, Saluma, ADR providers | "Apply to be an Accredited Adjudicator" → email or form |
| Docs | Give a builder enough surface area to start integrating | Builders, integrators | "View on GitHub" |
| About | Establish Foundation legitimacy, governance roadmap, partners | Press, partners, ecosystem | "Get in touch" → email |

### Audience map per page

A page can serve a secondary audience as long as the primary audience's path is unambiguous. The home has to serve all four; subpages narrow.

| Page | Primary | Secondary | Tertiary |
|---|---|---|---|
| Home | Protocol/infra builders | Adjudicator partners, App builders | End users / press |
| Standard | Protocol/infra builders | Adjudicator partners | — |
| Seal | App builders | End users | Adjudicator partners |
| Adjudicators | Adjudicator partners | Protocol/infra builders | — |
| Docs | Builders, integrators | — | — |
| About | Press, partners | All | — |

### Cross-page link discipline

The site has to feel like a graph, not a tree. A few pairings should always link to each other:

- Every page that mentions the **L6 keystone** links to `/standard` for the deep dive.
- Every page that mentions the **seal** links to `/seal`.
- Every page that mentions an **Adjudicator** by name (Deterministic, GenLayer, UMA, Kleros, Pledo, Saluma, ADR) links to the relevant card on `/adjudicators`.
- The **Docs** page links back up to `/standard` for any concept-level explanation; `/standard` links forward to `/docs` for the API.
- The **About** page links to all five other pages plus the GitHub.

### CTA hierarchy

There are three tiers of CTA. The site uses them consistently.

- **Primary** — IC red `#DC2626` filled button, white type. Used for the one action we most want a reader to take on a given page (typically "Read the spec," "View on GitHub," or "Apply").
- **Secondary** — outline button on the dark or light surface, hover state goes to red-soft fill (`bg-[var(--accent-red-soft)] hover:text-[var(--accent-red)]` on light; equivalent on dark).
- **Tertiary** — inline link, IC-red on hover, monospace if it points to a file or route, sans if it points to a person or partner.

Each page has at most two primary CTAs (typically a hero CTA pair: primary + secondary), and a third primary CTA in the page-bottom band. Anything else is secondary or tertiary.

### Routing details

- All routes are static-renderable except `/cases` (which already exists in the live app and stays separate).
- Mobile-first; the breakpoints from the live site (md = 768px, lg = 1024px, max-width 1200px) carry over.
- Anchor links into long pages (e.g. `/standard#bundle-pattern`) are part of the spec — every section header in `/standard` and `/docs` should have a stable anchor slug.

### Page lengths (rough budgets)

These are guidelines, not limits — but they keep the site disciplined.

| Page | Target sections | Target word count |
|---|---|---|
| Home | 6–8 | 600–900 |
| Standard | 6–10 | 1,500–2,500 |
| Seal | 5–7 | 800–1,200 |
| Adjudicators | 4–6 + per-Adjudicator cards | 800–1,200 + cards |
| Docs | 5–8 (front page only) | 600–1,000 + code blocks |
| About | 4–5 | 500–800 |

**Locked**: the homepage sections in order are Hero → 7-layer diagram → Two pillars (split) → Case lifecycle teaser → Seal preview → Partner stack → CTA band → Footer. Section content is open; section ordering is locked.

---

## 3. Design system

The visual language is **locked**. We carry it forward from the current live site and from the GenLayer GTM Phase 2 deck master. Where this spec and the live site disagree, this spec wins; where this spec is silent, fall back to the live site as reference.

### Color tokens

#### Brand & territory

| Token | Hex | Use |
|---|---|---|
| `--ic-red` | `#DC2626` | Internet Court territory color. Primary CTA fills, IC wordmark, accent borders, terminal `$` prompt, "If disputed…" callout border. **Reserved**: never used outside IC territory in shared materials. |
| `--ic-red-soft` | `rgba(220,38,38,0.08)` | Subtle hover fills, accent backgrounds. |
| `--ic-red-border` | `rgba(220,38,38,0.30)` | Subtle hover/focus borders. |

#### Canvas

| Token | Hex | Use |
|---|---|---|
| `--canvas-dark` | `#0a0913` | Dark canvas (decks, dark hero variants, the L6 keystone diagram). Slight violet undertone. |
| `--canvas-light` | `#ffffff` | Default site background. |
| `--surface-soft` | `#f7f7f7` | Panels, hero pills, code box backgrounds, recent-cases cards, header pill, footer accents. |
| `--ink` | `#1a1817` | Primary text on light canvas; terminal box background. |
| `--muted` | `#74706c` | Subtitles, captions, secondary copy. |
| `--muted-2` | `#d6d6d6` | Disabled / placeholder states. |

#### Accents

| Token | Hex | Use |
|---|---|---|
| `--lavender` | `#c8b6ff` | Italic-serif accent on the keyword phrase ("court of the internet," "missing layer" emphasis). Also lavender chips on the layer diagram. |
| `--genlayer-purple` | `#7c3aed` | Sparingly. The radial glow on dark canvas. ERC-8183 "emerging" chip variant. Never used as a primary IC accent — purple is GenLayer's territory. |

#### Light/dark canvas rule

- The **site** is light-canvas-default (`#ffffff` / `#f7f7f7` panels) — same as the live site.
- The **L6 keystone diagram and any 7-layer-stack visualization** ships dark-canvas (`#0a0913`) — even when embedded into a light page. The dark block reads as a "gallery panel" inside the lighter page.
- Hero on the home and on `/standard` may go dark-canvas. All other heroes are light-canvas.

### Type system

#### Stack

```
font-sans:    DM Sans (Variable)            — body, UI, nav, buttons
font-heading: DM Serif Display (Italic)     — accent phrases, hero/section titles where serif is called for
font-mono:    DM Mono (Variable)            — nav links, code, terminal commands, layer numbers, URLs, page numbers
```

The live site uses DM Sans and DM Mono everywhere (variable fonts, preloaded as `.woff2`). DM Serif Display **italic** is added for accent phrases ("court of the internet," "the missing layer") and for hero/section titles when the spec calls for serif.

#### Scale (sans, headings)

| Role | Size (mobile / desktop) | Weight | Tracking | Leading |
|---|---|---|---|---|
| Hero h1 | `40px / 96px` | 800 | -0.02em | 1.2 |
| Section h2 | `36px / 48px` | 800 | -0.72px / -0.96px | 1.2 |
| Sub-section h3 | `24px` | 700 | -0.02em | 1.2 |
| Body | `18px / 20px` | 400 | normal | 1.5 |
| Body small | `14px / 16px` | 400 | normal | 1.4 |
| Caption | `12px` | 500 | 0.02em | 1.4 |

#### Mono use

- Nav links: `font-mono` `text-base`
- Terminal command: `font-mono` `text-base`
- Layer numbers in the 7-layer diagram: `font-mono` `text-xs` uppercase
- Page numbers, URLs, file paths: `font-mono`

#### Italic-serif use

- Used **only** for keyword phrases inside otherwise-sans copy. Never for paragraphs, never for headings on its own.
- Examples: *"the missing layer,"* *"court of the internet,"* *"verification by construction."*
- Color is `--lavender` `#c8b6ff` against dark canvas, `--ic-red` `#DC2626` against light canvas, never both at once.

### Spacing & layout

| Token | Value | Use |
|---|---|---|
| `--container-max` | `1200px` | Outer page max-width. Header pill matches. |
| `--content-max` | `1024px` (`max-w-6xl`) | Main content column on most sections. |
| `--prose-max` | `672px` (`max-w-2xl`) | Long-form copy lines. |
| Section padding y | `80px / 128px` (mobile / desktop) | Standard section vertical rhythm (`py-20 md:py-32` for hero, `py-24` for body sections). |
| Card radius | `12px` (`rounded-xl`) | Default on `--surface-soft` panels, code boxes, recent-case cards. |
| Pill radius | `16px` (`rounded-2xl`) | Audience-toggle pill, hero pill containers. |
| Big-callout radius | `24px` (`rounded-3xl`) | The "If disputed…" red-bordered card, mobile-first. |
| Button radius | `6px` (`rounded-md`) on lg buttons, `8px` (`rounded-lg`) on default buttons | |
| Header pill radius | `12px` | Header pill itself. |

The live site uses Tailwind utility classes with CSS variable tokens. Keep that pattern.

### Motion & micro-interaction

- **Hero background video.** The live site uses `/scene-1.mp4` at 30% opacity behind the hero. Carry this forward; replace with a v2 scene that subtly visualizes the L6 keystone (a 7-layer stack with the L6 cell pulsing) if/when produced. **Open question**: do we re-shoot or keep `scene-1.mp4` for v2? See appendices.
- **Audience toggle.** Two-state pill — "I'm an agent" / "I'm a human" on the live site — re-purposed for v2 as **"For builders" / "For app makers"**. Active state: red fill `#DC2626`, white text. Animation: 300ms ease.
- **Case lifecycle row.** Cycles between 5 example statements (SLA / Data Real / Benchmark / On Time / Uptime) by tab pill or auto-advance. 300ms cross-fade. Carry forward.
- **Tab pills.** Active = white card on `#f7f7f7` track. Inactive = 20% opacity. Hover = 40% opacity.
- **Hover.** Every IC red interactive surface uses the same hover signature: `hover:bg-[var(--ic-red-soft)] hover:text-[var(--ic-red)] hover:border-[var(--ic-red-border)]` on outline buttons; `hover:bg-red-700` on filled.
- **Reveal.** No big scroll-triggered animations on v2. The site is a document, not a presentation.

### Iconography

- **Icon set**: lucide-react (already in the live site). Stick to lucide.
- **Recurring icons used in the live site we keep**: `terminal`, `users`, `copy`, `external-link`, `file-text`, `book-open`, `folder-open`, `scale`, `triangle-alert`, `timer`, `shield-check`, `target`, `package-check`, `activity`, `arrow-right`, `menu`. These map to specific recurring components.
- **Icon color** is IC red `#DC2626` on accent contexts (case lifecycle row icons, dispute callout, terminal `$`), `--muted` everywhere else.

### Logo & seal assets

- **IC wordmark (red)**: `/logos/tic-logo-red.svg` (viewBox `0 0 222 29`, all paths `#DC2626`). Embed as SVG. Never approximate.
- **IC favicon**: `/favicon.svg` on `#DC2626` rounded square.
- **The seal** is a separate design artifact. Working assumption: a shield-shaped derivative of the IC wordmark icon, monochrome, with light/dark variants for embedding. The seal carries cryptographic verification metadata accessible to clients (the factory address and chain ID it derives from). Final artifact TBD — see [§6.3 Seal](#63-seal-seal) and the open-questions appendix.
- **Partner logos** appear in their own brand colors in the partner grid; muted on hover-out states is acceptable but never recolor a partner mark.
- **GenLayer wordmark**: appears on `/about` and on `/adjudicators` as one Accredited Adjudicator among others. Never as a "powered by" footer line.

### Layer diagram visual language

The 7-layer transaction stack appears on the home, `/standard`, and `/adjudicators`. It is the most important single visual artifact on the site after the wordmark and the seal.

- **Canvas**: dark `#0a0913`, even when embedded in a light page (the diagram is its own gallery panel).
- **Grid**: 40px × 40px pattern at `rgba(255,255,255,0.04)`, opacity 0.5.
- **Glow**: radial purple `rgba(124,58,237,0.18)` fading to transparent over ~480px, top-left.
- **Layer rows**: 7 stacked rows.
  - **Filled layers (1–5, 7-when-shown)**: `rgba(255,255,255,0.04)` background, `rgba(255,255,255,0.18)` border.
  - **L6 (Internet Court)**: `rgba(220,38,38,0.12)` background, `1px solid #DC2626` border. The keystone visual.
  - **L7 (Enforcement)**: dashed `rgba(255,255,255,0.18)` border, transparent fill. Labelled *"vacant."*
- **Layer number**: monospace, large, far left, dim white.
- **Layer name**: DM Sans bold, white.
- **Inhabitants/standards chips**: 11px / 8px sans, padded pills, 4px radius. Lavender variant for emerging standards (ERC-8183 chip).
- **L5 label**: italic-serif `"the agents themselves"` — no logos.

### Accessibility

- Color contrast: every text token must hit WCAG AA against its canvas. The `#74706c` muted on `#ffffff` clears AA for body but not for caption sizes — use `--ink` for caption-size body text on white.
- IC red `#DC2626` on white clears AA for body but is borderline for caption — use `--ink` for caption-size red.
- Every interactive surface has a `:focus-visible` ring (3px, IC red at 50% alpha).
- Hero video has `prefers-reduced-motion` fallback to a static still frame.
- All icons used as the only label of an interactive element have `aria-label`.

### Open visual decisions (linked to appendices)

- Hero background motion for v2 (re-shoot vs reuse `scene-1.mp4`).
- The seal artifact itself (shape, mark, embedding spec).
- Whether the 7-layer diagram should also have a light-canvas variant for press / partner collateral.
- Partner grid layout (organized by layer vs grid-of-logos).

---

## 4. Components

The reusable building blocks. Most of these exist on the live site already and we keep them, with small adjustments for the new content. A few are new.

Each component lists: what it is, where it appears, the visual recipe, the props/content slots, and any state/motion notes. Implementation is React/Tailwind on Next.js (matching the live site stack).

---

### C-01 · Header pill

**What.** The site's primary nav, a rounded pill on `#f7f7f7` floated above the page.

**Where.** Every page.

**Recipe.**
- Wrapper `bg-[#f7f7f7] rounded-[12px] max-w-[1200px] mx-auto h-14 pl-3 pr-2 py-2 flex items-center justify-between`
- Left: IC wordmark SVG, `h-[29px] w-[160px] md:w-[220px]`
- Right (desktop): nav links (mono, `text-base`, `hover:text-[#dc2626]`) + primary CTA pill
- Right (mobile): hamburger button, white square with red hover

**Slots.**
- `nav.items[]` — array of `{ label, href }`. v2 default: `[Standard, Seal, Adjudicators, Docs, About]`.
- `cta` — `{ label, href, variant }`. v2 default: `{ label: "Read the spec", href: "/standard", variant: "primary" }`.

**Notes.** App links (`/cases`, `/create`, `/join`) move to footer. Connect Wallet stays out of the marketing-site header.

See [§7.1 Header](#71-header) for the spec.

---

### C-02 · Hero (light or dark variant)

**What.** Full-width hero block with oversized heading, subhead, and a CTA cluster.

**Where.** Home, Standard. Light variant on Seal, Adjudicators, Docs, About.

**Recipe — dark variant.**
- Canvas `--canvas-dark` `#0a0913`
- Optional 40px grid pattern at `rgba(255,255,255,0.04)` opacity 0.5
- Optional radial purple glow top-left `rgba(124,58,237,0.18)` fading over ~480px
- Optional background video at 30% opacity (`/scene-1.mp4` for v1 of v2; replaceable)
- h1: white, DM Sans 800, hero scale (`text-[40px] md:text-7xl lg:text-[96px] tracking-[-0.02em] leading-[1.2]`)
- Optional accent phrase inside h1, italic-serif lavender (`#c8b6ff`)
- Subhead: `--muted-on-dark` (rgba 255/255/255 0.66), `text-lg md:text-xl`, `max-w-[639px]`, centered
- CTA pair below subhead, 16–24px gap

**Recipe — light variant.**
- Canvas `--canvas-light` `#ffffff`
- Same heading/subhead spec, but heading in `--ink`, accent phrase in `--ic-red`
- No background video; subtle radial red orb (`bg-[var(--ic-red)] opacity-[0.03] blur-[150px]`) positioned top-center

**Slots.**
- `eyebrow` — optional uppercase mono label above h1 (e.g. "Layer 6 / Verification, adjudication & disputes")
- `title` — string with optional `<em>` for accent phrase
- `subhead` — string with optional `<strong>` for emphasis
- `cta_primary`, `cta_secondary` — link objects
- `media` — `{ type: "video" | "image" | "diagram", src }`

---

### C-03 · Audience toggle pill

**What.** Two-state pill that swaps which CTA cluster + numbered steps render below.

**Where.** Home hero. Optionally Docs hero.

**Recipe.**
- Container `bg-[#f7f7f7] rounded-2xl p-1 inline-flex flex-col md:flex-row`
- Active button: `bg-[#dc2626] text-white rounded-xl`
- Inactive button: `text-foreground hover:text-foreground rounded-xl`
- Buttons: icon + label, `font-mono text-base px-4 py-2.5`

**v2 default labels.**
- Left: `terminal` icon + **"For builders"**
- Right: `users` icon + **"For app makers"**

**Slots.**
- `tabs[]` — array of `{ icon, label, payload }` where `payload` is the content cluster to render below.

**Notes.** The live site uses "I'm an agent" / "I'm a human." For v2 we widen to "For builders / For app makers" because the home is no longer agent-onboarding-first; it's protocol-first with a builder funnel.

---

### C-04 · Terminal command box

**What.** Dark code box with a copy button and an IC-red `$` prompt.

**Where.** Home hero (when audience toggle = builders), Docs quickstart.

**Recipe.**
- Container `bg-[#1a1817] text-[#f7f7f7] rounded-2xl md:rounded-xl px-4 py-2.5 font-mono text-base flex items-center gap-2.5`
- Prompt `<span class="text-[#dc2626] shrink-0">$</span>`
- Command in mono, breakable on mobile, `whitespace-nowrap` on desktop
- Copy button right-aligned (`lucide-copy` icon)

**Slots.**
- `command` — string
- `copyable` — bool

**v2 home defaults.**
- Builder tab: `curl -s https://internetcourt.org/skill.md`
- App-maker tab: `Read internetcourt.org/skill.md and follow the instructions`

---

### C-05 · Numbered step row

**What.** Three small numbered chips with one-line labels, used to follow up a terminal command with an action plan.

**Where.** Home hero (below the terminal box), Docs quickstart.

**Recipe.**
- Container `mt-5 flex flex-col items-start gap-2.5 md:flex-row md:items-center md:justify-center md:gap-2.5 py-2`
- Each step: `border border-[#dc2626] rounded-[4px] text-[14px] leading-4 w-4 h-4 flex items-center justify-center text-muted-foreground` for the number chip; `text-sm text-muted-foreground` for the label

**Slots.**
- `steps[]` — array of `{ n, label }`, length 3

---

### C-06 · 7-layer diagram

**What.** The single most important diagram on the site. Top-to-bottom rows for L1–L7 with L6 as the keystone.

**Where.** Home (between hero and pillars), Standard (top of page), Adjudicators (top of page). Also referenced from /about as a static image.

**Recipe.**
- Always dark canvas, even inside a light page (own gallery panel).
- See [§3 Design system](#3-design-system) — *Layer diagram visual language* for full visual recipe.
- Component renders as 7 stacked rows in a CSS grid, layer number (mono) left, layer name (sans bold) center, inhabitant chips right.
- Default: vertical stack on mobile, full-width grid on desktop.
- Interactive: tapping a layer highlights it and reveals a popover with that layer's `inhabitants[]` and the matching partners on `/standard`'s partner grid. (v2 stretch goal — first ship a static version.)

**Slots.**
- `layers[]` — 7 entries, each `{ n, name, blurb, inhabitants[], status: filled|keystone|vacant }`
- `keystone` — layer index that gets the IC-red treatment (always `6` for IC; the API supports moving it for partner-facing slides where the keystone is something else).

**Locked content for v2** (from memory `project_internet_court_layer_stack.md`):
1. Discovery, identity & reputation — ERC-8004 — filled
2. Negotiation — A2A — filled
3. Contracts — Arkhai, ERC-8183 (lavender) — filled
4. Payment & escrow — x402, MPP — filled
5. Execution — *the agents themselves* — filled, italic, no logos
6. Verification, adjudication & disputes — **Internet Court** — keystone
7. Enforcement — — — vacant

---

### C-07 · Two-pillar split

**What.** Side-by-side block introducing both pillars, "the standard" left and "the seal" right, with one-line summary, two visual hints, and a deep-dive link.

**Where.** Home, About.

**Recipe.**
- Container `grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto`
- Each pillar card `bg-[#f7f7f7] rounded-2xl p-8`
- Left card eyebrow: "Pillar 1 · Architecture" (mono, IC red)
- Right card eyebrow: "Pillar 2 · Trust mark" (mono, IC red)
- Each card has: eyebrow, h3 (DM Sans 700), one-paragraph blurb, one visual (left card → 7-layer mini, right card → seal artifact), tertiary "Read more" link

**Slots.**
- `pillars[]` — array of two `{ eyebrow, title, blurb, visual, link }`

---

### C-08 · Case lifecycle row

**What.** The Statement → Guidelines & Evidence → Evidence Submission → Verdict walkthrough that exists on the live site, with cycling examples driven by tab pills.

**Where.** Home (teaser version, 2 rows + dispute callout), Standard (full version, all 4 rows).

**Recipe (carry forward from live site).**
- Tab pill row at top: `SLA Met` / `Data Real` / `Benchmark Met` / `On Time` / `Uptime Met`. Active tab: white card on `#f7f7f7` track. Inactive: 20% opacity. Auto-advance every ~5s; clicking pauses auto-advance.
- Each row: 2-column on desktop, stacked on mobile.
  - Left col (`md:w-[400px]`): icon (IC red, lucide), h3 (DM Sans 700, `text-2xl`), one-paragraph blurb (muted, `text-base leading-5`).
  - Right col (`md:w-[400px]`): example pill in `#f7f7f7` panel, mono, with red labels for `Guidelines:` / `Evidence:` / `Party A submits:` / `Party B submits:`.
- Disputed callout: `border-2 border-[#dc2626] rounded-3xl` wrapping the second half of rows; labelled "If disputed…" in IC red with `triangle-alert` icon.

**Slots.**
- `examples[]` — array of `{ key, label, icon, statement, guidelines, evidence, partyAEvidence, partyBEvidence, verdict }` (v2 ships with the same 5 from the live site).

**Notes.** The verdict shape on v2 is *not* always binary. The Verdict row says "True / False / Undetermined" by default but the spec supports structured verdicts (pay percentage, partial release, etc.). The teaser version shows binary; the full version on `/standard` adds a paragraph noting structured verdicts.

---

### C-09 · Dispute callout card

**What.** The IC-red bordered "If disputed…" container. A piece of `C-08` but reusable.

**Where.** Home (around case lifecycle teaser), Standard (around lifecycle), Docs (around dispute path examples).

**Recipe.**
- `border-2 border-[#dc2626] rounded-3xl overflow-clip md:border-0 md:rounded-none md:overflow-visible`
- Header strip `bg-[#f7f7f7] rounded-t-3xl md:rounded-t-xl px-6 pt-3 flex items-center gap-2.5 w-full md:w-fit` with `triangle-alert` icon (IC red) + `font-mono text-base text-[#dc2626]` label
- Body `bg-[#f7f7f7] rounded-b-3xl md:rounded-b-xl md:rounded-tr-3xl p-3`

**Slots.**
- `label` — default "If disputed…"
- `children` — body content

---

### C-10 · CTA pair

**What.** A primary + secondary button cluster, used at the end of every section group and inside the hero.

**Recipe.**
- Container `mt-8 flex justify-center gap-4` (or `justify-start` in non-hero contexts)
- Primary: `h-10 rounded-md px-6 has-[>svg]:px-4 gap-2 bg-[#dc2626] text-white hover:bg-red-700 shadow-sm`
- Secondary (outline): `h-10 rounded-md px-6 has-[>svg]:px-4 gap-2 border bg-background border-border hover:bg-[var(--ic-red-soft)] hover:text-[var(--ic-red)] hover:border-[var(--ic-red-border)]`
- Both buttons end with `lucide-arrow-right` or a context-specific icon.

**Slots.**
- `primary`, `secondary` — `{ label, href, icon }`

---

### C-11 · Partner grid (organized by layer)

**What.** The "logos on the wall" section, organized by L1–L7 instead of as a flat grid.

**Where.** Home (compact version), Standard (full version), Adjudicators (L6 emphasis).

**Recipe.**
- Vertical stack of layer-rows. Each row has the layer label on the left (mono, uppercase tracked, IC-muted color), then a horizontal scroll/wrap of partner logos on the right.
- Logos render at consistent height (32px), greyscale at rest, full-color on hover. **Exception**: if a partner explicitly requests full-color always, accept that.
- L6 row uses IC-red label (territory color) — the rest are muted.
- L7 row exists but is labelled "Vacant" with a dashed border, no logos.
- Stretch: tapping a logo opens the matching `/standard#layer-N` partner card.

**Slots.**
- `layerLogos` — object keyed by layer number, each value an array of `{ name, src, href, color: "always" | "hover" }`

**Notes.** Locked first-row partners per memory: Arkhai (active) on L3. Partners listed but not yet confirmed go in a separate "In conversation" tag — see [§6.6 About](#66-about-about).

---

### C-12 · Adjudicator card

**What.** A single Adjudicator's profile card.

**Where.** Adjudicators page (one per type), Docs (sidebar reference).

**Recipe.**
- `bg-[#f7f7f7] rounded-xl p-6` card.
- Top: tag chip (e.g. "Deterministic" / "AI / on-chain" / "Optimistic" / "Human jury" / "ADR"), Adjudicator name, partner logo right-aligned.
- Middle: one-paragraph "what it adjudicates" blurb.
- Properties row: small mono pills — `On-chain` / `Off-chain`, `Trustless` / `Optimistic` / `Human`, `Speed: machine` / `~hours` / `~days`.
- Status: `Accredited` (IC-red badge) / `In conversation` (lavender badge) / `Planned` (muted badge).
- Tertiary link "How to integrate" → `/docs#adjudicator-interface`.

**Slots.**
- `name`, `kind`, `blurb`, `properties{}`, `partnerLogo`, `status`

---

### C-13 · Seal embed preview

**What.** The "Protected by Internet Court" mark with an HTML/React snippet to embed it.

**Where.** Seal page (hero), Docs (seal section).

**Recipe.**
- Big seal artifact left (300px square panel, dark or light variant chosen by toggle).
- Code box right (terminal-style, but ours uses `<script>` not `$ curl`):
  ```html
  <a href="https://internetcourt.org/verify/<contract-address>"
     class="ic-seal" data-ic-contract="0x...">
    <img src="https://internetcourt.org/seal.svg" alt="Protected by Internet Court" />
  </a>
  ```
- Caption: "Verifies the contract address derives from an Internet Court factory deployment, on-chain, on every page load."
- "Light / Dark" toggle on the seal preview.

**Slots.**
- `seal` — `{ light, dark }` SVG paths
- `embedSnippets[]` — `{ language, code }` (HTML, React, Vue)

**Notes.** Final seal artifact is TBD — placeholder shield mark for v2 spec until the design lands.

---

### C-14 · Footer

**What.** Three-section footer: brand mark + tagline left, marketing nav center, app links + GitHub right.

**Where.** Every page.

**Recipe.**
- Container `border-t border-border/60 mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:gap-4`
- Left: IC wordmark `h-5`, em-dash, "The neutral venue for agent disputes" (carry-over of "The Court for the Agent Economy" gets retired in favor of the new tagline).
- Center: Standard / Seal / Adjudicators / Docs / About / Cases / Create / GitHub.
- Right: tiny "Internet Court Foundation · Open standard · Public good" line. (No "Powered by GenLayer" — see [§1 Overview](#1-overview).)

See [§7.2 Footer](#72-footer).

---

### C-15 · "Recent Cases" or "Recent Verdicts" preview

**What.** Three skeleton-loadable cards showing recent verdicts on the network.

**Where.** Home (bottom section), live app `/cases` (already exists separately).

**Recipe.** Same as live site (3-col grid, `bg-[#f7f7f7] rounded-xl p-5`, mono case numbers, statement preview, party A/B chips, verdict badge).

**v2 difference.**
- Each card shows the **Adjudicator** that decided the case (Deterministic / GenLayer / etc.) as a tag.
- Each card shows the **bundle** the contract was deployed from.
- "View all verdicts" CTA → `/cases`.

**Slots.**
- `cases[]` — array of `{ id, statement, partyA, partyB, adjudicator, verdict, bundle, timestamp }`

**Notes.** v2 may rename this section to "Recent verdicts" — open question. The live site says "Recent Cases."

---

### Component-to-page matrix

| Component | Home | Standard | Seal | Adjudicators | Docs | About |
|---|---|---|---|---|---|---|
| C-01 Header pill | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| C-02 Hero | ✓ (dark) | ✓ (dark) | ✓ (light) | ✓ (light) | ✓ (light) | ✓ (light) |
| C-03 Audience toggle | ✓ | — | — | — | optional | — |
| C-04 Terminal box | ✓ | — | — | — | ✓ | — |
| C-05 Numbered steps | ✓ | — | — | — | ✓ | — |
| C-06 7-layer diagram | ✓ | ✓ | — | ✓ | — | static |
| C-07 Two-pillar split | ✓ | — | — | — | — | ✓ |
| C-08 Case lifecycle | teaser | full | — | — | abridged | — |
| C-09 Dispute callout | ✓ | ✓ | — | — | ✓ | — |
| C-10 CTA pair | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| C-11 Partner grid | compact | full | — | L6 emphasis | — | full |
| C-12 Adjudicator card | — | sidebar | — | ✓ | sidebar | — |
| C-13 Seal embed | — | — | ✓ | — | ✓ | — |
| C-14 Footer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| C-15 Recent verdicts | ✓ | — | — | — | — | — |

---

## 5. Content style

The voice of the site. Mostly inherited from the v4 narrative doc (`Internet Court — Strategy & Narrative v4.md`), restated here so writers don't have to dig.

### Voice in one paragraph

Protocol-standard authority and trust-mark institutional credibility. Closer to the Ethereum Foundation, Cloudflare's protocol blog, x402's docs, or UL's standards documentation than to a launch post. Declarative, technical-but-accessible, sparse. We do not hype. We name the thing, describe what it does, and stop.

### The three locked lines

These three lines appear verbatim across the site. Don't paraphrase them.

1. **Tagline** — *"The neutral venue for agent disputes."*
2. **Architecture pillar** — *"The missing layer. Nothing above it works without it."*
3. **Seal pillar** — *"Protected by Internet Court."*

Allowed slight variations only when grammatically required (e.g., "Protected by Internet Court." inside a sentence becomes a sentence-cased phrase). The three sentences above are the canonical forms for marketing copy, OG cards, slide titles, and the homepage hero stack.

### The supporting moves we repeat

- *"FDIC for banks. UL for electronics. HTTPS for the web. Internet Court for agent commerce."* (Brand-pillar analogy.)
- *"Internet Court is Layer 6 of the agent transaction stack."* (Architecture position.)
- THE GAP trio: *Every agent transaction needs a fallback. No protocol-level solution exists today. First mover compounds via partner integrations.*
- *"The standard is a public good. The seal is a public mark."* (Two-pillar TL;DR.)
- *"Verification by construction."* (How the factory makes the seal trustworthy.)
- *"Partners earn the seal."* (Partner GTM.)

### Vocabulary — use these

| Concept | Use | Don't use |
|---|---|---|
| Decision-making system | **Adjudicator**, **Accredited Adjudicator** | Evaluator, Evaluator marketplace, AI jury, AI court, judge (sparingly) |
| The keystone layer | **Layer 6**, **L6**, **the missing layer** | The court layer (avoid; "court" is the brand, not the layer) |
| The on-chain AI tier | **GenLayer-tier Adjudicator** or **AI validator network (GenLayer)** | "AI jury," "AI court" |
| The contract template + adjudication contract + Adjudicator triple | **Bundle** | Module, package, kit |
| The factory that deploys bundles | **The Internet Court factory** | Generator, builder, wizard |
| The mark | **The seal**, **"Protected by Internet Court"** | Badge (acceptable casually), shield (acceptable in design contexts), stamp (acceptable in seal-program contexts), certification (acceptable but generic) |
| The ones being sealed | **Certified Contract**, **Accredited Adjudicator** | Approved, blessed, whitelisted |
| The Foundation | **Internet Court Foundation** | The team, the company, the org |
| The dispute lifecycle steps | **Statement, Guidelines & Evidence, Evidence Submission, Verdict** | Claim, brief, ruling |
| The on-chain consequence | **Verdict execution**, **escrow release on certified verdict** | Settlement, payout, transfer |
| Rep / track record | **Public verdict log**, **reputation as a side-effect** | Karma, score, rating |

### Vocabulary — retire these

- **"Evaluator"** anywhere. Renamed Adjudicator project-wide. Includes "Evaluator marketplace" — the marketplace concept is dead, replaced by the Accredited Adjudicator program.
- **"AI court"** — gimmicky, press treats it as a punchline.
- **"AI jury"** — present on the live site, retire across the v2 site. Use "Adjudicator" or, when emphasizing the on-chain AI tier, "GenLayer-tier Adjudicator."
- **"Decentralized"** as a primary adjective. True but tired. The function is the lead, not the architecture.
- **"Disrupt the legal system."** Wrong audience, wrong frame.
- **"Powered by GenLayer."** Discreet equal-footing logo only; never as a footer attribution line.
- **"Dispute resolution for the agent economy"** as a tagline. Superseded by the locked tagline above.

### Casing & typography rules

- **Internet Court** — always two words, capitalized. Never "InternetCourt" (one word) outside the wordmark SVG.
- **L1, L2, …, L6, L7** — always uppercase L, no space, no period.
- **Layer 6** — full form when introducing; "L6" for repeat references. Both are fine.
- **"Protected by Internet Court"** — title case, in quotes when used as a sentence inside copy.
- **Adjudicator** — capitalized when referring to the role/category in the spec. Lowercase when used as a generic ("the adjudicator decided" → still capitalize when referring to an Adjudicator type).
- **Bundle** — lowercase in copy unless beginning a sentence.
- **Seal** — lowercase in copy ("the seal," "the seal program") unless beginning a sentence.
- **Foundation** — capitalized when "Internet Court Foundation" or shortened to "the Foundation."

### Sentence-level patterns

**Lead with the function, not the architecture.** "Internet Court adjudicates disputes between agents and writes the verdict to the public record" beats "Internet Court is a decentralized, EAS-inspired, multi-chain protocol for adjudication."

**Name the layer.** When introducing a concept, anchor it to L1–L7. ("L4 escrow needs L6 to release.") Reads as confident; reinforces the spine.

**One claim per paragraph.** The narrative is dense; the prose has to be the opposite.

**Prefer concrete to abstract.** Say "Kleros becomes the first Accredited human-jury Adjudicator post-v0.1" not "we will partner with leading dispute-resolution networks."

**Avoid hedges.** "We will" not "we plan to." "It does X" not "it can do X."

### Section-header patterns

These reusable section title patterns work across pages:

- **"How [thing] works"** — Use for mechanical explanations. ("How a case works.") Keep on the live site.
- **"Why this is the missing layer"** — Use for the L6 keystone explanation.
- **"What "Protected by Internet Court" means"** — For the seal page.
- **"The seal is not a stamp on one layer. It wraps the stack."** — Standalone moment on `/seal`.
- **"Partners earn the seal."** — Standalone moment on `/about` and `/adjudicators`.
- **"Five reasons L6 is the keystone"** — On `/standard`.

### Code voice (in `/docs`)

Code samples in docs should use the same tone as Stripe API docs: minimal English, real types, no `// TODO` comments, no marketing adjectives in comments. Names like `CaseRequest`, `AdjudicatorInterface`, `BundleDeployment` follow `PascalCase` for types, `camelCase` for fields, `SCREAMING_SNAKE` for enum members.

### Copyright / partner mentions

- Internet Court is a public good — no proprietary tone.
- Every partner mentioned by name is mentioned in their own brand spelling. (Kleros, UMA, x402, Arkhai, Pledo, Saluma, Virtuals, AntSeed, Rally, Kelors.)
- ERC numbers are spelled with hyphen: `ERC-8004`, `ERC-8183`.
- Standards-body citations link to the canonical spec when relevant.
- "GenLayer" with capital G and L joined; the wordmark.

### Tone test — quick gut-check

Before publishing any copy, read it aloud and ask:

- Does this sound like the **Ethereum Foundation** could have written it? → Good.
- Does this sound like a **Series A launch post**? → Bad. Cut adjectives.
- Does this sound like a **legal disclaimer**? → Bad. Cut hedges.
- Does this name the function in the first sentence? → Good.
- Does this lead with "We"? → Bad. Lead with the standard, the seal, or the layer.

---

## 6. Pages

Six pages, in nav order. Each page section follows the same shape: page job, audience priority, hero, section-by-section spec, locked vs open.

### 6.1 Home `/`

The land. A reader who has never heard of Internet Court should leave with the L6 / missing-layer claim in their head and a recognizable visual mark.

#### Page job

Make the missing-layer claim land in 5 seconds. Introduce both pillars on the same page. Send the right audience to the right deep-dive (Standard for builders, Seal for app-makers, Adjudicators for partners).

#### Audience priority

1. Protocol / infra builders (primary)
2. Adjudicator partners (secondary)
3. App / contract builders (secondary)
4. End users / press (tertiary)

#### Section order (locked)

1. Hero
2. The 7-layer stack diagram
3. Two pillars (architecture + seal)
4. How a case works (teaser)
5. The seal preview
6. Partner stack (organized by layer)
7. CTA band
8. Recent verdicts
9. Footer ([§7.2 Footer](#72-footer))

---

#### Section 1 · Hero (dark variant)

**Component:** `C-02 Hero (dark)` + `C-03 Audience toggle` + `C-04 Terminal box` + `C-05 Numbered steps` + `C-10 CTA pair`.

**Eyebrow** (mono, uppercase, lavender):
```
LAYER 6 · VERIFICATION, ADJUDICATION & DISPUTES
```

**Title** (DM Sans 800, with italic-serif lavender accent on `the missing layer`):
> The missing layer.<br>
> *Nothing above it works without it.*

**Subhead** (max-w-[639px], `text-lg md:text-xl`):
> Internet Court is the open standard for adjudicating disputes between agents. The standard is a public good. **The seal is a public mark.**

**Audience toggle (C-03)** — two states, default = "For builders":

- **For builders** (terminal icon, active red)
  - Terminal box: `curl -s https://internetcourt.org/skill.md`
  - Numbered steps:
    1. Install the IC SDK and pick a bundle.
    2. Deploy your contract through the factory.
    3. Earn the seal — verification by construction.
- **For app makers** (users icon)
  - Terminal box: `Read internetcourt.org/skill.md and follow the instructions`
  - Numbered steps:
    1. Pick an Internet Court factory bundle.
    2. Deploy on your chain. Embed the seal.
    3. Disputes route through Accredited Adjudicators automatically.

**CTA pair (C-10)** below the toggle area:
- Primary: **Read the spec** → `/standard` (filled IC red, `arrow-right` icon)
- Secondary: **See the seal** → `/seal` (outline, `shield-check` icon)

**Background.** 30% opacity scene video (carry-over of `/scene-1.mp4` for v1; replaceable). 40px grid pattern. Lavender-purple radial glow top-left. **Open question**: re-shoot the scene to specifically visualize the L6 keystone (a 7-layer stack with the L6 cell pulsing) — see appendix.

**Notes.**
- The eyebrow above h1 is new for v2; the live site doesn't have one. It does the architecture-position work in 8 mono words.
- The "Layer 6" eyebrow is the *only* place the homepage names L6 above the fold. The diagram immediately below makes the rest of the case visually.

---

#### Section 2 · 7-layer stack diagram

**Component:** `C-06 7-layer diagram`.

The single most important moment on the homepage. Top-to-bottom layers, L6 in IC red, L7 dashed and labelled "Vacant."

**Section eyebrow:**
```
THE STACK
```

**Section title:**
> Seven layers. One missing standard.

**Section subhead:**
> Every agent-to-agent transaction flows through these layers. Six have credible standards. The seventh sits on top of L6 and is vacant. This is where Internet Court lives.

**Diagram body.** Use the locked layer content from §4 Components — *C-06*. On the homepage, keep it static (no popovers); link to `/standard#7-layer-stack` for the interactive version.

**Below diagram, a one-line "five reasons L6 is the keystone" teaser:**
> L1 reputation is empty without L6 verdicts. L2 negotiation degrades without L6 fallback. L3 contracts are toothless without L6. L4 escrow needs L6 to release. L7 enforcement layers on top of L6.

Tertiary link: **The full case for L6 →** `/standard#why-l6`

**Notes.**
- The diagram is dark-canvas even though the home is light-canvas — own gallery panel.
- On mobile the diagram stacks; layer chips can wrap.

---

#### Section 3 · Two pillars

**Component:** `C-07 Two-pillar split`.

**Section title:**
> Two pillars. One trust envelope.

**Section subhead:**
> The architecture is what makes the seal verifiable. The seal is what makes the architecture valuable to people who do not read protocol specs.

**Left card — Pillar 1: The standard.**
- Eyebrow: `PILLAR 1 · ARCHITECTURE`
- Title: **The open standard for L6.**
- Blurb: An open, EAS-inspired specification for adjudicating disputes between agents. Multi-chain. Schema-driven. Permissionless registration. Free for anyone to use, deployable on any chain, with first-class interfaces for both contract-side integrators and Adjudicator-side decision systems.
- Visual: a small, 5-row teaser of the layer diagram (L4–L8 trimmed view with L6 highlighted).
- Tertiary link: **Read the spec →** `/standard`

**Right card — Pillar 2: The seal.**
- Eyebrow: `PILLAR 2 · TRUST MARK`
- Title: **"Protected by Internet Court."**
- Blurb: A recognizable mark. FDIC for banks, UL for electronics, USDA Organic for food, HTTPS for the web. Applied across the whole stack — when you see the seal, you're seeing factory-deployed contracts, Accredited Adjudicators, and verdicts written back to the public record.
- Visual: the seal artifact (placeholder shield until final design lands).
- Tertiary link: **See the seal →** `/seal`

**Locked sentence below both cards:**
> The standard is a public good. The seal is a public mark.

---

#### Section 4 · How a case works (teaser)

**Component:** `C-08 Case lifecycle row` (teaser version: 2 rows + dispute callout) + `C-09 Dispute callout`.

**Section title** (carry-over from live site):
> How does a case work?

**Section subhead:**
> From contract to verdict — the full lifecycle.

**Tab pill row** (carry forward from live site, same five examples): `SLA Met` / `Data Real` / `Benchmark Met` / `On Time` / `Uptime Met`.

**Rows shown on home (teaser; full version on `/standard`):**

1. **Statement** — *"The claim to evaluate. Clear, specific, evaluable."*
2. **Guidelines & Evidence** — *"The evaluation rubric and what each side can submit."*
3. **(Dispute callout, IC red)**
   - **Evidence Submission** — *"Each side submits within the pre-defined constraints. No surprises, no scope creep."*
   - **Verdict** — *"Adjudicators independently evaluate the evidence and reach consensus."* (Verdict pill: True / False / Undetermined.)

**Vocabulary note** for the verdict row: replace "AI validators" (live site) with **Adjudicators**. The on-chain AI tier is just one Adjudicator type and shouldn't be hardcoded into the lifecycle copy on the home.

**Tertiary link below:**
**Full lifecycle, including escalation tiers →** `/standard#case-lifecycle`

---

#### Section 5 · The seal preview

**Component:** `C-13 Seal embed preview` (compact homepage variant).

**Section eyebrow:** `THE SEAL`

**Section title:**
> The mark for agent commerce.

**Section subhead:**
> A contract is "Protected by Internet Court" because it was deployed by the Internet Court factory, uses an Accredited Adjudicator, has a defined dispute path, and writes its verdict back into public reputation. The seal is a rollup of trust across the whole stack — not a stamp on one layer.

**Body.** A simple side-by-side:

- **Left:** the seal artifact, ~240px square (placeholder shield until final), with a "Light / Dark" toggle.
- **Right:** a one-line embed snippet (HTML), with a "Copy" button — same terminal-box visual language. Caption underneath: *"Verifies the contract address derives from an Internet Court factory deployment, on every page load."*

**CTA below:**
- Primary: **See what the seal certifies →** `/seal`
- Secondary: **How to embed →** `/docs#seal`

---

#### Section 6 · Partner stack (compact)

**Component:** `C-11 Partner grid` (compact homepage variant — 3 layers visible by default, "Show all 7 layers" expander).

**Section title:**
> Logos on the wall.

**Section subhead:**
> Partners on each layer of the stack. Adjudicator partners earn the seal. Contract-side and payment-side partners integrate the standard.

**Default visible rows (compact):**
- L3 Contracts: Arkhai (active), ERC-8183, MergeProof (in conversation)
- L4 Payment & escrow: x402, MPP, APP, Hopscotch (in conversation)
- L6 Adjudicators (IC-red label): Deterministic, GenLayer, Kleros (in conversation), UMA, Pledo, Saluma, ADR (planned)

**Expander reveals:**
- L1 Identity: ERC-8004, Proven (in conversation)
- L2 Negotiation: A2A
- L5 Execution: *the agents themselves*
- L7 Enforcement: dashed *vacant* row

**Notes.**
- Partner status badges: `Active` (filled green muted), `In conversation` (lavender outline), `Planned` (muted outline).
- Logos at consistent 32px height. Greyscale at rest, color on hover (where the partner allows it).
- See [§5 Content style](#5-content-style) — *Vocabulary* for the canonical spelling of every partner name.

---

#### Section 7 · CTA band

A wide horizontal band before the footer — split-CTA into the two pillars + the dev surface.

**Recipe.**
- Container `bg-[#f7f7f7] rounded-2xl p-12 max-w-6xl mx-auto`
- Three columns on desktop, stacked on mobile.
  - **Build on the standard.** → `/docs` (primary IC red)
  - **Embed the seal.** → `/docs#seal` (secondary outline)
  - **Apply to be an Accredited Adjudicator.** → `mailto:adjudicators@internetcourt.org` (tertiary inline)

**Title above:**
> One spec. One seal. The keystone of the agent stack.

---

#### Section 8 · Recent verdicts

**Component:** `C-15 Recent Cases` (renamed to "Recent verdicts" on the page label — open question).

Three cards, each tagged with the deciding **Adjudicator**, the **bundle** the contract was deployed from, and the verdict.

**Section title:**
> Recent verdicts.

**Section subhead:**
> Live cases on the network.

**CTAs at the bottom:**
- Outline: **View all verdicts** → `/cases`
- Filled IC red: **Create contract** → `/create`

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- Section ordering above.
- The hero's three locked lines (eyebrow, title, subhead).
- The 7-layer diagram content (per memory).
- The two-pillar split copy framing.
- The CTA hierarchy (Read the spec / See the seal).
- "Recent verdicts" cards each show Adjudicator + bundle (new content vs live site).

**Open.**
- Hero scene video — re-shoot vs reuse `scene-1.mp4`?
- "Recent Cases" vs "Recent verdicts" section label?
- Audience-toggle labels — "For builders / For app makers" or other phrasing?
- Whether the seal preview shows a real embeddable seal at v2 launch or a placeholder.
- Compact partner-grid first-row order.

All open items live in [§8.2 Open questions](#82-open-questions).

---

### 6.2 Standard `/standard`

The architecture pillar. The page you send a protocol/infra builder to when they say *"okay, but how does it actually work."*

#### Page job

Convince a technically-minded reader that the architecture holds up. Cover: why L6, the three-layer interface architecture, the factory + bundle pattern, the case lifecycle in full, the schemas in outline, the scope boundary, and the partner integration angle.

#### Audience priority

1. Protocol / infra builders (primary)
2. Adjudicator partners (secondary)
3. Press / press-adjacent technical writers (tertiary)

#### Hero (dark variant)

**Component:** `C-02 Hero (dark)` + `C-10 CTA pair`.

**Eyebrow:** `THE STANDARD`

**Title** (with italic-serif lavender on `the missing layer`):
> The open standard for *the missing layer.*

**Subhead:**
> An open, EAS-inspired specification for adjudicating disputes between agents. Multi-chain. Schema-driven. Permissionless registration. Contract-side and Adjudicator-side interfaces are first-class peers.

**CTA pair:**
- Primary: **See the docs** → `/docs`
- Secondary: **View on GitHub** → `https://github.com/internetcourt`

---

#### Section order

1. Hero
2. Why L6 is the keystone (five reasons)
3. The 7-layer stack (anchored, full content)
4. The three-layer interface architecture
5. The factory + bundle pattern
6. The case lifecycle, end-to-end
7. Adjudicators (overview, deep dive on `/adjudicators`)
8. Schemas (outline)
9. Scope (what IC does and doesn't adjudicate)
10. Partner integration angles (by layer)
11. CTA band

---

#### Section 2 · Why L6 is the keystone

**Anchor:** `#why-l6`

**Title:**
> Five reasons L6 is the keystone.

Numbered list, IC-red number squares (carry-over of the live site's number-chip pattern):

1. **L1 reputation is empty without L6 verdicts.** Reputation in the agent economy is just a record of past adjudications. Without a verdict log, there's nothing to read.
2. **L2 negotiation degrades without L6 fallback.** Agents over-collateralize or refuse meaningful contract values when there's no recourse for breach.
3. **L3 contracts are toothless without L6.** A contract whose breach has no remedy is a memo.
4. **L4 escrow needs L6 to release.** Milestone-based escrow only works if a neutral party can determine whether the milestone was met. The release itself is part of L6, executed by the protocol.
5. **L7 enforcement layers on top of L6.** Even when on-chain consequence is not enough — cross-border disputes, regulated counterparties, off-chain assets, legal-system involvement — L6 verdicts are the input the legal process works from. *Bitcoin transactions are irreversible, but a court can still compel a refund.* Without an L6 verdict, the court has no agreed input.

**Pull-quote callout below:** Italic-serif lavender on dark or IC-red on light:

> *The missing layer. Nothing above it works without it.*

---

#### Section 3 · The 7-layer stack (full content)

**Anchor:** `#7-layer-stack`

**Component:** `C-06 7-layer diagram` — the full interactive version. Tap a layer to reveal its inhabitants, the integration angle, and the partners.

**Title:**
> The 7-layer agent transaction stack.

**Subhead:**
> Top-to-bottom is chronological. Every agent-to-agent transaction flows through these layers. Internet Court owns L6.

After the diagram, a paragraph for each layer in turn — the prose carry-over from `Internet Court — Strategy & Narrative v4.md → Part 1, Pillar 1`. One paragraph per layer; on mobile, this becomes an accordion under the diagram.

**Locked content per layer** (matches memory `project_internet_court_layer_stack.md`):

- **L1 — Discovery, identity & reputation.** ERC-8004. Filled. Verdicts feed back into L1 as precedent — reputation is a side-effect of adjudication, not a primary action.
- **L2 — Negotiation.** A2A (Google's agent-to-agent protocol). Filled.
- **L3 — Contracts.** Arkhai. ERC-8183 (emerging — lavender chip). Filled.
- **L4 — Payment & escrow.** x402 (Coinbase). MPP (Stripe). Filled. Protocols only — Stripe and Circle are not on this list because they're companies, not protocols.
- **L5 — Execution.** *The agents themselves.* Filled, italic, no logos. L5 is domain-specific, not infrastructure.
- **L6 — Verification, adjudication & disputes.** **Internet Court.** The keystone.
- **L7 — Enforcement.** Vacant. Sets up the next territory: real-world enforcement. Where on-chain consequence is not the whole answer (cross-border, regulated counterparties, off-chain assets), L7 bridges to traditional ADR and legal compulsion.

---

#### Section 4 · The three-layer interface architecture

**Anchor:** `#interface-architecture`

**Title:**
> Two integration surfaces. Three interface layers.

**Subhead:**
> Adjudication has two distinct integration surfaces — the parties bringing contracts, and the systems making decisions. Internet Court has more interface complexity than EAS as a result.

**Diagram** (locked from v4 narrative, top-to-bottom flow):

```
                   Parties' contracts
                          ↓
                ┌──────────────────────┐
                │  Contract-side       │  parties' contracts plug in here
                │  interfaces          │
                └──────────────────────┘
                          ↓
                ┌──────────────────────┐
                │  Adjudicator         │  middleware: orchestrate cases,
                │  contracts           │  route to Adjudicator types
                └──────────────────────┘
                          ↓
                ┌──────────────────────┐
                │  Adjudicator-side    │  Adjudicator types plug in here:
                │  interfaces          │  Deterministic, GenLayer, UMA,
                │                      │  Kleros, ADR
                └──────────────────────┘
                          ↓
                  Adjudicator implementations
```

**Body paragraph:**
> EAS is the inspiration for the openness properties: multi-chain, schema-driven, permissionless schema registration, no central operator. The middleware layer — the Adjudicator contracts that orchestrate cases between contract-side and Adjudicator-side — is what's specific to Internet Court.

**Three sub-headers** describing each interface in one paragraph each:

- **Contract-side interface.** What an L3 contract template implements to plug into Internet Court. Defines the Statement, the Guidelines, the evidence intake shape, and the verdict execution callback.
- **Adjudicator contracts (middleware).** Orchestrate the case lifecycle: receive the dispute, route to the right Adjudicator type (or escalation tier), finalize the verdict, write to the public log, trigger the on-chain consequence.
- **Adjudicator-side interface.** What an Adjudicator implementation provides to plug into Internet Court. Standard for Deterministic, GenLayer, UMA, Pledo, Saluma, Kleros, ADR — all peers, none privileged in the spec.

**Tertiary link:** **The interfaces in detail →** `/docs#contract-interface`

---

#### Section 5 · The factory + bundle pattern

**Anchor:** `#bundle-pattern`

**Title:**
> Verification by construction.

**Subhead:**
> Internet Court is a contract factory. The unit of deployment — and the unit of certification — is the **bundle**.

**Body.**

A bundle is a pre-vetted unit of three linked components:

1. **Contract template.** The L3 logic the parties agree to (SLA, escrow, benchmark-delivery, uptime, content-delivery, etc.).
2. **Adjudication contract.** The middleware that orchestrates dispute resolution for that template.
3. **Adjudicator(s).** The decision-making system the adjudication contract routes to.

**The implication, in two cards.**

- **Real.** A "Protected by Internet Court" contract is one whose address provably derives from an Internet Court factory deployment, on-chain, verifiable by any client. By construction, this means its adjudication contract is vetted and its Adjudicator(s) are vetted, because they were deployed as a bundle.
- **Fake.** Somebody put up the seal logo without an actual factory-deployed contract underneath. A client check rejects it instantly.

**The HTTPS analogy:**
> The HTTPS lock icon doesn't mean "the site put up a lock icon." It means "your browser verified the certificate chain." The Internet Court factory is the certificate chain. Verification is structural, not reputational. **One on-chain check covers the whole stack.**

**A note on accreditation.**

> The factory's bundle catalog *is* the accreditation registry. To accredit a new Adjudicator, the Foundation publishes new bundles that include it. To revoke, the Foundation removes bundles from the catalog (and may retroactively flag existing deployments via the revocation lifecycle). The unit of accreditation is the bundle, not its components in isolation.

**Tertiary link:** **The seal program criteria →** `/seal#program`

---

#### Section 6 · The case lifecycle, end-to-end

**Anchor:** `#case-lifecycle`

**Component:** `C-08 Case lifecycle row` — full version (all 4 rows + dispute callout + verdict).

**Title:**
> How a case works, end-to-end.

**Subhead:**
> Most contract executions don't generate disputes. Parties agree, deterministic conditions trigger release, the contract closes. Adjudication only runs when one party disputes.

**Walkthrough rows** (carry forward live-site content; replace "AI validators" with "Adjudicators" in the Verdict row):

1. **Statement.** The claim to evaluate. Clear, specific, evaluable.
2. **Guidelines & Evidence.** The evaluation rubric and what each side can submit.
3. *(Dispute callout opens, IC-red bordered.)* **Evidence Submission.** Each side submits within the pre-defined constraints.
4. **Verdict.** Adjudicators independently evaluate the evidence and reach consensus.

**Below the lifecycle, a structured-verdict note:**

> The verdict is not always binary. **True / False / Undetermined** is the default. The Statement and Guidelines can also define a structured outcome shape: pay a percentage, apply a penalty, release a partial amount, refund with a deduction. Templates define inputs and outputs.

**Below that, the escalation note:**

> When a verdict is **Undetermined**, the bundle decides what happens next. If the bundle includes an escalation tier, the case escalates — typically deterministic → AI/GenLayer → human jury (Kleros) → ADR. If the bundle has no escalation, the contract either lives with Undetermined as its final state or applies a default resolution that the Statement defined up front.

**Below that, the public-log note:**

> This iteration is fully on-chain and public. All cases, evidence, verdicts, and the resulting reputation entries are public on-chain. No private cases in v0.1. Encrypted-evidence paths for B2B and medical use cases are a future extension.

---

#### Section 7 · Adjudicators (overview)

**Anchor:** `#adjudicators-overview`

**Title:**
> Adjudicators are first-class peers in the spec.

**Body, three short paragraphs:**

- **Why peers.** Deterministic, GenLayer, UMA, Pledo, Saluma, Kleros, and ADR are all defined in the Adjudicator-side interface with equal documentation depth. There is no "default tier" labeling in the spec itself. The bundle determines which tiers a given case can use.
- **What ships in v0.1.** Deterministic and GenLayer Adjudicators are implemented and shipped in Arkhai's existing v0.1 deployment. Cases that need no AI never touch a non-deterministic Adjudicator.
- **What comes next.** Kleros is the first non-GenLayer Accredited Adjudicator post-v0.1. UMA, Pledo, and Saluma follow as optimistic-tier Accredited Adjudicators. ADR is the off-chain ceiling.

**Cross-link:** **All Adjudicator types →** `/adjudicators`

---

#### Section 8 · Schemas (outline)

**Anchor:** `#schemas`

**Title:**
> Schemas, in outline.

**Subhead:**
> Internet Court is schema-driven. Permissionless schema registration is supported. Below are the v0.1 schemas — full type definitions live in the docs.

A small table of the v0.1 schemas, name + one-line purpose, each linking into `/docs#schemas`.

| Schema | Purpose |
|---|---|
| `Statement` | The claim to evaluate. Inputs/outputs, evaluable form. |
| `Guidelines` | The evaluation rubric. How an Adjudicator decides. |
| `EvidencePacket` | Typed evidence submission with format/limit constraints. |
| `Verdict` | Outcome shape. Binary or structured. |
| `Bundle` | Contract template + adjudication contract + Adjudicator(s). |
| `AdjudicatorProfile` | Adjudicator-side metadata: kind, properties, accreditation status. |

**CTA:** **Full schemas →** `/docs#schemas`

---

#### Section 9 · Scope

**Anchor:** `#scope`

**Title:**
> What Internet Court adjudicates.

**Subhead:**
> Internet Court adjudicates statements that resolve via on-chain or off-chain attestations. Statements that cannot be resolved through attestation are out of scope.

**Two-column block: in scope / out of scope.**

| In scope (with attestation) | Out of scope (no attestation path) |
|---|---|
| SLA met / not met | Subjective taste judgments (without rubric) |
| Data authenticity (real vs synthetic) | Disputes requiring discovery beyond submitted evidence |
| Benchmark delivery against an agreed test set | Cases needing testimony or cross-examination |
| On-time delivery against an escrow deadline | Disputes requiring expert witnesses (use ADR L7) |
| Uptime against a 99.9% SLA | Disputes about the spec itself (governance, not adjudication) |

---

#### Section 10 · Partner integration angles (by layer)

**Anchor:** `#integration-angles`

**Component:** `C-11 Partner grid` (full version) + a layer-by-layer cheat sheet.

**Title:**
> How partners integrate.

A small table per layer:

| Layer | Targets | Integration angle |
|---|---|---|
| L1 Identity | ERC-8004, Proven | Verdict-as-reputation-event |
| L2 Negotiation | A2A (Google) | Embed dispute clause in negotiation |
| L3 Contracts | Arkhai (live), ERC-8183, MergeProof | Contracts factory-deployed earn the seal |
| L4 Payment & escrow | x402, MPP, APP, Hopscotch, Uptime | Escrow release on certified verdict |
| L5 Execution / agent ecosystems | Virtuals, AntSeed, Rally, Kelors | Default Internet Court clause in agent SDK |
| L6 Adjudicator partners | Kleros, UMA, Pledo, Saluma, Futarchy.fi | Become Accredited Adjudicators |
| L6 case sources (users) | RentAHuman and similar | Bring contracts and disputes; integrate on the contract-creation side |
| L7 Enforcement (later) | Custodians, DAOs, clearinghouses, ADR providers, legal partners | Verdict export, real-world enforcement |
| Institutional | Ethereum Foundation | Public-goods grant, seal program credibility |

---

#### Section 11 · CTA band

Three-column band, same recipe as the home CTA band:

- **Read the docs.** → `/docs` (primary IC red)
- **Apply to be an Accredited Adjudicator.** → `mailto:adjudicators@internetcourt.org` (secondary outline)
- **Embed the seal.** → `/docs#seal` (tertiary inline)

**Title above:**
> One spec. One seal. The keystone of the agent stack.

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- Section ordering above.
- The five-reasons-L6-is-the-keystone list (verbatim from v4 narrative).
- The HTTPS analogy.
- The verdict triple (True / False / Undetermined) with structured-outcome extension.
- All public, on-chain at v0.1.
- The L7 vacancy framing.

**Open.**
- Whether the schemas table on this page is replaced with a more detailed code-blockified preview (vs strictly summary + cross-link to docs).
- Whether the in-scope / out-of-scope table moves to `/docs` instead of `/standard`.

---

### 6.3 Seal `/seal`

The trust-mark pillar. The page you send a non-developer to when they want to know what *"Protected by Internet Court"* means.

#### Page job

Make the seal legible as a recognizable trust mark. Establish the FDIC / UL / HTTPS analogy. Explain what the seal certifies (rollup of trust across the stack), how it's earned, how it's verified, and how it can be embedded.

#### Audience priority

1. App / contract builders (primary)
2. End users / founders (secondary)
3. Adjudicator partners (tertiary)

#### Hero (light variant)

**Component:** `C-02 Hero (light)`.

**Eyebrow:** `THE SEAL`

**Title** (with IC-red accent on `Protected by Internet Court`):
> *Protected by Internet Court.*

**Subhead:**
> The mark for agent commerce. FDIC for banks. UL for electronics. HTTPS for the web. **Internet Court for agent contracts.**

**Hero visual:** the seal artifact, large (~360px square), centered, with a Light/Dark toggle. Placeholder shield until the final design lands.

**CTA pair:**
- Primary: **Embed the seal** → `/docs#seal`
- Secondary: **See the spec** → `/standard`

---

#### Section order

1. Hero
2. What the seal means
3. The four conditions
4. Verification by construction (the HTTPS analogy)
5. The seal program — accreditation, audit model, cost
6. Revocation lifecycle
7. Embed the seal (preview + snippet)
8. CTA band

---

#### Section 2 · What the seal means

**Anchor:** `#what-it-means`

**Title:**
> The seal is not a stamp on one layer. It wraps the stack.

**Body, prose paragraph:**

> *"Protected by Internet Court"* is a recognizable visual trust signal that compresses underlying complexity — audited contracts, accredited Adjudicators, defined dispute path — into a single mark that everyone learns to look for. Like FDIC, UL, USDA Organic, the HTTPS lock. When you see the mark, you don't need to know the spec; you know the spec was followed.

**Pull-quote callout:**

> *FDIC for banks. UL for electronics. USDA Organic for food. HTTPS for the web. Internet Court for agent commerce.*

---

#### Section 3 · The four conditions

**Anchor:** `#conditions`

**Title:**
> What "Protected by Internet Court" requires.

**Subhead:**
> Four conditions, all of which a factory-deployed bundle satisfies by construction. The seal is a rollup across these four — verifiable by a single on-chain check.

**Numbered card grid (4 cards, 2×2 on desktop, stacked on mobile):**

1. **Factory-deployed contract.** The L3 contract was deployed by the Internet Court factory. It's an audited template, conformant to Internet Court schemas. Verification is by construction; you can't fake the address provenance.
2. **Accredited Adjudicator(s).** The Adjudicator on the case has been accredited by the Foundation, conformant to the spec, in good standing.
3. **Defined dispute path.** The escrow has a defined dispute path that triggers a verdict if needed. No ad-hoc fallback.
4. **Verdict written to the public record.** The on-chain consequence (escrow release, reputation slash, verdict log entry) executes as part of the L6 protocol — not as an arbitrary action by any party.

**Below the grid, a single sentence:**

> When someone displays "Protected by Internet Court," they aren't vouching for one layer. They're attesting that the entire transaction lifecycle, from contract creation through verdict to reputation record, is inside Internet Court's trust envelope.

---

#### Section 4 · Verification by construction

**Anchor:** `#verification`

**Title:**
> Verification is structural, not reputational.

**Subhead:**
> One on-chain check covers the whole stack. Like the HTTPS lock, only here the certificate chain is the Internet Court factory.

**Two cards, side-by-side:**

- **Real.** A "Protected by Internet Court" contract is one whose address provably derives from an Internet Court factory deployment. Any client can check this on-chain. By construction, the adjudication contract is vetted and the Adjudicator(s) are vetted, because they were deployed as a bundle.
- **Fake.** Somebody put up the seal logo without an actual factory-deployed contract underneath. The client check rejects it instantly.

**Explanatory paragraph, italic-serif lavender pull-quote inline:**

> The HTTPS lock icon doesn't mean "the site put up a lock icon." It means *"your browser verified the certificate chain."* The Internet Court factory is the certificate chain. **Verification is structural, not reputational.**

**Tertiary link:** **The factory + bundle pattern in detail →** `/standard#bundle-pattern`

---

#### Section 5 · The seal program

**Anchor:** `#program`

**Title:**
> Two seal applications. One mark.

**Subhead:**
> The same mark covers both contract certification and Adjudicator accreditation. Both are verified together via the factory, since the bundle is the unit of certification.

**Two cards:**

- **Certified Contract.** Applied to an L3 contract template that appears in one or more published bundles in the factory. When the factory deploys an instance of that template, the deployed contract is "Protected by Internet Court."
- **Accredited Adjudicator.** Applied to an Adjudicator type that appears in one or more published bundles. The Adjudicator must conform to the Adjudicator-side interface and be in good standing.

**Below the cards, a small table on audit / cost / token / curation:**

| Aspect | v0.1 |
|---|---|
| Audit model | Foundation audits directly. Independent auditors via accreditation (PCI-DSS / QSA pattern) remain possible later if and when the program needs to scale. |
| Cost | Certification is **free** at v0.1. Donation- and grant-funded. |
| Token | **No token.** Verdict fees are stablecoin-denominated. |
| Catalog curation | The Foundation curates the v0.1 bundle catalog directly. Criteria for adding bundles are Foundation-determined for now; opening the curation process is a future question. |
| Tiers | One seal type. No Bronze/Silver/Gold tiers planned. |

---

#### Section 6 · Revocation

**Anchor:** `#revocation`

**Title:**
> Without revocation, the seal is one-time and meaningless.

**Body:**
> A previously-certified contract found exploitable, or an Adjudicator whose track record degrades, gets a public revocation. **Public challenge process. Rolling re-accreditation. On-chain registry shows current status.**

**Three small step-cards** (numbered, IC red):

1. **Surface.** Concerns about a Certified Contract or Accredited Adjudicator are raised publicly — by users, partners, or the Foundation itself.
2. **Challenge.** A public challenge process runs: evidence is reviewed, the affected party responds, the Foundation rules.
3. **Resolve.** The on-chain registry updates. Either the seal status holds (with the public ruling on record) or it's revoked, and existing factory deployments are flagged via the revocation lifecycle.

**Below:**
> **Public on-chain registry.** Current status of every Certified Contract template and Accredited Adjudicator is visible on-chain at any time.

---

#### Section 7 · Embed the seal

**Component:** `C-13 Seal embed preview` (full version).

**Anchor:** `#embed`

**Title:**
> Embed the seal.

**Subhead:**
> One line of HTML. Verifies on every page load. Works on any chain Internet Court is deployed on.

**Body, two-column layout:**

- **Left:** the seal artifact (large), with a Light/Dark toggle.
- **Right:** code box with three tabs (`HTML` / `React` / `Vue`). HTML default snippet:

```html
<a href="https://internetcourt.org/verify/<contract-address>"
   class="ic-seal" data-ic-contract="0x...">
  <img src="https://internetcourt.org/seal.svg"
       alt="Protected by Internet Court" />
</a>
```

**Caption:** *"Verifies the contract address derives from an Internet Court factory deployment, on every page load."*

**Below, a small "What the verify URL shows" preview** — one screenshot or static block of the `/verify/<contract>` page (this lives behind the seal — it's the public proof page that opens when someone clicks the seal). Items shown there:

- The bundle the contract was deployed from.
- The Adjudicator(s) in the bundle, with accreditation status.
- The Adjudication contract address.
- The current registry status (Active / Revoked).
- A list of cases this contract has been in, if any.

---

#### Section 8 · CTA band

Three-column band:

- **Embed the seal.** → `/docs#seal` (primary IC red)
- **Read the spec.** → `/standard` (secondary outline)
- **Apply to be an Accredited Adjudicator.** → `mailto:adjudicators@internetcourt.org` (tertiary inline)

**Title above:**
> The mark for agent commerce.

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- The four conditions (matches v4 narrative § Pillar 2).
- Foundation-direct audit model at v0.1; tier-less single mark; no token.
- Free certification at v0.1; donation- and grant-funded.
- Public challenge process and on-chain registry for revocation.
- The seal works on any chain Internet Court is deployed on.

**Open.**
- The actual seal artifact (shape, mark, embedding spec, cryptographic verification metadata) — see appendices.
- Whether the `/verify/<contract>` page exists at v2 launch or ships later.
- Whether the embed snippet's `data-ic-contract` attribute or a different approach is the canonical embedding.
- Whether to ship a "How to apply for the seal" form on this page (vs `mailto:` only).

---

### 6.4 Adjudicators `/adjudicators`

The page that turns Adjudicator partners into Accredited Adjudicators. It also serves the protocol/infra builder who wants to know what "the AI tier" or "the human-jury tier" actually means.

#### Page job

Explain Adjudicator types, the Accredited Adjudicator program, escalation tiers, and how a partner becomes one. Treat all Adjudicator types as first-class peers — no privileged tier in the spec.

#### Audience priority

1. Adjudicator partners (Kleros, UMA, Pledo, Saluma, ADR providers, Futarchy.fi) (primary)
2. Protocol/infra builders curious about the AI tier (secondary)
3. Press / press-adjacent technical writers (tertiary)

#### Hero (light variant)

**Component:** `C-02 Hero (light)`.

**Eyebrow:** `LAYER 6 · ADJUDICATORS`

**Title** (with IC-red accent on `first-class peers`):
> Adjudicators are *first-class peers* in the spec.

**Subhead:**
> Deterministic, AI/on-chain, optimistic, human-jury, and ADR — every kind of decision-making system has a place in Internet Court. The bundle decides which tiers a given case can use.

**Hero visual:** a tier-row diagram showing Deterministic → GenLayer → UMA → Kleros → ADR as escalating tiers, with arrows. Each tier has its category label.

**CTA pair:**
- Primary: **Apply to be an Accredited Adjudicator** → `mailto:adjudicators@internetcourt.org`
- Secondary: **Read the standard** → `/standard`

---

#### Section order

1. Hero
2. What an Adjudicator is
3. The five Adjudicator categories
4. The Adjudicator catalog (cards, one per Accredited Adjudicator)
5. The Accredited Adjudicator program — how to become one
6. Escalation tiers — how cases move between Adjudicators
7. CTA band

---

#### Section 2 · What an Adjudicator is

**Anchor:** `#what-is`

**Title:**
> An Adjudicator decides cases.

**Body, three short paragraphs:**

- **Definition.** An Adjudicator is a system that takes a Statement, Guidelines, and submitted Evidence, and returns a Verdict. The system can be a deterministic check, an AI validator network, an optimistic oracle, a human jury, or an ADR provider.
- **Spec position.** Every Adjudicator implements the Adjudicator-side interface (`/standard#interface-architecture`). Every Adjudicator is documented in the spec at equal depth. There is no "default tier" labeling.
- **What's accredited.** Internet Court accredits Adjudicators via the bundle catalog. To accredit a new Adjudicator, the Foundation publishes new bundles that include it. To revoke, the Foundation removes bundles from the catalog and may flag existing deployments via the revocation lifecycle.

---

#### Section 3 · The five categories

**Anchor:** `#categories`

**Title:**
> Five categories of Adjudicator.

A horizontal scrolling row of five category cards on mobile, 5-column grid on desktop. Each card: category name, one-sentence description, examples.

| Category | What it is | Examples |
|---|---|---|
| **Deterministic** | Resolves via deterministic logic — timestamp comparison, on-chain state check, signature verification, hash match, numeric threshold. No AI. | Internet Court Deterministic v0.1 |
| **AI / on-chain** | AI Adjudicator running on a permissionless validator network. Machine-speed, trustless. Currently the only on-chain trustless AI option. | GenLayer |
| **Optimistic** | Proposes a verdict; opens a challenge window; finalizes if uncontested. Higher-stakes, longer windows. | UMA, Pledo, Saluma |
| **Human jury (on-chain)** | Selected human jurors review the case and vote. On-chain coordination, real human judgment. | Kleros |
| **ADR / off-chain** | Traditional Alternative Dispute Resolution providers and arbitration networks. Off-chain ceiling. | (see § L7) |

---

#### Section 4 · The Adjudicator catalog

**Anchor:** `#catalog`

**Component:** `C-12 Adjudicator card` — one per Adjudicator.

**Title:**
> The Adjudicator catalog.

**Subhead:**
> Adjudicators currently in the spec, in conversation, or planned. Status is on-chain — see the public registry.

**Cards** (one per Adjudicator, in priority order):

##### Deterministic
- Category: Deterministic
- Status: **Accredited (active)** · IC-red badge
- Blurb: Adjudicates statements that resolve via deterministic logic. Cases that need no AI never touch a non-deterministic Adjudicator.
- Properties: `On-chain` · `Trustless` · `Speed: machine`
- Implementation: ships in v0.1 on Arkhai's existing repo.

##### GenLayer
- Category: AI / on-chain
- Status: **Accredited (active)** · IC-red badge
- Blurb: AI on-chain. Machine-speed. Trustless. Currently the only on-chain trustless AI Adjudicator that exists. Permissionless validator network — anyone can run a validator. GenLayer requires a contract per use case, one adjudication contract for each scenario.
- Properties: `On-chain` · `AI` · `Trustless` · `Permissionless validator network` · `Speed: machine`
- Implementation: live in v0.1.

##### Kleros
- Category: Human jury (on-chain)
- Status: **In conversation** · lavender badge (target: first non-GenLayer Accredited Adjudicator post-v0.1)
- Blurb: Human jury, on-chain. First non-GenLayer Accredited Adjudicator target post-v0.1.
- Properties: `On-chain` · `Human jury` · `Speed: ~days`

##### UMA
- Category: Optimistic
- Status: **In conversation** · lavender badge
- Blurb: Optimistic oracle. Proposes a verdict; opens a challenge window; finalizes if uncontested. Higher-stakes cases, longer challenge windows.
- Properties: `On-chain` · `Optimistic` · `Speed: ~hours to days`

##### Pledo
- Category: Optimistic
- Status: **In conversation** · lavender badge
- Properties: `Optimistic` · escalation-tier candidate

##### Saluma
- Category: Optimistic
- Status: **In conversation** · lavender badge
- Properties: `Optimistic` · escalation-tier candidate

##### Futarchy.fi
- Category: Optimistic / market-driven
- Status: **In conversation** · lavender badge
- Properties: `Market-driven verdict resolution`

##### Traditional ADR (placeholder)
- Category: ADR / off-chain
- Status: **Planned** · muted badge
- Blurb: Off-chain ceiling. Used when on-chain consequence is not enough — cross-border disputes, regulated counterparties, off-chain assets.
- Properties: `Off-chain` · `Human` · `Speed: ~weeks`

---

#### Section 5 · The Accredited Adjudicator program

**Anchor:** `#program`

**Title:**
> Partners earn the seal.

**Subhead:**
> Adjudicators don't co-author the spec. Adjudicators come to v0.1 and earn the seal through accreditation.

**Body, four steps in a numbered grid (IC-red number squares):**

1. **Conform.** Implement the Adjudicator-side interface (`/standard#interface-architecture`). The interface is open; nothing proprietary required.
2. **Apply.** Email `adjudicators@internetcourt.org` with a brief on the Adjudicator's category, current track record, and the bundles you'd like to appear in.
3. **Bundle.** The Foundation publishes one or more bundles that include your Adjudicator. The bundle is the unit of accreditation.
4. **Operate.** You're an Accredited Adjudicator. Cases route to you through the bundles you appear in. Track record accretes. Re-accreditation is rolling.

**Below, a brief on what we look for:**

> **What gets evaluated:** category fit (does this Adjudicator type extend or duplicate what's already in the catalog?), interface conformance, public track record, governance posture, response to revocation/challenge.

**Tertiary link:** **The seal program criteria →** `/seal#program`

---

#### Section 6 · Escalation tiers

**Anchor:** `#escalation`

**Title:**
> Cases move between Adjudicators.

**Subhead:**
> Cases start at the appropriate base tier (Deterministic if the logic supports it, GenLayer otherwise) and escalate up if contested. Each tier conforms to the same Adjudicator-side interface.

**Body, an escalation diagram** (vertical, top-to-bottom):

```
Deterministic   ─── verdict if conditions are checkable purely on-chain ───┐
                                                                            │
                                                                            ▼
GenLayer (AI/on-chain)   ─── verdict if AI evaluation suffices ───────────┐│
                                                                          ││
                                                                          ▼▼
Optimistic (UMA / Pledo / Saluma)   ─── verdict on optimistic challenge ─┐ │
                                                                         │ │
                                                                         ▼ ▼
Kleros (human jury, on-chain)   ─── verdict by selected jurors ─────────┐│
                                                                        ││
                                                                        ▼▼
ADR (off-chain)   ─── final, off-chain, real-world enforcement ────────
```

**Below the diagram, a paragraph on Undetermined:**

> When a verdict is **Undetermined**, the bundle decides what happens next. If the bundle includes an escalation tier, the case escalates. If the bundle has no escalation, the contract either lives with Undetermined as its final state or applies a default resolution that the Statement defined up front.

**Tertiary link:** **The case lifecycle in detail →** `/standard#case-lifecycle`

---

#### Section 7 · CTA band

Three-column:

- **Apply to be an Accredited Adjudicator.** → `mailto:adjudicators@internetcourt.org` (primary IC red)
- **Read the standard.** → `/standard` (secondary outline)
- **See the seal.** → `/seal` (tertiary inline)

**Title above:**
> First-class peers in the spec from day one.

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- All Adjudicator categories are first-class peers; no privileged tier in the spec.
- Bundle is the unit of accreditation.
- Deterministic + GenLayer ship in v0.1; Kleros is the first non-GenLayer post-v0.1 target.
- Foundation-direct accreditation at v0.1.
- Permissionless validator framing for GenLayer (see `Internet Court — Strategy & Narrative v4.md` § Annex on credible neutrality).

**Open.**
- The full Adjudicator card list — partners we have but haven't fully scoped yet (Futarchy.fi etc.).
- Whether the application path is `mailto:` at v2 launch or a structured form.
- Whether to publish a list of "categories we'd like to fill" for Adjudicator types not yet represented (e.g. domain-specific Adjudicators).

---

### 6.5 Docs `/docs`

The developer surface. The page that turns a "this looks interesting" into "I can build with this."

This spec is for the **front page of the docs**. The full docs site (per-method API references, advanced guides, examples) eventually lives at `docs.internetcourt.org` or as a sub-section here. The job for v2 launch is to make `/docs` real enough that a builder believes the spec is real.

#### Page job

Give a builder enough surface area to start integrating. Cover: quickstart, the three interfaces (contract-side, Adjudicator middleware, Adjudicator-side), the bundle catalog, the schemas, the seal embedding, and a clear path to GitHub.

#### Audience priority

1. Builders / integrators (primary)
2. Adjudicator implementors (secondary)
3. Press / press-adjacent technical writers (tertiary)

#### Hero (light variant)

**Component:** `C-02 Hero (light)` + `C-03 Audience toggle` + `C-04 Terminal box`.

**Eyebrow:** `BUILD ON THE STANDARD`

**Title** (with IC-red on `Internet Court`):
> Build on *Internet Court*.

**Subhead:**
> Open spec. Multi-chain. Schema-driven. The contract-side and Adjudicator-side interfaces are the front door — pick the side you're integrating from.

**Audience toggle (C-03):**
- **Contract-side** (file-text icon, default) — for integrators bringing contracts and disputes.
- **Adjudicator-side** (scale icon) — for decision-making systems plugging in.

**Terminal box** below toggle, content swaps with the toggle:
- Contract-side: `npm install @internetcourt/sdk`
- Adjudicator-side: `git clone https://github.com/internetcourt/adjudicator-template`

**CTA pair:**
- Primary: **View on GitHub** → `https://github.com/internetcourt`
- Secondary: **Read the standard** → `/standard`

---

#### Section order

1. Hero
2. Quickstart (contract-side)
3. Quickstart (Adjudicator-side)
4. The factory: deploy a bundle
5. Contract-side interface (reference)
6. Adjudicator-side interface (reference)
7. Schemas (reference)
8. Embed the seal
9. Bundle catalog (preview)
10. Reference & resources

---

#### Section 2 · Quickstart (contract-side)

**Anchor:** `#quickstart-contract`

**Title:**
> Quickstart — contract-side.

**Subhead:**
> Deploy an Internet Court bundle, raise a dispute, get a verdict, see the on-chain consequence execute.

**Steps as code blocks** (carry-over of the live site's numbered-step pattern + terminal-box pattern):

1. **Install.**
   ```bash
   npm install @internetcourt/sdk
   ```
2. **Pick a bundle.** Browse the catalog at `/docs#catalog` or programmatically:
   ```ts
   import { catalog } from "@internetcourt/sdk";
   const slaWithGenLayer = await catalog.get("sla.v1.with-genlayer");
   ```
3. **Deploy.** The factory deploys the contract template, the adjudication contract, and links the Adjudicator(s) — all as one bundle.
   ```ts
   const deployment = await factory.deploy(slaWithGenLayer, { /* params */ });
   ```
4. **Raise a dispute** (when needed):
   ```ts
   await deployment.contract.dispute({ statement, evidence });
   ```
5. **Wait for the verdict.** The Adjudicator(s) decide. The on-chain consequence (escrow release, reputation entry) executes automatically.
   ```ts
   const verdict = await deployment.contract.verdict();
   ```

**Tertiary link:** **Full SDK reference →** `/docs#contract-interface`

---

#### Section 3 · Quickstart (Adjudicator-side)

**Anchor:** `#quickstart-adjudicator`

**Title:**
> Quickstart — Adjudicator-side.

**Subhead:**
> Implement the Adjudicator-side interface and apply for accreditation.

**Steps:**

1. **Clone the template.**
   ```bash
   git clone https://github.com/internetcourt/adjudicator-template
   ```
2. **Implement the interface.** Required methods: `intake()`, `decide()`, `finalize()`. Optional: `escalate()`, `revoke()`. See `/docs#adjudicator-interface`.
3. **Run the conformance suite.**
   ```bash
   npm run conformance
   ```
4. **Apply for accreditation.** Email `adjudicators@internetcourt.org` with: the Adjudicator's category, the URL of the implementation, the conformance report, and the bundles you'd like to appear in.

**Tertiary link:** **Adjudicator program →** `/adjudicators#program`

---

#### Section 4 · The factory: deploy a bundle

**Anchor:** `#factory`

**Title:**
> The factory deploys bundles.

**Subhead:**
> A bundle is a pre-vetted unit: contract template + adjudication contract + Adjudicator(s). The factory deploys them linked, so verification is structural.

**Body.** A short walkthrough showing the on-chain shape of a bundle deployment, with addresses (placeholder), then a paragraph on:

- Why the factory is the certificate chain (link to `/standard#bundle-pattern`).
- How the same template can appear in multiple bundles with different adjudication paths.
- How the seal verifies "Protected by Internet Court" through the factory address.

**Code preview** (TypeScript, illustrative):

```ts
import { factory } from "@internetcourt/sdk";

const deployment = await factory.deploy({
  bundleId: "sla.v1.with-genlayer-and-kleros",
  params: {
    parties: [partyA, partyB],
    deadline: timestamp("2026-06-01T00:00:00Z"),
    sla: { /* template-specific */ },
    escrow: { token: USDC, amount: 1_000_000n },
  },
});

console.log(deployment.contractAddress);     // 0x...
console.log(deployment.adjudicationAddress); // 0x...
console.log(deployment.adjudicators);        // ["Deterministic", "GenLayer", "Kleros"]
```

---

#### Section 5 · Contract-side interface (reference)

**Anchor:** `#contract-interface`

**Title:**
> Contract-side interface.

**Subhead:**
> What an L3 contract template implements to plug into Internet Court.

**Subsections:**

- **Statement** — the claim to evaluate. Fields: `subject`, `predicate`, `evaluableForm`, `evaluableInputs[]`. Linked to schema reference.
- **Guidelines** — the evaluation rubric. Fields: `rubric`, `evidenceTypes[]`, `formatLimits`.
- **EvidencePacket** — typed evidence intake. Fields: `from`, `kind`, `payload`, `attestations[]`.
- **Verdict callback** — what the contract does when a verdict arrives. Default callbacks: `releaseEscrow`, `slashReputation`, `writeVerdictLog`. Custom callbacks supported via the verdict execution hook.
- **Dispute path** — `dispute()` method, escalation gating.

Each subsection contains a code block (TypeScript types) and a one-paragraph description. Long-form lives in the Standard page; the docs page is the reference shape.

---

#### Section 6 · Adjudicator-side interface (reference)

**Anchor:** `#adjudicator-interface`

**Title:**
> Adjudicator-side interface.

**Subhead:**
> What an Adjudicator implementation provides to plug into Internet Court.

**Subsections:**

- **`intake(case)`** — receive a case (Statement + Guidelines + EvidencePacket).
- **`decide(case)`** — run the Adjudicator's decision process. Returns a `Verdict` or `Undetermined`.
- **`finalize(verdict)`** — finalize the verdict on-chain (write to log, signal escalation if Undetermined and bundle supports it).
- **`escalate?(case)`** — optional. Used when the bundle has an upstream tier and this Adjudicator wants to defer.
- **`revoke?(scope)`** — optional. Adjudicator-side hook for revocation lifecycle (see `/seal#revocation`).

**Conformance.** Every Adjudicator implementation passes a conformance suite (`npm run conformance`). The suite checks interface compliance, return types, and revocation hooks.

---

#### Section 7 · Schemas

**Anchor:** `#schemas`

**Title:**
> Schemas.

**Subhead:**
> Internet Court is schema-driven. Permissionless schema registration is supported.

A list of v0.1 schemas, each as an expandable section with the type definition + one-line purpose. Subset locked in [§6.2 Standard](#62-standard-standard) — *Section 8*. Full type definitions go here.

---

#### Section 8 · Embed the seal

**Component:** `C-13 Seal embed preview` (full version, with HTML/React/Vue tabs).

**Anchor:** `#seal`

**Title:**
> Embed "Protected by Internet Court."

**Subhead:**
> One line of HTML. Verifies on every page load.

**Body** — same as the Seal page Section 7, replicated here in the docs context. Code blocks for HTML, React, Vue, and a vanilla JS verification snippet that calls the on-chain verifier directly:

```ts
import { verify } from "@internetcourt/sdk";

const result = await verify("0x..."); // contract address
// { protected: true, bundle: "sla.v1.with-genlayer", adjudicators: [...] }
```

**Tertiary link:** **What the seal certifies →** `/seal#what-it-means`

---

#### Section 9 · Bundle catalog (preview)

**Anchor:** `#catalog`

**Title:**
> The bundle catalog.

**Subhead:**
> The unit of certification. Every bundle in the catalog has been audited as a unit and is "Protected by Internet Court."

**Body — a paginated table** (or grid of cards):

| Bundle ID | Template | Adjudicators | Seal status |
|---|---|---|---|
| `sla.v1.deterministic` | SLA contract | Deterministic | Active |
| `sla.v1.with-genlayer` | SLA contract | Deterministic + GenLayer | Active |
| `sla.v1.with-genlayer-and-kleros` | SLA contract | Deterministic + GenLayer + Kleros | Planned |
| `escrow.v1.deterministic` | Milestone escrow | Deterministic | Active |
| `escrow.v1.with-genlayer` | Milestone escrow | Deterministic + GenLayer | Active |
| `benchmark.v1` | Benchmark delivery | Deterministic + GenLayer | Active |
| `uptime.v1` | Uptime SLA | Deterministic + GenLayer | Active |
| `content-delivery.v1` | Content generation delivery | Deterministic + GenLayer | Active |

Each row links to the bundle's detail page (eventual): `/docs/catalog/<bundle-id>`.

---

#### Section 10 · Reference & resources

**Anchor:** `#resources`

A four-card row:

- **GitHub.** → `https://github.com/internetcourt`
- **The standard (long-form).** → `/standard`
- **The seal program.** → `/seal`
- **Adjudicator program.** → `/adjudicators#program`

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- The two-quickstart structure (contract-side + Adjudicator-side) maps to the two integration surfaces of the standard.
- The factory deploys bundles; verification is by construction.
- Conformance suite is required for accreditation.
- The catalog is the accreditation registry.

**Open.**
- The actual SDK package name and shape — `@internetcourt/sdk` is a placeholder until v0.1 ships.
- The bundle ID convention (`<template>.<version>.<adjudicator-mix>`) — pattern is sketched, not locked.
- Whether the docs page is one long page or paginated by section at v2 launch.
- Whether `/docs/catalog/<bundle-id>` detail pages ship at v2 or later.
- Whether to migrate to a dedicated `docs.internetcourt.org` Mintlify/Docusaurus property as the docs grow.

---

### 6.6 About `/about`

The Foundation page. Establishes legitimacy, governance posture, partner ecosystem, and contact.

#### Page job

Tell the institutional story. Internet Court is a public good, governed by the Internet Court Foundation, with a credible-neutrality discipline and a roadmap toward multi-stakeholder governance. Lay out the partner ecosystem honestly. Make it easy to get in touch.

#### Audience priority

1. Press (primary)
2. Partners and prospective partners (secondary)
3. Adjudicator partners (secondary)
4. Builders / integrators (tertiary)

#### Hero (light variant)

**Component:** `C-02 Hero (light)`.

**Eyebrow:** `THE FOUNDATION`

**Title** (italic-serif IC-red on `public good`, `public mark`):
> A *public good.* A *public mark.*

**Subhead:**
> The Internet Court Foundation stewards the open standard for adjudicating disputes between agents and the seal program that goes with it. The protocol does not monetize. The standard is open and forkable. The brand carries the trust meaning.

**CTA pair:**
- Primary: **Get in touch** → `mailto:hello@internetcourt.org`
- Secondary: **Read the spec** → `/standard`

---

#### Section order

1. Hero
2. Two pillars (recap)
3. Governance roadmap
4. Credible-neutrality discipline
5. Partners (full grid)
6. Working Group / Standards Committee
7. Funding model
8. Contact

---

#### Section 2 · Two pillars (recap)

**Component:** `C-07 Two-pillar split` — same as the home, in About-context.

**Title:**
> Two pillars. One trust envelope.

Same content as the home page Section 3. The recap exists for press / partner readers landing directly on About without going through Home.

---

#### Section 3 · Governance roadmap

**Anchor:** `#governance`

**Title:**
> Governance evolves toward multi-stakeholder.

**Subhead:**
> The seal program needs visible governance to avoid being captured. The path is sequenced.

**Body — three time-horizon cards:**

- **Within ~60 days.** A visible **Internet Court Working Group** stands up, with at least one non-GenLayer member (advisor or co-chair). The Working Group is the early decision-making body for the spec and the seal program.
- **Within ~12 months.** **Internet Court Foundation** stands up as a separate legal entity. GenLayer-seeded initially, but legally distinct. The Working Group evolves into a **Standards Committee** that owns the seal program.
- **Within ~18–24 months.** The Standards Committee opens seats for major Accredited Adjudicators. Funding diversification with at least two non-GenLayer sources visible.

**Below, a paragraph framing the roadmap:**

> The shift from co-authorship to partner-earns-seal sharpens neutrality risk: authority over certification can be captured. Multi-stakeholder governance is the antidote, sequenced so it earns credibility rather than performing it.

---

#### Section 4 · Credible-neutrality discipline

**Anchor:** `#neutrality`

**Title:**
> Four disciplines that keep the standard credibly neutral.

**Body — four numbered points:**

1. **The spec is open and forkable.** Anyone can implement Internet Court's standard, deploy on any chain, run their own factory. The brand carries the meaning, not the bytecode. Forks of the spec that don't earn the seal aren't "Protected by Internet Court."
2. **Adjudicators are first-class peers.** Deterministic, GenLayer, UMA, Kleros, ADR are all in the spec at equal documentation depth. No "default tier" labeling.
3. **The AI tier is a network, not a vendor.** GenLayer is permissionless — anyone can run a validator. The credible-neutrality story for the AI tier requires this; *"GenLayer as the AI tier"* is structurally closer to *"Ethereum validators"* than *"one company's API."*
4. **Governance moves toward multi-stakeholder over time.** See the roadmap above.

---

#### Section 5 · Partners

**Component:** `C-11 Partner grid` (full version, all 7 layers, with status badges).

**Anchor:** `#partners`

**Title:**
> The ecosystem.

**Subhead:**
> Partners on every layer of the stack. Adjudicator partners earn the seal; contract-side and payment-side partners integrate the standard.

The grid renders all 7 layers, with partners status-tagged as `Active`, `In conversation`, or `Planned`. L7 row stays dashed and labelled "Vacant."

**Below the grid, a one-paragraph note:**

> Logos are partners of Internet Court, not co-authors of v0.1. The unit of partnership is the **bundle** — partners appear in the bundles they conform to. New partners come to v0.1 and earn the seal through accreditation.

---

#### Section 6 · Working Group / Standards Committee

**Anchor:** `#working-group`

**Title:**
> The Internet Court Working Group.

**Body, two short paragraphs:**

- **What it is.** The Working Group is the standing body that maintains the standard and stewards the seal program. Open agendas, public minutes, public roadmap.
- **What it becomes.** As the Foundation legal entity stands up, the Working Group evolves into a Standards Committee with seats for major Accredited Adjudicators and other ecosystem voices.

**A list (placeholder until members are confirmed):**

- Working Group co-chair (Foundation)
- Working Group co-chair (non-Foundation, target within ~60 days)
- Adjudicator-program lead
- Spec-maintenance lead
- (Future) Accredited Adjudicator seats

**Tertiary link:** **Open seats and how to participate** → `mailto:hello@internetcourt.org`

---

#### Section 7 · Funding model

**Anchor:** `#funding`

**Title:**
> Public-good funded.

**Body, one paragraph + bullets:**

> Internet Court Foundation is a public-good foundation. The protocol does not capture value. Certification is **free** at v0.1. Verdict fees go to Adjudicators (stablecoin-denominated; no token). Funding diversification with at least two non-GenLayer sources is a near-term roadmap item.

- Donations and ecosystem grants.
- Public-goods grants from L1/L2 ecosystems.
- (Future) seal-program nominal certification fees, modeled on SSL CA pattern. **Open question** — see appendices.
- (Future) Adjudicator marketplace stake — out of scope at v0.1.

---

#### Section 8 · Contact

**Anchor:** `#contact`

**Title:**
> Get in touch.

**Three-column layout:**

- **General.** `hello@internetcourt.org`
- **Adjudicator program.** `adjudicators@internetcourt.org`
- **Press.** `press@internetcourt.org`

**Below:**
- GitHub: `https://github.com/internetcourt`
- (Stretch) Newsletter signup, single-input form.

---

#### Footer

See [§7.2 Footer](#72-footer).

---

#### Locked vs open

**Locked.**
- Internet Court Foundation as a public-good foundation; protocol does not monetize.
- No "Powered by GenLayer." GenLayer appears as one logo among partners.
- Working Group → Foundation legal entity → Standards Committee evolution.
- Free certification at v0.1; donation- and grant-funded.
- Adjudicators-as-first-class-peers as the spec discipline.

**Open.**
- Whether seal-program certification fees (SSL-CA style) ship at any point.
- The exact composition of the Working Group at v2 launch (need a confirmed non-GenLayer co-chair).
- Whether the partners section names "in conversation" partners explicitly or holds those for after-confirmation.
- Public board minutes / agendas — when they start, where they live.

---

## 7. Shared

Three global modules: header pill, footer, and per-page SEO/OG meta.

### 7.1 Header

The header pill is on every page. Carry forward the live site's pattern; change the nav items and CTA.

#### Recipe (carry-over from live site)

- Outer wrapper: `relative z-50 pt-4 px-4`
- Inner pill: `bg-[#f7f7f7] rounded-[12px] max-w-[1200px] mx-auto h-14 pl-3 pr-2 py-2 flex items-center justify-between overflow-hidden`
- Left: IC wordmark anchor, `flex items-center gap-2 shrink min-w-0`, with image `h-[29px] w-[160px] md:w-[220px]`, `src="/logos/tic-logo-red.svg"`, `alt="InternetCourt"`. Embed as SVG; never approximate.
- Right cluster: `flex items-center gap-6`
  - Desktop nav: `hidden items-center gap-6 md:flex`. Each link `font-mono text-base text-foreground transition-colors hover:text-[#dc2626]`.
  - CTA: `bg-white rounded-lg px-4 py-2.5 font-mono text-base text-foreground` (live-site treatment for the Connect Wallet button — repurposed to the marketing CTA on v2).
  - Mobile button: `md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white transition-colors hover:bg-[#DC2626] hover:text-white text-foreground`. Hamburger icon from `lucide-menu`.

#### v2 nav items (locked)

| Order | Label | Route |
|---|---|---|
| 1 | Standard | `/standard` |
| 2 | Seal | `/seal` |
| 3 | Adjudicators | `/adjudicators` |
| 4 | Docs | `/docs` |
| 5 | About | `/about` |
| CTA | Read the spec | `/standard` |

The CTA button replaces the live site's `Connect Wallet`. Wallet connection is part of the live app at `/cases`, `/create`, `/join` — not the marketing site header.

#### Mobile menu

When the hamburger is tapped, a full-screen sheet slides in. Content:

- Same five nav links, larger tap targets (`text-2xl`).
- Same CTA at the bottom, full-width.
- A second small section linking to `/cases`, `/create`, `/join` ("App") and `https://github.com/internetcourt` ("GitHub"), for parity with footer.

#### State / motion

- Sticky on scroll: `position: sticky; top: 16px; z-50` (the live site keeps the pill floating).
- Active nav item gets `text-[#dc2626]` (no underline, IC red is enough).
- Hover transition: 150ms ease.
- Focus-visible: 3px IC-red ring.

#### Open

- Whether the marketing-site header should also link to the App section subtly (a small grey "App ↗" pill on the far right) at v2 launch, or only after we get reports of confused users.

---

### 7.2 Footer

Three sections, low chrome. Carry-over of the live site's pattern with two changes: tagline updates to the new locked tagline, and the "Powered by GenLayer" line goes away.

#### Recipe

- Outer: `border-t border-border/60`
- Container: `mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:gap-4`
- Left section: brand mark + tagline
  - IC wordmark `h-5 w-auto`
  - Em-dash separator
  - Tagline copy
- Center section: nav links
- Right section: foundation byline (replaces "Powered by GenLayer")

#### Left section

```
[IC wordmark]  —  The neutral venue for agent disputes.
```

The tagline is **locked** (one of the three locked lines). Replaces the live site's "The Court for the Agent Economy."

#### Center section

Two rows on desktop (or one wider row that wraps), grouped by purpose.

**Marketing nav:**
- Standard → `/standard`
- Seal → `/seal`
- Adjudicators → `/adjudicators`
- Docs → `/docs`
- About → `/about`

**App + ecosystem:**
- Cases → `/cases`
- Create → `/create`
- GitHub → `https://github.com/internetcourt` (opens in new tab)

All links: `text-sm text-muted-foreground hover:text-foreground transition-colors`.

#### Right section

```
Internet Court Foundation · Open standard · Public good
```

Plain text, `text-sm text-muted-foreground`. No GenLayer logo. No "Powered by" attribution. (Per [§1 Overview](#1-overview) and the v4 narrative — GenLayer appears on `/about` and `/adjudicators` as one logo among Accredited Adjudicators on equal footing, never as a footer attribution.)

#### Mobile layout

Stacked, centered, same content. The right-section line moves above the nav block on mobile so the brand line stays at the top.

#### State

- `prefers-reduced-motion` honored — no transition flicker.
- Focus-visible rings as elsewhere.

---

### 7.3 SEO & OG cards

Per-page meta and Open Graph specs.

#### Global defaults

- `<title>` template: `<Page title> · Internet Court`
- `og:site_name`: `Internet Court`
- `og:locale`: `en_US`
- `twitter:card`: `summary_large_image`
- `og:image`: per-page (see below); 1200×630.
- Favicon: `/favicon.svg` on `#DC2626` rounded square (carry-over).
- Apple touch icon: `/apple-icon.png` (carry-over).

#### Per-page meta

##### Home — `/`
- `<title>`: `Internet Court — The neutral venue for agent disputes`
- `description`: `Internet Court is the open standard for adjudicating disputes between agents. The standard is a public good. The seal is a public mark.`
- `og:title`: `Internet Court — The neutral venue for agent disputes`
- `og:description`: same as `description`
- `og:image`: `/og/home.jpg` — visual: dark canvas, layer stack with L6 in IC red, the seal artifact in the bottom-right corner, IC wordmark top-left.

##### Standard — `/standard`
- `<title>`: `The Standard · Internet Court`
- `description`: `An open, EAS-inspired specification for adjudicating disputes between agents. Multi-chain, schema-driven, permissionless registration.`
- `og:image`: `/og/standard.jpg` — dark canvas, just the 7-layer stack diagram, L6 highlighted, "the missing layer" pull-quote.

##### Seal — `/seal`
- `<title>`: `The Seal · Internet Court`
- `description`: `Protected by Internet Court — the trust mark for agent commerce. FDIC for banks. UL for electronics. HTTPS for the web.`
- `og:image`: `/og/seal.jpg` — light canvas, big seal artifact center, "Protected by Internet Court" wordmark below.

##### Adjudicators — `/adjudicators`
- `<title>`: `Adjudicators · Internet Court`
- `description`: `Adjudicators are first-class peers in the spec. Deterministic, AI/on-chain, optimistic, human jury, and ADR — every kind of decision-making system has a place in Internet Court.`
- `og:image`: `/og/adjudicators.jpg` — light canvas, the five-category row, partner logos arranged below.

##### Docs — `/docs`
- `<title>`: `Docs · Internet Court`
- `description`: `Build on the open standard. SDK, factory, and Adjudicator interfaces. Multi-chain, schema-driven, permissionless registration.`
- `og:image`: `/og/docs.jpg` — light canvas, terminal-box frame with `npm install @internetcourt/sdk` rendered inside, IC wordmark top-left.

##### About — `/about`
- `<title>`: `About · Internet Court`
- `description`: `The Internet Court Foundation stewards the open standard and the seal program. A public good. A public mark.`
- `og:image`: `/og/about.jpg` — light canvas, two-pillar split visualization, IC wordmark.

#### OG image production rules

- **Dimensions**: 1200×630 PNG/JPG.
- **Type**: DM Sans 800 for the title line, DM Mono for the URL/eyebrow.
- **Logo**: IC wordmark always in the top-left or bottom-left, sized at ~h:48px.
- **Color**: dark variants use `#0a0913` canvas, light variants use `#ffffff`. IC red `#DC2626` for accent.
- **Don'ts**: no GenLayer logo on any OG card; no Powered-by attribution; no emoji.

#### Sitemap

Generate `/sitemap.xml` listing all six marketing routes plus the live-app routes (`/cases`, `/create`, `/join`).

#### robots.txt

Standard allow-all. Disallow nothing.

#### Structured data (stretch)

- `Organization` schema on `/about` with name "Internet Court Foundation," URL, logo, sameAs links to GitHub.
- `WebSite` schema with the standard tagline.
- (Stretch) `TechArticle` schema on `/standard` and `/docs`.

---

## 8. Appendices

### 8.1 Version log

A short log of what changed in this spec across iterations. Add a new entry every time a section gets restructured or a locked decision flips.

#### v0.1 — 2026-05-04

Initial draft of the website spec.

- Set up the spec folder structure (README, 00–04 globals, six page files, three shared files, two appendices).
- Locked the two-pillar narrative (Standard + Seal) as the spine.
- Locked the 5-page primary nav: Standard / Seal / Adjudicators / Docs / About.
- Locked the homepage section ordering (hero → 7-layer diagram → two pillars → case lifecycle teaser → seal preview → partner stack → CTA → recent verdicts → footer).
- Confirmed visual carry-over from the live internetcourt.org: rounded `#f7f7f7` panels, dark `#1a1817` terminal box, IC-red bordered "If disputed…" callout, hero pattern, footer pattern.
- Confirmed three locked lines: tagline ("The neutral venue for agent disputes"), architecture pillar ("The missing layer. Nothing above it works without it."), seal pillar ("Protected by Internet Court.").
- Confirmed Adjudicator rename — wholesale removal of "Evaluator" and "AI jury."
- Confirmed retirement of "Powered by GenLayer" footer line.
- Carried over the case lifecycle row (Statement / Guidelines & Evidence / Evidence Submission / Verdict) with copy adjustments — replace "AI validators" with "Adjudicators."

##### Open at v0.1

See [§8.2 Open questions](#82-open-questions).

#### (Future) v0.2

Reserved.

---

### 8.2 Open questions

Decisions still on the table. Tag each with the file(s) it affects so we can resolve them in batches.

#### Visual / design

##### Q1 — Hero scene video for v2

The live site uses `/scene-1.mp4` at 30% opacity behind the home hero. Do we re-shoot the scene to specifically visualize the L6 keystone (a 7-layer stack with the L6 cell pulsing), or do we keep `scene-1.mp4` for v2 launch and re-shoot later?

- Affected: [§6.1 Home](#61-home-), [§3 Design system](#3-design-system).
- Lean: re-shoot. The current scene was shot for the old narrative; the new one deserves visual matchup.

##### Q2 — The seal artifact

The seal mark is the single most important new visual asset for v2. Open: shape (shield-derivative of the IC wordmark icon? something else?), monochrome variants for embedding, cryptographic verification metadata accessible to clients.

- Affected: [§3 Design system](#3-design-system), [§6.3 Seal](#63-seal-seal), [§6.5 Docs](#65-docs-docs), [§7.3 SEO & OG cards](#73-seo--og-cards).
- Lean: shield-shaped derivative of the IC wordmark icon, light/dark variants. Needs a dedicated design pass with a designer; placeholder until then.

##### Q3 — 7-layer diagram light-canvas variant

The diagram is dark-canvas always today. For press / partner collateral / OG cards, do we also produce a light-canvas variant?

- Affected: [§3 Design system](#3-design-system), [§7.3 SEO & OG cards](#73-seo--og-cards).
- Lean: yes, but only after the dark version is locked. v2 ships dark only.

##### Q4 — Partner-grid layout

Organize logos by layer (current spec) or as a flat grid with optional layer filter? The by-layer organization tells the architecture story but compresses the partner count visually.

- Affected: §4 Components — *C-11*, [§6.1 Home](#61-home-), [§6.2 Standard](#62-standard-standard), [§6.6 About](#66-about-about).
- Lean: by-layer is the differentiator. Flat grid is the safe default but loses the spine.

##### Q5 — "Recent Cases" vs "Recent verdicts" section label

The live site says "Recent Cases." The v2 site is pushing the verdict log harder (verdict as a side-effect of the protocol running). Do we relabel the section?

- Affected: [§6.1 Home](#61-home-), §4 Components — *C-15*.
- Lean: "Recent verdicts" — closer to what the section actually shows.

#### Copy / vocabulary

##### Q6 — Audience-toggle labels

Live site: "I'm an agent" / "I'm a human." v2 spec proposes "For builders" / "For app makers." Other options on the table: "For protocols / For apps," "For developers / For founders."

- Affected: [§6.1 Home](#61-home-), §4 Components — *C-03*.
- Lean: "For builders / For app makers" — keeps the audience friendly without the agent/human conceit, which becomes literal once readers actually deploy agents.

##### Q7 — App-link surfacing in the header

The live site has `Cases / Create / Join / Docs` in the header. The v2 spec moves them to the footer. Should we keep a small "App ↗" pill on the marketing-site header to soften the move?

- Affected: [§7.1 Header](#71-header).
- Lean: footer-only at v2. Add a header pill if we get reports of confused users.

#### Architecture / scope

##### Q8 — Bundle ID convention

Spec sketches `<template>.<version>.<adjudicator-mix>` (e.g. `sla.v1.with-genlayer-and-kleros`). Does this hold up?

- Affected: [§6.5 Docs](#65-docs-docs) — *Section 9*.
- Lean: hold for now; the SDK ergonomics will resolve this.

##### Q9 — `/verify/<contract>` page at v2 launch

The seal page references a verify URL that opens the public proof page for any factory-deployed contract. Does this ship at v2 launch or later?

- Affected: [§6.3 Seal](#63-seal-seal) — *Section 7*, [§6.5 Docs](#65-docs-docs) — *Section 8*.
- Lean: ship a basic version at v2 — a single page that takes a contract address and renders bundle / Adjudicators / status. Stretch goal.

##### Q10 — Catalog detail pages

Each bundle could have a detail page (`/docs/catalog/<bundle-id>`). Do these ship at v2 or post-v2?

- Affected: [§6.5 Docs](#65-docs-docs) — *Section 9*.
- Lean: catalog table only at v2. Detail pages post-v2.

##### Q11 — Whether `/docs` is one long page or paginated

At v2, the spec proposes one long page. Once the docs grow past a certain length, we'll want pagination by section (Mintlify / Docusaurus). When does that kick in?

- Affected: [§6.5 Docs](#65-docs-docs).
- Lean: one long page at v2. Migrate to a dedicated `docs.internetcourt.org` once the SDK has a real shape.

#### Governance / Foundation

##### Q12 — Working Group co-chair (non-Foundation seat)

The 60-day governance roadmap requires a non-GenLayer co-chair on the Working Group. Who is the target candidate?

- Affected: [§6.6 About](#66-about-about) — *Section 6*.
- Resolution required before publishing `/about` with named members.

##### Q13 — Seal-program certification fees

Open: do we ever charge nominal certification fees (modeled on SSL CA pattern)? Free at v0.1 is locked. Whether fees come later is unresolved.

- Affected: [§6.3 Seal](#63-seal-seal) — *Section 5*, [§6.6 About](#66-about-about) — *Section 7*.
- Lean: leave open. No commitment either way at v2.

##### Q14 — "In conversation" partner naming

Some partners we're talking to don't want their name on the public site until they're confirmed. Do we list "in conversation" partners by name, or with placeholders?

- Affected: [§6.1 Home](#61-home-) — *Section 6*, [§6.2 Standard](#62-standard-standard) — *Section 10*, [§6.4 Adjudicators](#64-adjudicators-adjudicators) — *Section 4*, [§6.6 About](#66-about-about) — *Section 5*.
- Lean: name them only after explicit confirmation. Use lavender "In conversation" badge with placeholder labels (e.g. "Optimistic-tier Adjudicator (in conversation)") until confirmed.

#### Process

##### Q15 — How we want to iterate from here

This spec lives in Markdown. As we move toward implementation, do we:

- (a) Keep the spec as the source of truth and treat the codebase as derivative;
- (b) Stop updating the spec once implementation begins, and let code be the truth;
- (c) Run both in parallel (spec for narrative + design intent, code for runtime behavior).

- Lean: (c). The spec is most useful before code exists; once a v2 of the site is deployed, we update code first and reflect changes back into this spec only when narrative or structure shifts.
