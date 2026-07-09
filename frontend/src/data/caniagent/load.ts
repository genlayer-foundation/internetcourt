/**
 * caniagent readiness loader.
 *
 * Merges the fixed taxonomy with graded readiness data and exposes typed
 * accessors used by all five variant pages.
 *
 * Data sources, in priority order:
 *   1. `readiness.json`        — REAL data (Thread B). Optional; preferred per id.
 *   2. `readiness.sample.json` — MOCK fallback (always present).
 *
 * The merge is per-id: each taxonomy id resolves to real data if available,
 * otherwise sample data, otherwise a gray "unrated" placeholder (score: null).
 * Dropping `readiness.json` into this folder later "just works" — no code change
 * needed beyond uncommenting the import below.
 */

import {
  ALL_IDS,
  CONNECTIONS,
  LAYERS,
  STANDARDS,
  type ConnectionDef,
  type LayerDef,
  type ReadinessEntry,
} from "./taxonomy";

import sampleData from "./readiness.sample.json";

/**
 * REAL data. Once Thread B commits `readiness.json` in this folder, uncomment
 * the import below and the loader will prefer it per id automatically.
 *
 * Thread B has committed `readiness.json` (real researched data), so the
 * loader now prefers it per id automatically; sample data is fallback only.
 */
import realDataJson from "./readiness.json";
const realData = realDataJson as ReadinessEnvelope;

/** The §4.3 file envelope. */
interface ReadinessEnvelope {
  version: number;
  generatedAt: string;
  entries: ReadinessEntry[];
}

function indexEntries(envelope: ReadinessEnvelope | null): Map<string, ReadinessEntry> {
  const map = new Map<string, ReadinessEntry>();
  if (!envelope) return map;
  for (const entry of envelope.entries) {
    map.set(entry.id, entry);
  }
  return map;
}

const sampleIndex = indexEntries(sampleData as ReadinessEnvelope);
const realIndex = indexEntries(realData);

/** Look up the name/title/type seed for an id from the taxonomy. */
function placeholderFor(id: string): ReadinessEntry {
  const layer = LAYERS.find((l) => l.id === id);
  if (layer) {
    return {
      id,
      type: "layer",
      layer: layer.id,
      from: null,
      to: null,
      name: layer.name,
      title: "",
      score: null,
      status: null,
      summary: "",
      reason: "",
      sources: [],
      notes: "unrated — no readiness data",
      lastReviewed: "",
    };
  }

  const standard = STANDARDS.find((s) => s.id === id);
  if (standard) {
    return {
      id,
      type: "standard",
      layer: standard.layer,
      from: null,
      to: null,
      name: standard.name,
      title: standard.title,
      score: null,
      status: null,
      summary: "",
      reason: "",
      sources: [],
      notes: "unrated — no readiness data",
      lastReviewed: "",
    };
  }

  const connection = CONNECTIONS.find((c) => c.id === id);
  if (connection) {
    return {
      id,
      type: "connection",
      layer: null,
      from: connection.from,
      to: connection.to,
      name: connection.label,
      title: "",
      score: null,
      status: null,
      summary: "",
      reason: "",
      sources: [],
      notes: "unrated — no readiness data",
      lastReviewed: "",
    };
  }

  // Unknown id — still return a safe placeholder rather than throwing.
  return {
    id,
    type: "standard",
    layer: null,
    from: null,
    to: null,
    name: id,
    title: "",
    score: null,
    status: null,
    summary: "",
    reason: "",
    sources: [],
    notes: "unrated — unknown id",
    lastReviewed: "",
  };
}

/** Merge real → sample → placeholder for a single id. */
function resolveEntry(id: string): ReadinessEntry {
  return realIndex.get(id) ?? sampleIndex.get(id) ?? placeholderFor(id);
}

export interface Readiness {
  /** Every taxonomy id mapped to its resolved entry. */
  entries: Map<string, ReadinessEntry>;
  /** Resolved entry for an id (never throws; returns a gray placeholder). */
  getEntry(id: string): ReadinessEntry;
  /** Resolved entry for a layer id, or the unrated placeholder. */
  getLayer(id: string): ReadinessEntry;
  /** Standards belonging to a layer, in taxonomy order, each resolved. */
  getStandardsForLayer(layerId: string): ReadinessEntry[];
  /** Resolved entry for a connection id, or the unrated placeholder. */
  getConnection(id: string): ReadinessEntry;
  /** All connection entries, in taxonomy order, each resolved. */
  getAllConnections(): ReadinessEntry[];
}

/**
 * Build the merged, typed readiness view. Synchronous and pure — safe to call
 * in Server Components at render time.
 */
export function getReadiness(): Readiness {
  const entries = new Map<string, ReadinessEntry>();
  for (const id of ALL_IDS) {
    entries.set(id, resolveEntry(id));
  }

  const getEntry = (id: string): ReadinessEntry =>
    entries.get(id) ?? resolveEntry(id);

  const getLayer = (id: string): ReadinessEntry => getEntry(id);

  const getStandardsForLayer = (layerId: string): ReadinessEntry[] =>
    STANDARDS.filter((s) => s.layer === layerId).map((s) => getEntry(s.id));

  const getConnection = (id: string): ReadinessEntry => getEntry(id);

  const getAllConnections = (): ReadinessEntry[] =>
    CONNECTIONS.map((c: ConnectionDef) => getEntry(c.id));

  return {
    entries,
    getEntry,
    getLayer,
    getStandardsForLayer,
    getConnection,
    getAllConnections,
  };
}

/** Re-export the layer defs for convenience (variants iterate layers a lot). */
export { LAYERS, STANDARDS, CONNECTIONS };
export type { LayerDef };
