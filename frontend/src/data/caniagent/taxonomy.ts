/**
 * caniagent taxonomy — the authoritative, fixed entry list for the
 * agentic-commerce readiness heatmap.
 *
 * Three entry kinds (see caniagent-plan.md §4.1):
 *  - Layers (6)        — the six-layer agent-commerce stack (mirrors STACK_ROWS).
 *  - Standards (14)    — named protocols/standards living inside a layer.
 *  - Connections (8)   — integrations (edges) between layers.
 *
 * Layer names/standards are kept in sync with STACK_ROWS in
 * `@/lib/site-content`. Thread B (research) grades every id defined here.
 */

// ---------------------------------------------------------------------------
// Shared types (shared data contract — §4.3)
// ---------------------------------------------------------------------------

export type EntryType = "layer" | "standard" | "connection";

/** 1 (theoretical) .. 5 (production). See §4.2. */
export type ReadinessScore = 1 | 2 | 3 | 4 | 5;

export type ReadinessStatus =
  | "production"
  | "available"
  | "emerging"
  | "experimental"
  | "theoretical";

/** How confident the research is in a given adoption metric. */
export type MetricConfidence = "high" | "medium" | "low";

/**
 * A single quantitative adoption data-point (Thread B deep research).
 * `value` is a short human string carrying the number PLUS any skeptical
 * caveat (e.g. raw on-chain tx vs. real paying agents).
 */
export interface AdoptionMetric {
  /** Short label, e.g. "Live paid endpoints", "Active agents", "Volume". */
  label: string;
  /** The figure + caveat, e.g. "~100M tx on Base, but largely bot/test/wash". */
  value: string;
  /** When this figure was observed/reported, e.g. "2026-06". */
  asOf: string;
  confidence: MetricConfidence;
}

/**
 * A named partner / adopter / backer / integrator of an entry, wherever it
 * lives (company + HQ, protocol, open-source project, foundation, DAO).
 */
export interface Partner {
  name: string;
  /** e.g. "creator", "steward", "backer", "integrator", "adopter", "SDK". */
  role: string;
  /** HQ country, or "protocol" / "open-source" / "DAO" / "foundation". */
  where: string;
}

/**
 * A single graded entry, matching the `readiness.json` schema (§4.3).
 * One per taxonomy id. For layers/standards `from`/`to` are null; for
 * connections `layer` is null and `from`/`to` are set.
 */
export interface ReadinessEntry {
  /** Matches a taxonomy id EXACTLY. */
  id: string;
  type: EntryType;
  /** Parent layer id for standards; layer's own id for layers; null for connections. */
  layer: string | null;
  /** Connections only: source layer id. */
  from: string | null;
  /** Connections only: target layer id. */
  to: string | null;
  name: string;
  title: string;
  /** 1..5, or null when no data exists yet ("unrated" placeholder). */
  score: ReadinessScore | null;
  status: ReadinessStatus | null;
  /** One sentence (<140 chars) for the hover card. */
  summary: string;
  /** Exactly two paragraphs, separated by a blank line ("\n\n"). */
  reason: string;
  /** 1–6 real URLs consulted. */
  sources: string[];
  /** Optional: corrections, caveats, name disputes. */
  notes?: string;
  /** Deep-research adoption figures (sites, agents, volume) with caveats. */
  metrics?: AdoptionMetric[];
  /** Exhaustive partner/adopter/backer list, wherever they live. */
  partners?: Partner[];
  lastReviewed: string;
}

// ---------------------------------------------------------------------------
// Taxonomy entry types (the fixed structure, pre-grading)
// ---------------------------------------------------------------------------

export interface LayerDef {
  id: string;
  /** Two-digit ordinal, matching STACK_ROWS ("01".."06"). */
  n: string;
  name: string;
  /** Raw standards string from STACK_ROWS (for reference/display). */
  standards: string;
}

export interface StandardDef {
  id: string;
  /** Parent layer id. */
  layer: string;
  name: string;
  /** Seed description; research confirms/corrects. */
  title: string;
}

export interface ConnectionDef {
  id: string;
  /** Source layer id. */
  from: string;
  /** Target layer id. */
  to: string;
  /** Human-readable edge label. */
  label: string;
}

