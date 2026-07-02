# Blog infographic generators

## Purpose

The two PNGs documented here are hand-built infographics, not live screenshots of the site. They are embedded in the blog article at `frontend/src/content/blog/en/internet-court-agentic-commerce.mdx`:

- `agentic-stack.png` is embedded via `/media/blog/agentic-stack.png`.
- `founding-members-by-layer.png` is embedded via `/media/blog/founding-members-by-layer.png`.

Because these are static images, they do not update automatically when the underlying data changes. When the stack layers, the founding-member roster, or any partner logo changes, you must edit the generator HTML in this folder and re-render the PNG by hand.

Each generator is a self-contained HTML file with inline CSS. It is rendered to a PNG using system headless Chrome at a 2x device scale factor, so a 1x CSS layout produces a 2x PNG.

## Image 1: agentic-stack.png

What it shows: a recreation of the homepage AnimatedStack visual. Six numbered layer rows, each with a red outlined 01 to 06 badge, a dark layer name, and the relevant standards in muted monospace on the right. A tall red "INTERNET COURT" vertical pill sits on the far right, joined to each row by red connector lines.

Source of truth for the rows: `frontend/src/lib/site-content.ts` (`STACK_ROWS`) and `frontend/src/data/caniagent/taxonomy.ts`. The six rows currently rendered are:

1. Discovery, identity & reputation: ERC-7857, ERC-8004
2. Negotiation: A2A
3. Contracts & obligations: ERC-7710, ERC-8183, Arkhai
4. Payment & escrow: x402, MPP, APP
5. Execution: OpenClaw, Hermes
6. Verification & disputes: GenLayer, Kleros, UMA

Generator: `agentic-stack.html`
Output path: `frontend/public/media/blog/agentic-stack.png`
Output dimensions: 2400x1444 (a 1200x722 CSS layout rendered at 2x).

Fonts are Inter and JetBrains Mono, loaded from Google Fonts, with system fallbacks. The red connector lines are drawn by a small script that measures each row and positions a line at its vertical center, so no manual line coordinates are needed.

## Image 2: founding-members-by-layer.png

What it shows: the founding members grouped by the layer each one serves. Six light gray rounded rows, each with a red 01 to 06 badge and a layer name in the fixed-width label column on the left, and the members' real logos to the right. Each logo is rendered as a monochrome silhouette using `filter: grayscale(1) brightness(0); opacity: 0.72`, object-fit contain, with wrapping allowed, and the logos in a row are vertically centered on a common center line.

Logo sizing rule (matches the homepage partner grid): each logo's height is its `gridHeight` from `FOUNDING_MEMBERS_GRID` in `frontend/src/lib/site-content.ts`, multiplied by the homepage desktop multiplier `SCALE = 1.5` (from `frontend/src/components/site/PartnerGrid.tsx`), then by a single uniform infographic scale factor of 1.35 applied to every logo so the image reads crisply at 2x. The net per-logo multiplier is therefore 1.5 x 1.35 = 2.025, so the relative heights of the logos in the image equal the ratios of their `gridHeight` values exactly, just as on the homepage (wordmarks like GenLayer, MetaMask, LI.FI, OpenServ and Collective Memory read larger; smaller marks like Humanode, OKX, UMA and io.net read smaller). The uniform 1.35 factor scales the whole set together and preserves every ratio; do not hand-tune individual logos. Heights are set inline per logo in px (`gridHeight * 2.025`). If any `gridHeight` changes in `site-content.ts`, recompute that logo's inline height in the generator and re-render.

Kleros is not in `FOUNDING_MEMBERS_GRID` (it is a dispute standard, not a founding member). It is given a manual `gridHeight` of 14, equal to UMA's value, so it sits proportionally next to its neighbor; the generator carries an HTML comment noting this manual value.

Source of truth for the grouping: this is an explicit list maintained in the generator itself (there is no single data file for the by-layer grouping). Each member appears once, in this order:

1. Payments: x402, OKX, AntSeed, MetaMask, Privy
2. Identity & reputation: Humanity Protocol, Humanode, 0G Labs, AltLayer
3. Contracts, escrow & settlement: Arkhai, ZKsync, Starknet, BNB Chain, NEAR
4. Execution & value movement: Heurist, io.net, Chutes, AppLayer, ChainGPT, OpenServ, Anoma, LI.FI
5. Analytics & evidence: Nansen, Chainbase, Collective Memory
6. Verification & disputes: GenLayer, Kleros, UMA

Logos come from `frontend/public/partners/`. The generator references them relatively as `../../public/partners/...` .

Generator: `founding-members-by-layer.html`
Output path: `frontend/public/media/blog/founding-members-by-layer.png`
Output dimensions: 2560x1576 (a 1280x788 CSS layout rendered at 2x).

## Render commands

Both commands assume macOS system headless Chrome. The Chrome path may differ on your machine; adjust it if needed.

Stack:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1200,722 --screenshot="/Users/rasca/Dev/moltcourt2/frontend/public/media/blog/agentic-stack.png" "file:///Users/rasca/Dev/moltcourt2/frontend/tools/blog-images/agentic-stack.html"
```

Members (the logos are loaded from disk, so you must either pass `--allow-file-access-from-files` as shown, or copy the partner logos next to the HTML and change the src paths to `partners/...`):

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --allow-file-access-from-files --window-size=1280,788 --screenshot="/Users/rasca/Dev/moltcourt2/frontend/public/media/blog/founding-members-by-layer.png" "file:///Users/rasca/Dev/moltcourt2/frontend/tools/blog-images/founding-members-by-layer.html"
```

## Window heights

The window heights (722 for the stack, 788 for the members) were measured to fit the content tightly with no extra whitespace at the bottom. If you add or remove rows, if the members wrap onto more or fewer lines, or if any `gridHeight` changes and alters the logo heights, re-measure the rendered content height and update the `--window-size` value before re-rendering. A quick way to measure is to add a small script that reads `document.getElementById('stage').getBoundingClientRect().height` (or the equivalent container) and reports it, then round up.

## Prerequisites

You need a headless Chrome binary. The commands above use the system Google Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; the path may differ on your machine.

If you do not have system Chrome, alternatives are:

- `npx -y puppeteer` (downloads a bundled Chromium), then drive a screenshot from a short Node script.
- A local `puppeteer-core` or `@playwright/test` install pointed at any Chromium you already have.

Whichever you use, keep the same device scale factor of 2 and the same window sizes so the output dimensions match.

## Before release

Do the following before this article ships:

1. Replace provisional or placeholder partner logos with final official versions. In particular, NEAR (currently sourced from the near.org site header) and Starknet (from the starknet.io media kit) are provisional, and any other logo that is not final should be swapped for the official asset in `frontend/public/partners/`.
2. If the founding-member roster or the layer grouping changes, update `founding-members-by-layer.html` and the article text in `internet-court-agentic-commerce.mdx` so they match. Likewise, if the stack layers change, update `agentic-stack.html`, `STACK_ROWS` in `frontend/src/lib/site-content.ts`, and the article text.
3. Regenerate both PNGs with the render commands above and visually verify them.
4. Remember that the separate one-pager PDFs in `~/Dev/genlayer/Internet Court one pager/` are also stale and need re-export.
