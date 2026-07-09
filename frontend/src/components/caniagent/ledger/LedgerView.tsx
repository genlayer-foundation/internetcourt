"use client";

/**
 * caniagent — Variant 2 "Ledger".
 *
 * An editorial, caniuse-style precise readiness TABLE of the six-layer
 * agentic-commerce stack. One row per layer (01 → 06). Five columns encode the
 * full data contract WITHOUT arcs/rails/spines — connections are shown inline as
 * small colored squares (see the Integrations column).
 *
 * Static-first & robust: every cell renders correct with zero JS. The docked
 * ReasonCard panel and the GSAP row stagger are progressive enhancement only;
 * with JS off the table is fully legible and the heatmap colors carry meaning.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LAYERS,
  getReadiness,
  type LayerDef,
} from "@/data/caniagent/load";
import type { ReadinessEntry } from "@/data/caniagent/taxonomy";
import {
  UNRATED,
  colorForScore,
  softForScore,
  labelForScore,
} from "@/components/caniagent/scale";
import { Legend } from "@/components/caniagent/Legend";
import { ReasonCard } from "@/components/caniagent/ReasonCard";

// Synchronous, pure loader — safe to call at module/render time.
const R = getReadiness();

/** Dependency-free reduced-motion hook (matchMedia). SSR-safe. */
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/** Layer readiness as a caniuse-style percentage: score 1..5 → 20..100%. */
function pctForScore(score: number | null): number {
  if (score == null) return 0;
  return Math.max(0, Math.min(100, score * 20));
}

/** Short name for a layer id, for connection square labels. */
function layerShortName(id: string | null): string {
  const l = LAYERS.find((x) => x.id === id);
  return l ? `${l.n} ${l.name}` : "—";
}

type Selected = { entry: ReadinessEntry; pinned: boolean } | null;

export function LedgerView() {
  const [selected, setSelected] = useState<Selected>(null);
  const reduceMotion = usePrefersReducedMotion();
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);

  // Hover/focus → compact preview (not pinned). Click/Enter → pin full card.
  const preview = useCallback((entry: ReadinessEntry) => {
    setSelected((cur) => (cur?.pinned ? cur : { entry, pinned: false }));
  }, []);
  const clearPreview = useCallback(() => {
    setSelected((cur) => (cur && !cur.pinned ? null : cur));
  }, []);
  const pin = useCallback((entry: ReadinessEntry) => {
    setSelected((cur) =>
      cur?.pinned && cur.entry.id === entry.id ? null : { entry, pinned: true },
    );
  }, []);

  // Esc closes the pinned panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Progressive enhancement: GSAP row stagger-in. Reduced-motion → no-op.
  useEffect(() => {
    if (reduceMotion) return;
    const root = tbodyRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>("tr"));
    let cancelled = false;
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (cancelled) return;
        gsap.from(rows, {
          opacity: 0,
          y: 14,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.07,
          clearProps: "opacity,transform",
        });
      } catch {
        /* gsap missing → static is already correct */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  return (
    <main className="min-h-screen bg-[#fafaf9] text-[#1a1817]">
      {/* Page header — neutral chrome, single red eyebrow. No left nav. */}
      <header className="border-b border-black/10 bg-white px-5 py-7 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#dc2626]">
          caniagent · variant 2 — ledger
        </p>
        <h1 className="mt-1.5 font-heading text-3xl md:text-4xl">
          Agent-commerce stack readiness
        </h1>
        <p className="mt-2 max-w-2xl font-mono text-xs leading-relaxed text-[#74706c]">
          A caniuse-style ledger of the six-layer agent-to-agent commerce stack.
          Each row is a layer; chips are its standards; the bar is its readiness;
          the squares on the right are integrations with other layers. Hover or
          focus any colored element for the verdict, click to pin the full
          reasoning.
        </p>
        <div className="mt-5">
          <Legend />
        </div>
      </header>

      {/* The ledger table — fully legible with zero JS. */}
      <div className="px-3 pb-40 pt-5 md:px-8">
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white shadow-sm">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-[#1a1817] text-white">
              <tr className="font-mono text-[10px] uppercase tracking-[0.16em]">
                <Th className="w-[44px] text-center">#</Th>
                <Th className="w-[26%]">Layer</Th>
                <Th className="w-[30%]">Standards</Th>
                <Th className="w-[20%]">Readiness</Th>
                <Th className="w-[22%]">Integrations</Th>
              </tr>
            </thead>
            <tbody ref={tbodyRef} className="divide-y divide-black/[0.07]">
              {LAYERS.map((layer) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  selectedId={selected?.entry.id ?? null}
                  onPreview={preview}
                  onClearPreview={clearPreview}
                  onPin={pin}
                />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a29e]">
          Internal design preview · noindex · readiness data is authored research
        </p>
      </div>

      {/* Docked panel — floats bottom-right; compact on hover, full when pinned. */}
      <DockedPanel selected={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Table primitives
// ---------------------------------------------------------------------------

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-white/10 px-3 py-2.5 align-middle font-medium",
        className,
      )}
    >
      {children}
    </th>
  );
}