// ---------------------------------------------------------------------------
// Layers (6) — ids/names mirror STACK_ROWS in @/lib/site-content
// ---------------------------------------------------------------------------

export const LAYERS: LayerDef[] = [
  { id: "layer-01", n: "01", name: "Discovery, identity & reputation", standards: "ERC-7857, ERC-8004" },
  { id: "layer-02", n: "02", name: "Negotiation", standards: "A2A" },
  { id: "layer-03", n: "03", name: "Contracts & obligations", standards: "ERC-7710, ERC-8183, Arkhai" },
  { id: "layer-04", n: "04", name: "Payment & escrow", standards: "x402, MPP, APP" },
  { id: "layer-05", n: "05", name: "Execution", standards: "OpenClaw, Hermes" },
  { id: "layer-06", n: "06", name: "Verification & disputes", standards: "GenLayer, Kleros, UMA" },
];

// ---------------------------------------------------------------------------
// Standards (14) — §4.1
// ---------------------------------------------------------------------------

export const STANDARDS: StandardDef[] = [
  { id: "std-erc7857", layer: "layer-01", name: "ERC-7857", title: "Verifiable identity / agent identity NFTs" },
  { id: "std-erc8004", layer: "layer-01", name: "ERC-8004", title: "Trustless agent reputation/registry" },
  { id: "std-a2a", layer: "layer-02", name: "A2A", title: "Google Agent-to-Agent negotiation protocol" },
  { id: "std-erc7710", layer: "layer-03", name: "ERC-7710", title: "Smart-contract delegation" },
  { id: "std-erc8183", layer: "layer-03", name: "ERC-8183", title: "Obligations standard" },
  { id: "std-arkhai", layer: "layer-03", name: "Arkhai", title: "Obligations / agreements framework" },
  { id: "std-x402", layer: "layer-04", name: "x402", title: "HTTP 402 stablecoin payments" },
  { id: "std-mpp", layer: "layer-04", name: "MPP", title: "Merchant/agent payment protocol" },
  { id: "std-app", layer: "layer-04", name: "APP", title: "Agent payments protocol" },
  { id: "std-openclaw", layer: "layer-05", name: "OpenClaw", title: "Execution framework" },
  { id: "std-hermes", layer: "layer-05", name: "Hermes", title: "Execution/messaging" },
  { id: "std-genlayer", layer: "layer-06", name: "GenLayer", title: "Intelligent-contract AI jury" },
  { id: "std-kleros", layer: "layer-06", name: "Kleros", title: "Decentralized arbitration" },
  { id: "std-uma", layer: "layer-06", name: "UMA", title: "Optimistic oracle" },
];

// ---------------------------------------------------------------------------
// Connections (8) — integrations (edges) between layers — §4.1
// ---------------------------------------------------------------------------

export const CONNECTIONS: ConnectionDef[] = [
  { id: "conn-01-02", from: "layer-01", to: "layer-02", label: "Discovery → Negotiation" },
  { id: "conn-02-03", from: "layer-02", to: "layer-03", label: "Negotiation → Contracts" },
  { id: "conn-03-04", from: "layer-03", to: "layer-04", label: "Contracts → Payment/Escrow" },
  { id: "conn-04-05", from: "layer-04", to: "layer-05", label: "Payment → Execution" },
  { id: "conn-05-06", from: "layer-05", to: "layer-06", label: "Execution → Verification" },
  { id: "conn-01-06", from: "layer-01", to: "layer-06", label: "Identity ↔ Verification (reputation loop)" },
  { id: "conn-03-06", from: "layer-03", to: "layer-06", label: "Contracts ↔ Verification (obligations judged)" },
  { id: "conn-04-06", from: "layer-04", to: "layer-06", label: "Escrow ↔ Verification (resolution releases funds)" },
];

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export const TAXONOMY = {
  layers: LAYERS,
  standards: STANDARDS,
  connections: CONNECTIONS,
} as const;

/** Every taxonomy id (layers + standards + connections), in render order. */
export const ALL_IDS: string[] = [
  ...LAYERS.map((l) => l.id),
  ...STANDARDS.map((s) => s.id),
  ...CONNECTIONS.map((c) => c.id),
];
