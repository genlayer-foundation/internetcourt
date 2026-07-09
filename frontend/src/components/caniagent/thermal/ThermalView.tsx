"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LAYERS,
  CONNECTIONS,
  type ReadinessEntry,
} from "@/data/caniagent/taxonomy";
import { getReadiness } from "@/data/caniagent/load";
import {
  colorForScore,
  softForScore,
  labelForScore,
} from "@/components/caniagent/scale";
import { Legend } from "@/components/caniagent/Legend";
import { ReasonCard } from "@/components/caniagent/ReasonCard";

/**
 * caniagent — Variant 3 "Thermal".
 *
 * Bold heatmap of the six-layer agentic-commerce stack rendered as big, stacked
 * heat tiles (01 → 06). Each tile is filled by its layer's readiness color and
 * holds the layer's standards as a grid of heat sub-cells. Hovering/focusing a
 * tile expands it and reveals that layer's integrations as inline connector
 * tabs, rendered on the RIGHT seam of the tile — never on a left gutter, never
 * as arcs/rails/spines.
 *
 * Static-first & robust: expansion is driven purely by CSS (:hover /
 * :focus-within), so the page is fully correct and usable with zero JS. JS only
 * adds two progressive enhancements: a "pinned" docked ReasonCard on click, and
 * a tiny opacity fade respecting prefers-reduced-motion. No DOM-measured SVG
 * geometry anywhere — all layout is flex/grid.
 */

// Layer id -> short single-word tag used on the inline connector tabs so each
// tab can name the OTHER layer compactly without re-printing the full name.
const LAYER_TAG: Record<string, string> = {
  "layer-01": "Discovery",
  "layer-02": "Negotiation",
  "layer-03": "Contracts",
  "layer-04": "Payment",
  "layer-05": "Execution",
  "layer-06": "Verification",
};

