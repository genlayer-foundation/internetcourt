export const TELEGRAM_URL = "https://t.me/internet_court";
// Clerk Agent bot: production handle (@internetcourtbot).
// Dev bot was @internetcourtdev_bot.
export const TELEGRAM_BOT_URL = "https://t.me/internetcourtbot";
export const X_URL = "https://x.com/courtofinternet";

export type StackRow = {
  n: string;
  layer: string;
  standards: string;
};

export const STACK_ROWS: StackRow[] = [
  { n: "01", layer: "Discovery, identity & reputation", standards: "ERC-7857, ERC-8004" },
  { n: "02", layer: "Negotiation", standards: "A2A" },
  { n: "03", layer: "Contracts & obligations", standards: "ERC-7710, ERC-8183, Arkhai" },
  { n: "04", layer: "Payment & escrow", standards: "x402, MPP, APP" },
  { n: "05", layer: "Execution", standards: "OpenClaw, Hermes" },
  { n: "06", layer: "Verification & disputes", standards: "GenLayer, Kleros, UMA" },
];

export type Partner = {
  name: string;
  /** Full wordmark logo (light-background variant). */
  src?: string;
  /** Icon + HTML text composition, for logos whose wordmark asset is unusable. */
  iconSrc?: string;
  /**
   * True for white / light-on-transparent marks. These are invisible on the
   * light logo backgrounds, so they get flattened to dark ink (`brightness(0)`)
   * instead of the tonal `grayscale(1)` used for colored/dark marks. Keeping the
   * two treatments separate stops `brightness(0)` from crushing solid-fill logos
   * (e.g. Starknet, Anoma) into featureless black blobs.
   */
  white?: boolean;
  /**
   * Per-logo height in the static grid, expressed in Figma's 40px-cell units
   * (preserves the relative sizing of "Frame 68"). Scaled by a global factor
   * in PartnerGrid; absent for marquee-only usage.
   */
  gridHeight?: number;
};

/**
 * Headline founding members — rendered large in the top marquee row. Mirrors
 * the prominent first row of the Internet Court one-pager.
 */
export const FOUNDING_MEMBERS_PRIMARY: Partner[] = [
  { name: "GenLayer", src: "/partners/genlayer.svg" },
  { name: "MetaMask", src: "/partners/metamask.svg" },
  { name: "x402", src: "/partners/x402.svg", white: true },
  { name: "ZKsync", src: "/partners/zksync.svg" },
  { name: "OKX", src: "/partners/okx.svg" },
  // Official horizontal lockup: gradient mark + white wordmark, so it takes the
  // `white` (brightness(0)) treatment to read as dark ink on the light rows.
  { name: "Solana", src: "/partners/solana.svg", white: true },
  { name: "BNB Chain", src: "/partners/bnb-chain.svg" },
  { name: "Nansen", src: "/partners/nansen.png" },
  { name: "0G Labs", src: "/partners/0g-labs.svg" },
];

/**
 * Remaining founding members — rendered smaller in the second marquee row,
 * scrolling the opposite direction.
 */
