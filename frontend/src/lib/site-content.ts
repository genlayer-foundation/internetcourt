export type StackRow = {
  n: string;
  layer: string;
  standards: string;
};

export const STACK_ROWS: StackRow[] = [
  { n: "01", layer: "Discovery, identity & reputation", standards: "ERC-7857, ERC-8004" },
  { n: "02", layer: "Negotiation", standards: "A2A" },
  { n: "03", layer: "Contracts & obligations", standards: "ERC-8183, Arkhai" },
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

export const FOUNDING_MEMBERS: Partner[] = [
  { name: "GenLayer", src: "/partners/genlayer.svg" },
  { name: "BNB Chain", src: "/partners/bnb-chain.svg" },
  { name: "OKX", src: "/partners/okx.svg" },
  { name: "0G Labs", src: "/partners/0g-labs.svg" },
  { name: "Humanity Protocol", src: "/partners/humanity-protocol.svg" },
  { name: "ZKsync", src: "/partners/zksync.svg" },
  { name: "AltLayer", src: "/partners/altlayer.svg" },
  { name: "ChainGPT", src: "/partners/chaingpt.svg" },
  { name: "Anoma", src: "/partners/anoma.png" },
  { name: "Chainbase", src: "/partners/chainbase.svg" },
  { name: "LI.FI", src: "/partners/lifi.svg" },
  { name: "AIVM", src: "/partners/aivm.svg" },
  { name: "Chutes", iconSrc: "/partners/chutes-icon.svg" },
  { name: "AntSeed", iconSrc: "/partners/antseed-icon.svg" },
  { name: "Arkhai", src: "/partners/arkhai.svg" },
];
