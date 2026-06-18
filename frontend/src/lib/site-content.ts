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
};

/**
 * Headline founding members — rendered large in the top marquee row. Mirrors
 * the prominent first row of the Internet Court one-pager.
 */
export const FOUNDING_MEMBERS_PRIMARY: Partner[] = [
  { name: "GenLayer", src: "/partners/genlayer.svg" },
  { name: "MetaMask", src: "/partners/metamask.svg" },
  { name: "x402", src: "/partners/x402.svg" },
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
  { name: "AppLayer", src: "/partners/applayer.svg" },
  { name: "Chainbase", src: "/partners/chainbase.svg" },
  { name: "LI.FI", src: "/partners/lifi.svg" },
  { name: "OpenServ", src: "/partners/openserv.svg" },
  { name: "UMA", src: "/partners/uma.svg" },
  { name: "Humanode", src: "/partners/humanode.png" },
  { name: "Chutes", iconSrc: "/partners/chutes.svg" },
  { name: "AntSeed", iconSrc: "/partners/antseed.svg" },
  { name: "Arkhai", src: "/partners/arkhai.svg" },
  { name: "Collective Memory", src: "/partners/collective-memory.png" },
];

/** Combined list (all founding members). */
export const FOUNDING_MEMBERS: Partner[] = [
  ...FOUNDING_MEMBERS_PRIMARY,
  ...FOUNDING_MEMBERS_SECONDARY,
];