export const FOUNDING_MEMBERS_SECONDARY: Partner[] = [
  { name: "Humanity Protocol", src: "/partners/humanity-protocol.svg" },
  { name: "AltLayer", src: "/partners/altlayer.svg" },
  { name: "ChainGPT", src: "/partners/chaingpt.svg" },
  { name: "Anoma", src: "/partners/anoma.png" },
  { name: "AppLayer", src: "/partners/applayer.svg", white: true },
  { name: "Chainbase", src: "/partners/chainbase.svg" },
  { name: "LI.FI", src: "/partners/lifi.svg", white: true },
  { name: "OpenServ", src: "/partners/openserv.svg" },
  { name: "UMA", src: "/partners/uma.svg" },
  { name: "Humanode", src: "/partners/humanode.png", white: true },
  { name: "Privy", src: "/partners/privy.svg" },
  { name: "AIVM", src: "/partners/aivm.svg", white: true },
  { name: "Chutes", src: "/partners/chutes.svg" },
  { name: "AntSeed", src: "/partners/antseed.svg" },
  { name: "Heurist", src: "/partners/heurist.svg" },
  { name: "Arkhai", src: "/partners/arkhai.svg" },
  { name: "Collective Memory", src: "/partners/collective-memory.png", white: true },
  { name: "io.net", src: "/partners/io-net.svg" },
  { name: "NEAR", src: "/partners/near.svg" },
  { name: "Starknet", src: "/partners/starknet.svg" },
  { name: "Kleros", src: "/partners/kleros.svg" },
  // Official horizontal lockup. The wordmark is already black, but the yellow
  // (#FCD000) accents are structural: one of them is the left diagonal of the
  // "w". `grayscale(1)` maps that yellow to a near-white grey that drops out on
  // the light rows and breaks the letterform, so this takes the `white`
  // (brightness(0)) treatment instead, which flattens the accents into the same
  // dark ink and keeps the word intact.
  { name: "Yellow", src: "/partners/yellow.svg", white: true },
];

/** Combined list (all founding members). */
export const FOUNDING_MEMBERS: Partner[] = [
  ...FOUNDING_MEMBERS_PRIMARY,
  ...FOUNDING_MEMBERS_SECONDARY,
];

/** Lookup of every defined partner by name, for building ordered views. */
const PARTNERS_BY_NAME: Record<string, Partner> = Object.fromEntries(
  FOUNDING_MEMBERS.map((partner) => [partner.name, partner]),
);

/**
 * Founding members laid out as a 10-column grid (12 / 10 / 8) in reading order
 * (left to right, top to bottom). `gridHeight` is the logo's
 * height within a 40px-tall Figma cell — PartnerGrid multiplies it by a single
 * SCALE factor so the relative sizing is preserved. Each entry reuses the
 * existing Partner object (same src/iconSrc) with its grid height attached.
 */
export const FOUNDING_MEMBERS_GRID: Partner[] = (
  [
    // Row 1 (12)
    ["GenLayer", 24],
    ["MetaMask", 22],
    ["OKX", 14],
    ["Solana", 16],
    ["NEAR", 16],
    ["Starknet", 16],
    ["x402", 16],
    ["0G Labs", 18],
    ["ZKsync", 18.9],
    ["Nansen", 16],
    ["Kleros", 16],
    // Lowercase lockup: its ascenders and descender fill the whole viewBox, so
    // it needs a taller unit than a cap-height wordmark to read at the same
    // size. At 3.18:1 the width never binds (69px in the 120px marquee box,
    // 111px in the ~150px grid cell), so the unit is set for optical weight.
    ["Yellow", 20],
    // Row 2 (10)
    ["Privy", 16.9],
    ["AntSeed", 20],
    ["Collective Memory", 22],
    ["UMA", 14],
    ["Arkhai", 21.7],
    ["AltLayer", 16],
    ["Anoma", 17],
    ["AppLayer", 15.3],
    ["BNB Chain", 15.4],
    ["LI.FI", 22],
    // Row 3 (8, centered)
    ["Chainbase", 15.8],
    ["io.net", 14],
    ["Heurist", 16],
    ["Chutes", 13.75],
    ["ChainGPT", 16],
    ["OpenServ", 22],
    ["Humanode", 13],
    ["Humanity Protocol", 21.9],
  ] as const
).map(([name, gridHeight]) => ({ ...PARTNERS_BY_NAME[name], gridHeight }));

/**
 * Lookup of each partner's grid height (Figma 40px-cell units) by name, so the
 * marquee can size its logos to exactly match the static grid (PartnerGrid).
 */
export const GRID_HEIGHT_BY_NAME: Record<string, number> = Object.fromEntries(
  FOUNDING_MEMBERS_GRID.map((partner) => [partner.name, partner.gridHeight ?? 18]),
);