// ---------------------------------------------------------------------------
// One layer row = all five columns
// ---------------------------------------------------------------------------

type RowHandlers = {
  onPreview: (e: ReadinessEntry) => void;
  onClearPreview: () => void;
  onPin: (e: ReadinessEntry) => void;
};

function LayerRow({
  layer,
  selectedId,
  ...h
}: { layer: LayerDef; selectedId: string | null } & RowHandlers) {
  const layerEntry = R.getLayer(layer.id);
  const standards = R.getStandardsForLayer(layer.id);
  // Connections that involve this layer — filtered, NO arcs drawn.
  const connections = R.getAllConnections().filter(
    (c) => c.from === layer.id || c.to === layer.id,
  );

  const color = colorForScore(layerEntry.score);
  const isActive = selectedId === layerEntry.id;

  return (
    <tr className="group align-top transition-colors hover:bg-[#fafaf8]">
      {/* # — ordinal, red accent */}
      <td className="px-3 py-4 text-center align-middle">
        <span className="font-mono text-sm font-semibold tabular-nums text-[#dc2626]">
          {layer.n}
        </span>
      </td>

      {/* Layer — name + status pill (colored by layer score). Focusable. */}
      <td className="px-3 py-4">
        <button
          type="button"
          onMouseEnter={() => h.onPreview(layerEntry)}
          onMouseLeave={h.onClearPreview}
          onFocus={() => h.onPreview(layerEntry)}
          onBlur={h.onClearPreview}
          onClick={() => h.onPin(layerEntry)}
          aria-label={`Layer ${layer.n}: ${layer.name}. Readiness ${labelForScore(
            layerEntry.score,
          )}. View details.`}
          className={cn(
            "block w-full rounded-md text-left outline-none transition",
            "focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
            isActive && "ring-2 ring-[#1a1817]/30",
          )}
        >
          <span className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 rounded-[3px]"
              style={{ backgroundColor: color }}
            />
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight tracking-tight">
                {layer.name}
              </span>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em]"
                style={{
                  backgroundColor: softForScore(layerEntry.score),
                  color,
                }}
              >
                {layerEntry.score != null
                  ? `${labelForScore(layerEntry.score)} · ${layerEntry.score}/5`
                  : UNRATED.label}
              </span>
            </span>
          </span>
        </button>
      </td>

      {/* Standards — one colored chip per standard, colored by its own score. */}
      <td className="px-3 py-4">
        <div className="flex flex-wrap gap-1.5">
          {standards.length === 0 && (
            <span className="font-mono text-[11px] text-[#a8a29e]">—</span>
          )}
          {standards.map((s) => (
            <StandardChip
              key={s.id}
              entry={s}
              active={selectedId === s.id}
              {...h}
            />
          ))}
        </div>
      </td>

      {/* Readiness — caniuse-style filled %-bar, colored by layer score. */}
      <td className="px-3 py-4">
        <ReadinessBar entry={layerEntry} />
      </td>

      {/* Integrations — inline strip of small colored squares, ONE per
          connection involving this layer. NO arcs/lines. */}
      <td className="px-3 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {connections.length === 0 && (
            <span className="font-mono text-[11px] text-[#a8a29e]">—</span>
          )}
          {connections.map((c) => {
            const otherId = c.from === layer.id ? c.to : c.from;
            return (
              <ConnectionSquare
                key={c.id}
                entry={c}
                otherName={layerShortName(otherId)}
                active={selectedId === c.id}
                {...h}
              />
            );
          })}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Standards column — colored chip with a tiny maturity hint
