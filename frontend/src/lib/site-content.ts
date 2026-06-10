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

export type FoundingBenefit = {
  numeral: string;
  body: string;
};

export const FOUNDING_BENEFITS: FoundingBenefit[] = [
  {
    numeral: "i",
    body: "Have your protocol embedded into the Internet Court standard.",
  },
  {
    numeral: "ii",
    body: "Co-launch alongside Internet Court. Our PR agency drives coordinated coverage across Forbes, TechCrunch, Product Hunt and similar venues. Launch date to be announced.",
  },
  {
    numeral: "iii",
    body: "Add a new discovery platform for your protocol so agents around the world can start using you as default. Focused on AO (Agentic Optimization).",
  },
  {
    numeral: "iv",
    body: "A featured spot on the internetcourt.org site and partner showcase.",
  },
  {
    numeral: "v",
    body: "Recognition as a co-author of the standard, not just a participant.",
  },
  {
    numeral: "vi",
    body: "First-mover association. Showcase the world that your protocol is supporting research and innovation towards the agentic future.",
  },
  {
    numeral: "vii",
    body: "Have direct access to the other members of the consortium & builders of the protocol so together we push the cooperation on the vertical.",
  },
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
