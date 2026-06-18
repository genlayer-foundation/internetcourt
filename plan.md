# Implementation Brief — Blog + Launch Video + Telegram link

> **Paste-and-go brief for a fresh Claude Code cloud agent working in this repo (`moltcourt2`, the internetcourt.org monorepo, branch `feat/marketing-one-pager` → staging).** It carries product decisions already made with the user, plus a *reference* implementation built in an older multi-page copy of the repo. **This repo is a single-page marketing site, so treat the reference as guidance and adapt — research your own repo first.**

---

## 0. How to use this brief

1. **Research first.** Confirm the repo facts in §3 against the live code in `frontend/`. Note any deltas — the reference in §4 was built against a *different, multi-page* version of this project, not this one-pager.
2. **Plan.** Write your own task list / plan from this brief + your research.
3. **Implement** — per `CLAUDE.md` work-mode, orchestrate via sub-agents, not the main session. Build everything including all design variants + preview routes (§2).
4. **Verify** with `npm run build` (must pass) and lint scoped to new files.
5. **Report** the preview URLs and the open follow-ups (§6) back to the user.

---

## 1. Goal

Three additions to the marketing site:

1. **Telegram group link** — a public group to join; surface it on the site.
2. **A Blog** — where the team publishes the upcoming **press release**, a **launch video**, and **articles** going forward. Authored as **MDX files** (drop a file → post appears).
3. **Embed the launch motion video** on the homepage in a dedicated **"Watch" section** (click-to-play **with sound** — it's a branded MOTION + SFX clip), and also feature it on the blog.

---

## 2. Decisions already locked (do NOT re-litigate with the user)

- **Section name = "Blog"**, route `/blog`. (We brainstormed court-themed names — The Reporter/Gazette/Record etc. — but the user chose plain "Blog".)
- **Content model = MDX files + frontmatter.** Frontmatter: `title`, `date` (ISO), `excerpt`, `cover` (optional image), `tag` (optional). `tag` is an optional cosmetic "court register" badge, one of: **Notice | Opinion | Order | Dispatch | Exhibit** (press release = Notice, essay = Opinion, video post = Exhibit). Never required.
- **Telegram = footer link**, placeholder URL `https://t.me/internetcourt` behind a `TELEGRAM_URL` constant with a `// TODO: real invite link` comment. Real link is TBD from the user.
- **Video** = dedicated homepage **"Watch"** section, **click-to-play with sound**. Source file (user's machine): `/Users/rasca/Downloads/VIDEO 1 - INTERNET COURT MOTION + SFX v2.mp4`.
  - Copy it **locally** to `frontend/public/video/internet-court-launch.mp4` (clean name).
  - **Gitignore it** — do NOT commit the ~11 MB binary. Commit only a `frontend/public/video/README.md` placeholder.
  - Poster fallback = existing `/og-image.jpg`.
  - **Prod hosting is a follow-up:** the deployed site needs the clip uploaded separately (e.g. Vercel Blob, public) and the `src` swapped, or it 404s on prod.
- **Build THREE Watch variants + THREE Blog index designs** behind temporary **`/preview`** routes (noindex). Wire one default of each into the live pages; the user reviews `/preview/*`, picks one of each, then a follow-up wires the winners and **deletes the unused variants + the `/preview` routes.** *(Standing user preference: always show 2-3 distinct design concepts and let them pick — make them conceptually different, not color tweaks.)*
  - **Watch variants:** **A · Theater** (DEFAULT — clean centered spotlight), **B · Cinematic** (dark full-bleed band, red glow/ring), **C · Exhibit A** (court-file frame with monospace case stamps + paper grain).
  - **Blog designs:** **1 · Clean** (DEFAULT — card grid, native to the site), **2 · Academic** (law-review single column with thin rules, no cards), **3 · Gazette** (featured lead story + masthead + multi-column grid).

---

## 3. This repo's facts (verify, then build on these)

- **Stack:** Next.js `16.1.6` App Router, React `19.2.3`, Tailwind `v4`, TypeScript, **npm** (`package-lock.json`). Frontend lives at `frontend/`.
- **Architecture: single-page marketing site.** `frontend/src/app/` has `layout.tsx`, `page.tsx`, and demo routes `stack-pinned/`, `stack-scroll/`. The homepage (`page.tsx`) is one long composition of sections (FoundingMarquee → Hero → Stack → Goal → Founding Partners → CTA band) with anchor links (`#stack`, `#goal`, `#founding-partners`). **There are no content sub-routes yet** — `/blog` will be the first.
- **Header** (`frontend/src/components/layout/Header.tsx`): **logo-only, no nav menu.** → Blog needs a reachable link; default is to add it in the **Footer**. Optionally add a small link in the Header — confirm with user if you go beyond the footer.
- **Footer** (`frontend/src/components/layout/Footer.tsx`): external links rendered as `<a target="_blank">` — currently **GitHub** (`https://github.com/internetcourt`) and **Contact** (`mailto:ivan@genlayer.foundation`). **Add the Telegram link here**, next to those. Also add a **Blog** link here.
- **Design tokens** (`frontend/src/app/globals.css`): `--accent-red: #dc2626` (+ `-soft/-glow/-border` variants), `--foreground: #1a1817`, `--background: #FFFFFF`, `--card: #f7f7f7`, `--border` gray. Fonts: `DM Sans` (body, `--font-dm-sans`), `DM Mono` (mono, `--font-dm-mono`), **`DM Serif Display` italic** for headings via the `.font-heading` class (note: headings are **italic serif** here — variant aesthetics should lean into that). Utilities: `.animate-fade-in-up`, `.delay-100..500`, marquee animations.
- **Reusable components** (`frontend/src/components/site/`): `Hero` (`variant: "light"|"light-video"|"dark"`, `title`, `subhead`, `mediaSrc`, `children`), `Accent`, `SectionHeading` (`eyebrow`, `title`, `subhead`, `align`), `CTABand` (`title`, `actions[]`, `children`), `StackTable`/`AnimatedStack`, `PartnerMarquee`/`PartnerGrid`, `SkillCommand`. **No card/list pattern exists yet** — create `PostCard` for the blog. `cn()` helper from `clsx`+`tailwind-merge`. Icons: `lucide-react`.
- **Media:** plain `<img>` and `<video>` tags (NO `next/image`). Existing `/scene-1.mp4` (Hero bg, muted autoplay), `/og-image.jpg`. → Match this: the new `VideoPlayer` should use a plain `<img>` for the poster (with an eslint-disable for `no-img-element`).
- **Metadata/SEO:** `Metadata` export in `layout.tsx` (metadataBase `https://internetcourt.org`, OpenGraph, twitter card, `/og-image.jpg`) and a page-level override in `page.tsx`. Per-post pages should export `generateMetadata`.
- **No MDX/markdown deps installed** (`next-mdx-remote`, `gray-matter`, `remark-gfm`, `react-markdown` all absent) → install them.
- **Content data pattern:** `frontend/src/lib/site-content.ts` holds hardcoded arrays (`STACK_ROWS`, founding members). Put `TELEGRAM_URL` wherever site-level constants live (check for a `constants.ts`; otherwise `site-content.ts` or a new `constants.ts`).

---

## 4. Reference implementation (built in the other repo — adapt paths & the italic-serif aesthetic)

This is a known-good, build-passing spec. Re-create it here, adapting to §3.

### Shared player — `frontend/src/components/site/VideoPlayer.tsx` (client)
- `"use client"`. Props `{ src: string; poster?: string; className?: string; caption?: string }`, `poster` defaults to `/og-image.jpg`.
- Before play: poster `<img>` filling an `aspect-video` frame + a centered circular **Play** button (lucide `Play`, white icon on `bg-[#dc2626]` circle, hover scale). On click → swap to `<video>` that autoplays **WITH SOUND** (do **not** set `muted`), `controls`, `playsInline`, `preload="metadata"`. `playing` state via `useState`.
- Frame: `rounded-2xl overflow-hidden border border-border shadow-sm`. Play button is a real `<button aria-label="Play video">`. Optional `caption` → mono uppercase figcaption.
- Reused by the homepage Watch section **and** the blog MDX renderer.

### Watch variants — `frontend/src/components/site/watch/{TheaterWatch,CinematicWatch,ExhibitWatch}.tsx`
Each is a full `<section>` rendering `<VideoPlayer src="/video/internet-court-launch.mp4" />`.
- **TheaterWatch** (default): `bg-[#f7f7f7]` section, `SectionHeading eyebrow="WATCH"`, short title + subhead, centered `max-w-4xl` player.
- **CinematicWatch**: dark full-bleed `bg-[#1a1817]` text-white band, `max-w-5xl` frame with `ring-1 ring-[#dc2626]/40` + accent-red glow, red mono eyebrow.
- **ExhibitWatch**: "EXHIBIT A" docket frame — `grain-overlay` paper texture, mono stamp labels (`CASE No. IC-0001`, `FILED · 2026`, rotated red "EXHIBIT A" stamp), thin `border-t border-border` rules.
- **Full-bleed caveat:** if `page.tsx` wraps sections in a `max-w-*` container, the full-bleed bands (Cinematic/Exhibit) must be placed **outside** that wrapper to reach the viewport edges. Check the homepage structure before inserting.

### Watch preview — `frontend/src/app/preview/watch/page.tsx`
Stacks all three variants with mono divider labels ("VARIANT A — Theater", …). `export const metadata = { robots: { index: false, follow: false }, title: "Preview · Watch variants" }`.

### Homepage wiring
Import `TheaterWatch` into `frontend/src/app/page.tsx` and render it as a new section (sensible spot: after the Hero / before the closing CTA — pick based on the actual section flow). Mind background alternation and the full-bleed caveat.

### Blog engine
- Install: `npm install next-mdx-remote gray-matter remark-gfm` (next-mdx-remote v6 — use the **`next-mdx-remote/rsc`** entrypoint in Server Components, with `options.mdxOptions.remarkPlugins = [remarkGfm]`). **Do NOT add `import "server-only"`** — it isn't a dependency and breaks the build; `node:fs` keeps the module server-side anyway.
- `frontend/src/lib/blog.ts` (server): `BlogPost` type `{ slug, title, date, excerpt, cover?, tag?, content }`; `getPostSlugs()`, `getAllPosts()` (date desc), `getPostBySlug(slug)`, `formatDate(iso)` → "June 17, 2026". Posts dir `src/content/blog`, parsed with `gray-matter`.
- `frontend/src/components/blog/mdx-components.tsx`: `mdxComponents` map — `Video` → wraps `VideoPlayer`; style `h1/h2/h3` with `.font-heading`, `a` red underline, `blockquote` left red border, `code/pre` mono subtle bg, etc.
- `frontend/src/components/blog/PostCard.tsx`: card styled `bg-[#f7f7f7] border rounded-xl hover:shadow-lg transition-all duration-300 animate-fade-in-up`; optional cover, `tag` Badge, `.font-heading` title, `formatDate` mono, `line-clamp-3` excerpt; whole card links `/blog/${slug}`.
- `frontend/src/components/blog/layouts/{CleanIndex,AcademicIndex,GazetteIndex}.tsx`: `({ posts })` each, genuinely distinct (see §2). Clean & Gazette use `PostCard`; Academic uses an inline ruled list.
- `frontend/src/app/blog/page.tsx` (Server Component): `getAllPosts()` → `<CleanIndex>`; `export const metadata`.
- `frontend/src/app/blog/[slug]/page.tsx` (Server Component): `generateStaticParams()` from slugs; `generateMetadata()` (title/description/OpenGraph from frontmatter, `images: [cover ?? "/og-image.jpg"]`, `type: "article"`); `notFound()` on missing; render `<MDXRemote source={post.content} components={mdxComponents} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />` in a `max-w-3xl` prose article with a `tag` badge + `.font-heading` title + `formatDate` header.
- `frontend/src/app/preview/blog/page.tsx`: all three layouts stacked with labels; noindex metadata.

### Seed posts — `frontend/src/content/blog/*.mdx`
- `welcome.mdx` (tag: Opinion) — short real intro to Internet Court (dispute resolution infra for the AI agent economy, GenLayer intelligent contracts, three-key system, TRUE/FALSE/UNDETERMINED). Tasteful.
- `launch-video.mdx` (tag: Exhibit) — one intro line, then `<Video src="/video/internet-court-launch.mp4" caption="…" />`.
- `press-release.mdx` (tag: Notice) — clearly-marked DRAFT placeholder with `{/* TODO: replace with real press release copy */}` + dateline.

### Telegram + reachability
- Add `TELEGRAM_URL = "https://t.me/internetcourt"` (with TODO) to the site constants module.
- Footer: add a `Telegram` `<a>` next to GitHub/Contact, same anchor pattern. Add a `Blog` link (→ `/blog`) too.

### Gotchas learned (carry over)
- Build passes with **Turbopack**; a "multiple lockfiles" warning (repo-root + `frontend/` `package-lock.json`) is harmless (can silence via `turbopack.root`).
- Keep the `VideoPlayer` poster as a plain `<img>` (eslint-disable `no-img-element`) to match this repo's no-`next/image` convention.
- Lint may already FAIL on **pre-existing** errors in unrelated files — scope your lint check to the new files; only block on errors you introduced.

---

## 5. Suggested sub-agent split (parallel)
- **Agent A** — Telegram link + Blog footer link + `TELEGRAM_URL`; copy video locally; gitignore the mp4; `public/video/README.md`.
- **Agent B** — Blog: install MDX deps, `blog.ts`, `mdx-components`, `[slug]` page, 3 seed posts, 3 index designs + `PostCard`, `/blog` (Clean default), `/preview/blog`.
- **Agent C** — `VideoPlayer` + 3 Watch variants + `/preview/watch` + wire Theater into the homepage.
- **Then** a verify agent: `npm run build` + scoped lint.

---

## 6. Open follow-ups (surface to the user)
- Real **Telegram invite link** → swap `TELEGRAM_URL`.
- Real **press-release copy** → replace `press-release.mdx`.
- **Prod video hosting** (Vercel Blob) + swap `src` (the mp4 is gitignored, so prod won't have it otherwise).
- **After the user picks** one Watch + one Blog design: wire the winners, delete the unused variants and the `/preview` routes.
- Decide whether the Blog also deserves a Header link (default added only to Footer).

---

## 7. Source asset
- Launch video (user's machine): `/Users/rasca/Downloads/VIDEO 1 - INTERNET COURT MOTION + SFX v2.mp4` (~11 MB, MOTION + SFX, has sound).