// ---------------------------------------------------------------------------

function StandardChip({
  entry,
  active,
  onPreview,
  onClearPreview,
  onPin,
}: { entry: ReadinessEntry; active: boolean } & RowHandlers) {
  const color = colorForScore(entry.score);
  const soft = softForScore(entry.score);
  const label = labelForScore(entry.score);

  return (
    <button
      type="button"
      onMouseEnter={() => onPreview(entry)}
      onMouseLeave={onClearPreview}
      onFocus={() => onPreview(entry)}
      onBlur={onClearPreview}
      onClick={() => onPin(entry)}
      aria-label={`Standard ${entry.name}: ${label}${
        entry.score != null ? ` ${entry.score} of 5` : ""
      }. View details.`}
      title={`${entry.name} — ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] font-medium leading-none outline-none transition",
        "hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
        active && "ring-2 ring-[#1a1817]/30",
      )}
      style={{
        backgroundColor: soft,
        borderColor: color,
        color: "#1a1817",
      }}
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="whitespace-nowrap">{entry.name}</span>
      {/* tiny maturity hint */}
      <span
        aria-hidden="true"
        className="whitespace-nowrap font-normal uppercase tracking-[0.06em] opacity-70"
        style={{ color }}
      >
        {entry.score != null ? `${entry.score}/5` : "n/a"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Readiness column — filled horizontal %-bar (caniuse style)
// ---------------------------------------------------------------------------

function ReadinessBar({ entry }: { entry: ReadinessEntry }) {
  const color = colorForScore(entry.score);
  const pct = pctForScore(entry.score);
  const label = labelForScore(entry.score);

  return (
    <div
      className="w-full"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`Readiness ${pct}% — ${label}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#74706c]">
          {label}
        </span>
        <span
          className="font-mono text-xs font-semibold tabular-nums"
          style={{ color }}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${entry.score == null ? 100 : pct}%`,
            backgroundColor: entry.score == null ? UNRATED.color : color,
            opacity: entry.score == null ? 0.4 : 1,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integrations column — one small colored square per connection (NO arcs)
// ---------------------------------------------------------------------------

function ConnectionSquare({
  entry,
  otherName,
  active,
  onPreview,
  onClearPreview,
  onPin,
}: {
  entry: ReadinessEntry;
  otherName: string;
  active: boolean;
} & RowHandlers) {
  const color = colorForScore(entry.score);
  const label = labelForScore(entry.score);

  return (
    <button
      type="button"
      onMouseEnter={() => onPreview(entry)}
      onMouseLeave={onClearPreview}
      onFocus={() => onPreview(entry)}
      onBlur={onClearPreview}
      onClick={() => onPin(entry)}
      aria-label={`Integration with ${otherName}: ${label}${
        entry.score != null ? ` ${entry.score} of 5` : ""
      }. View details.`}
      title={`↔ ${otherName} — ${label}`}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-[4px] outline-none transition",
        "hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#1a1817]/50",
        active && "ring-2 ring-[#1a1817] ring-offset-1",
      )}
      style={{ backgroundColor: color }}
    >
      <span className="font-mono text-[9px] font-bold leading-none text-white/90 tabular-nums">
        {entry.score ?? "·"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Docked panel — renders the ReasonCard. Compact on hover, full when pinned.
// ---------------------------------------------------------------------------

function DockedPanel({
  selected,
  onClose,
}: {
  selected: Selected;
  onClose: () => void;
}) {
  const titleId = useId();
  if (!selected) return null;
  const { entry, pinned } = selected;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 md:justify-end md:px-6 md:pb-6"
      aria-live="polite"
    >
      <div
        className="pointer-events-auto w-full max-w-sm"
        role={pinned ? "dialog" : undefined}
        aria-modal={pinned ? false : undefined}
        aria-labelledby={pinned ? titleId : undefined}
      >
        {pinned && (
          <div className="mb-1.5 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#1a1817] px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white shadow-md transition hover:bg-black"
            >
              Close ✕
            </button>
          </div>
        )}
        <span id={titleId} className="sr-only">
          {entry.name} readiness detail
        </span>
        <ReasonCard
          entry={entry}
          compact={!pinned}
          className="max-w-none shadow-2xl ring-1 ring-black/5"
        />
      </div>
    </div>
  );
}

export default LedgerView;
