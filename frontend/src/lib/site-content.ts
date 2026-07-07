export const TELEGRAM_URL = "https://t.me/internet_court";
// Clerk Agent bot. This is the DEV bot (@internetcourtdev_bot); production
// should use the non-dev handle (@internetcourtbot).
export const TELEGRAM_BOT_URL = "https://t.me/internetcourtdev_bot";
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
 * Founding members laid out as a 10-column grid (10 / 10 / 8) in reading order
 * (left to right, top to bottom). `gridHeight` is the logo's
 * height within a 40px-tall Figma cell — PartnerGrid multiplies it by a single
 * SCALE factor so the relative sizing is preserved. Each entry reuses the
 * existing Partner object (same src/iconSrc) with its grid height attached.
 */
export const FOUNDING_MEMBERS_GRID: Partner[] = (
  [
    // Row 1 (10)
    ["GenLayer", 24],
    ["MetaMask", 22],
    ["OKX", 14],
    ["NEAR", 16],
    ["Starknet", 16],
    ["x402", 16],
    ["0G Labs", 18],
    ["ZKsync", 18.9],
    ["Nansen", 16],
    ["Kleros", 16],
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