export function ThermalView() {
  const r = useMemo(() => getReadiness(), []);

  // Pinned (click-selected) entry shown in the docked side panel. Hover sets a
  // transient preview; pinned wins when present. Both are progressive — with no
  // JS the tiles/sub-cells/tabs still expand and carry aria-labels + titles.
  const [pinned, setPinned] = useState<ReadinessEntry | null>(null);
  const [hovered, setHovered] = useState<ReadinessEntry | null>(null);

  const active = hovered ?? pinned;

  // Close pinned panel on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  return (
    <main className="min-h-screen bg-[#0e0d0c] text-white">
      {/* Header — neutral chrome, red used sparingly as the eyebrow accent */}
      <header className="border-b border-white/10 px-5 py-7 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ef6a6a]">
          caniagent · internal preview
        </p>
        <h1 className="mt-1.5 font-sans text-2xl font-extrabold tracking-tight md:text-4xl">
          Thermal — agentic-commerce readiness
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-white/55">
          Six stacked heat tiles, one per stack layer. Tile fill = layer
          readiness; the cells inside are its standards. Hover or focus a tile to
          expand it and reveal its cross-layer integrations as inline connector
          tabs along the right seam.
        </p>
        <div className="mt-5">
          <Legend className="text-white/70" />
        </div>
      </header>

      {/* Layout: heat stack + docked detail panel (panel collapses under stack
          on small screens; the stack is the source of truth either way). */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* The heat stack */}
        <div className="flex flex-col gap-3">
          {LAYERS.map((layer) => {
            const layerEntry = r.getLayer(layer.id);
            const standards = r.getStandardsForLayer(layer.id);
            const connections = CONNECTIONS.filter(
              (c) => c.from === layer.id || c.to === layer.id,
            ).map((c) => {
              const entry = r.getConnection(c.id);
              const otherId = c.from === layer.id ? c.to : c.from;
              return { entry, otherId };
            });

            return (
              <HeatTile
                key={layer.id}
                n={layer.n}
                name={layer.name}
                layerEntry={layerEntry}
                standards={standards}
                connections={connections}
                pinnedId={pinned?.id ?? null}
                onHover={setHovered}
                onLeave={() => setHovered(null)}
                onPin={(entry) =>
                  setPinned((cur) => (cur?.id === entry.id ? null : entry))
                }
              />
            );
          })}
        </div>

        {/* Docked detail panel — sticky on desktop. Shows hovered (preview) or
            pinned (click) entry. Empty state explains the interaction. */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <DetailPanel
            active={active}
            pinned={pinned}
            onClose={() => setPinned(null)}
          />
        </aside>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// A single big heat tile (one stack layer)
// ---------------------------------------------------------------------------

type ConnRef = { entry: ReadinessEntry; otherId: string };

function HeatTile({
  n,
  name,
  layerEntry,
  standards,
  connections,
  pinnedId,
  onHover,
  onLeave,
  onPin,
}: {
  n: string;
  name: string;
  layerEntry: ReadinessEntry;
  standards: ReadinessEntry[];
  connections: ConnRef[];
  pinnedId: string | null;
  onHover: (e: ReadinessEntry) => void;
  onLeave: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const fill = colorForScore(layerEntry.score);
  const isPinned = pinnedId === layerEntry.id;

  return (
    // `group` + focus-within drives the CSS-only expansion of the connector rail.
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-shadow",
        isPinned ? "border-white/70" : "border-white/10",
      )}
      style={{ backgroundColor: fill }}
    >
      {/* darkening scrim so white text always reads on the bold fill */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/15"
      />

      <div className="relative flex flex-col gap-4 p-4 md:flex-row md:items-stretch md:gap-5 md:p-5">
        {/* LEFT: layer identity (number + name + readiness). This is content,
            NOT a nav gutter — no arrows, rails or arcs live here. */}
        <button
          type="button"
          onMouseEnter={() => onHover(layerEntry)}
          onFocus={() => onHover(layerEntry)}
          onMouseLeave={onLeave}
          onBlur={onLeave}
          onClick={() => onPin(layerEntry)}
          aria-label={`Layer ${n} ${name} — readiness ${labelForScore(
            layerEntry.score,
          )}. Activate for details.`}
          aria-pressed={isPinned}
          className="flex shrink-0 flex-col items-start gap-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-white md:w-56"
        >
          <span className="font-mono text-3xl font-bold leading-none tracking-tight text-white/90 md:text-5xl">
            {n}
          </span>
          <span className="mt-1 font-sans text-base font-extrabold leading-tight text-white md:text-lg">
            {name}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
            {layerEntry.score != null
              ? `${labelForScore(layerEntry.score)} · ${layerEntry.score}/5`
              : labelForScore(layerEntry.score)}
          </span>
        </button>

        {/* MIDDLE: standards as heat sub-cells */}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            Standards
          </div>
          {standards.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {standards.map((s) => (
                <SubCell
                  key={s.id}
                  entry={s}
                  onHover={onHover}
                  onLeave={onLeave}
                  onPin={onPin}
                  pinnedId={pinnedId}
                />
              ))}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-white/55">
              No standards.
            </p>
          )}
        </div>

        {/* RIGHT: inline integration connector tabs. CSS-revealed on
            hover/focus of the tile (group-hover / group-focus-within). They sit
            on the RIGHT seam of the tile — never a left gutter, never arcs. */}
        <div
          className={cn(
            "shrink-0 md:w-52",
            // Expand-on-interaction: hidden-ish by default, revealed when the
            // tile is hovered/focused. motion-light opacity+grid transition;
            // still keyboard-reachable because we only fade, never display:none.
            "motion-safe:transition-all motion-safe:duration-200",
            "opacity-70 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">
            <span aria-hidden>↔</span> Integrations
          </div>
          {connections.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {connections.map(({ entry, otherId }) => (
                <li key={entry.id}>
                  <ConnectorTab
                    entry={entry}
                    otherTag={LAYER_TAG[otherId] ?? otherId}
                    onHover={onHover}
                    onLeave={onLeave}
                    onPin={onPin}
                    pinnedId={pinnedId}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[11px] text-white/55">None.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standard heat sub-cell
// ---------------------------------------------------------------------------

function SubCell({
  entry,
  onHover,
  onLeave,
  onPin,
  pinnedId,
}: {
  entry: ReadinessEntry;
  onHover: (e: ReadinessEntry) => void;
  onLeave: () => void;
  onPin: (e: ReadinessEntry) => void;
  pinnedId: string | null;
}) {
  const color = colorForScore(entry.score);
  const isPinned = pinnedId === entry.id;
  const tick = entry.score ?? 0; // maturity tick: 1→5 filled segments

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(entry)}
      onFocus={() => onHover(entry)}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      onClick={() => onPin(entry)}
      aria-label={`${entry.name} — ${labelForScore(entry.score)}${
        entry.score != null ? ` ${entry.score} of 5` : ""
      }. Activate for details.`}
      aria-pressed={isPinned}
      title={`${entry.name} · ${labelForScore(entry.score)}`}
      className={cn(
        "flex flex-col gap-1 rounded-md border px-2.5 py-1.5 text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-white motion-safe:hover:-translate-y-0.5",
        isPinned ? "border-white" : "border-white/30",
      )}
      style={{ backgroundColor: color }}
    >
      <span className="font-mono text-xs font-semibold leading-none text-white">
        {entry.name}
      </span>
      {/* tiny maturity tick: 5 segments, filled per score */}
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 w-2.5 rounded-[1px]",
              i <= tick ? "bg-white" : "bg-white/25",
            )}
          />
        ))}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inline integration connector tab (right seam, never a left arc)
// ---------------------------------------------------------------------------

function ConnectorTab({
  entry,
  otherTag,
  onHover,
  onLeave,
  onPin,
  pinnedId,
}: {
  entry: ReadinessEntry;
  otherTag: string;
  onHover: (e: ReadinessEntry) => void;
  onLeave: () => void;
  onPin: (e: ReadinessEntry) => void;
  pinnedId: string | null;
}) {
  const color = colorForScore(entry.score);
  const soft = softForScore(entry.score);
  const isPinned = pinnedId === entry.id;

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(entry)}
      onFocus={() => onHover(entry)}
      onMouseLeave={onLeave}
      onBlur={onLeave}
      onClick={() => onPin(entry)}
      aria-label={`Integration with ${otherTag} — ${labelForScore(
        entry.score,
      )}${entry.score != null ? ` ${entry.score} of 5` : ""}. Activate for details.`}
      aria-pressed={isPinned}
      title={`${entry.name} · ${labelForScore(entry.score)}`}
      className={cn(
        "group/tab flex w-full items-center gap-2 rounded-md border bg-black/25 px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white hover:bg-black/40",
        isPinned ? "border-white" : "border-white/20",
      )}
    >
      {/* the colored "connector" — a solid score-colored stub joining the seam
          to the named other layer. Inline, not an arc. */}
      <span
        aria-hidden
        className="h-4 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium text-white">
        {otherTag}
      </span>
      <span
        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]"
        style={{ backgroundColor: soft, color }}
      >
        {entry.score != null ? `${entry.score}/5` : "—"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Docked detail panel (ReasonCard host)
// ---------------------------------------------------------------------------

function DetailPanel({
  active,
  pinned,
  onClose,
}: {
  active: ReadinessEntry | null;
  pinned: ReadinessEntry | null;
  onClose: () => void;
}) {
  if (!active) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
          Detail
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Hover a tile, a standard, or an integration tab to preview its
          readiness. Click to pin the full card here.
        </p>
      </div>
    );
  }

  // Compact while merely hovering (no pin); full once pinned (click).
  const compact = !pinned || pinned.id !== active.id;

  return (
    <div className="motion-safe:transition-opacity">
      {pinned && pinned.id === active.id && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
          >
            Close
          </button>
        </div>
      )}
      <ReasonCard entry={active} compact={compact} />
    </div>
  );
}

export default ThermalView;
