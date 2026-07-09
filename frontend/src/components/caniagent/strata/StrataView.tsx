"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import {
  getReadiness,
  LAYERS,
  CONNECTIONS,
} from "@/data/caniagent/load";
import type { ReadinessEntry } from "@/data/caniagent/taxonomy";
import {
  colorForScore,
  softForScore,
  labelForScore,
} from "@/components/caniagent/scale";
import { Legend } from "@/components/caniagent/Legend";
import { ReasonCard } from "@/components/caniagent/ReasonCard";

/* --------------------------------------------------------------------------
 * Strata — geological readiness map.
 *
 * 6 full-width horizontal BANDS stacked (layers 01→06), tinted by layer
 * readiness. Inside each band a left→right maturity axis (5 zones,
 * Theoretical→Production) plots that layer's standards as nodes at their score
 * column. ADJACENT connections live in the SEAM (fault line) between two bands,
 * colored by integration score. NON-adjacent connections (e.g. 01↔06) appear
 * as small markers on the right edge of each band they touch.
 *
 * Static-first: the markup renders fully correct with zero JS (CSS grid +
 * flex, no measured SVG geometry). GSAP only fades/slides bands in on scroll
 * as progressive enhancement; reduced-motion → static final state.
 * -------------------------------------------------------------------------- */

// The maturity axis: score 1→5 maps to these 5 zones, left→right.
const MATURITY_ZONES = [
  { score: 1, label: "Theoretical" },
  { score: 2, label: "Experimental" },
  { score: 3, label: "Emerging" },
  { score: 4, label: "Available" },
  { score: 5, label: "Production" },
] as const;

// Adjacent connection ids sit in the seam between layer N and layer N+1.
const SEAM_FOR: Record<string, string> = {
  // key: "<upper layer id>|<lower layer id>"
};
for (const c of CONNECTIONS) {
  const fromN = Number(c.from.replace("layer-", ""));
  const toN = Number(c.to.replace("layer-", ""));
  if (Math.abs(fromN - toN) === 1) {
    const upper = fromN < toN ? c.from : c.to;
    const lower = fromN < toN ? c.to : c.from;
    SEAM_FOR[`${upper}|${lower}`] = c.id;
  }
}

// Non-adjacent connections, grouped by each layer they touch (right-edge markers).
const NONADJ_BY_LAYER: Record<string, string[]> = {};
for (const c of CONNECTIONS) {
  const fromN = Number(c.from.replace("layer-", ""));
  const toN = Number(c.to.replace("layer-", ""));
  if (Math.abs(fromN - toN) !== 1) {
    (NONADJ_BY_LAYER[c.from] ??= []).push(c.id);
    (NONADJ_BY_LAYER[c.to] ??= []).push(c.id);
  }
}

type Focused = { entry: ReadinessEntry } | null;

export function StrataView() {
  const r = useMemo(() => getReadiness(), []);
  const rootRef = useRef<HTMLDivElement>(null);

  // Hover → compact preview; click → pinned full card in the docked panel.
  const [hovered, setHovered] = useState<Focused>(null);
  const [pinned, setPinned] = useState<Focused>(null);

  // The card on display: pinned wins, else hovered.
  const active = pinned ?? hovered;

  // GSAP entrance — bands fade/slide in on scroll, staggered. Static fallback
  // for reduced-motion (bands stay at their natural final state).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const bands = gsap.utils.toArray<HTMLElement>(".st-band", el);
      gsap.from(bands, {
        autoAlpha: 0,
        y: 26,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: el,
          start: "top 78%",
          once: true,
        },
      });
    });

    return () => mm.revert();
  }, []);

  const focus = (entry: ReadinessEntry) => setHovered({ entry });
  const blur = () => setHovered(null);
  const pin = (entry: ReadinessEntry) =>
    setPinned((cur) => (cur?.entry.id === entry.id ? null : { entry }));

  return (
    <main className="bg-[#fafaf9] text-[#1a1817]">
      {/* Preview chrome — internal banner (no left back-arrow / nav). */}
      <header className="border-b border-black/10 bg-[#1a1817] px-5 py-6 text-white md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ef6a6a]">
          Internal preview · caniagent
        </p>
        <h1 className="mt-1 font-heading text-2xl md:text-3xl">
          Strata — the agentic-commerce stack as readiness bedrock
        </h1>
        <p className="mt-1 max-w-2xl font-mono text-xs leading-relaxed text-white/50">
          Six stacked strata, one per layer. Each band is tinted by its
          readiness; standards are plotted left→right along a maturity axis. The
          fault line between two layers carries their integration score; skip
          connections appear as edge markers.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Maturity-axis key + readiness legend */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#74706c]">
              Maturity axis →
            </div>
            <div className="mt-1.5 grid grid-cols-5 gap-1 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-[#9a958f] md:text-[10px]">
              {MATURITY_ZONES.map((z) => (
                <span key={z.score}>{z.label}</span>
              ))}
            </div>
          </div>
          <Legend />
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* ---- The strata column ---- */}
          <div ref={rootRef} className="min-w-0 flex-1">
            {LAYERS.map((layer, i) => {
              const layerEntry = r.getLayer(layer.id);
              const standards = r.getStandardsForLayer(layer.id);
              const nonAdj = (NONADJ_BY_LAYER[layer.id] ?? []).map((id) =>
                r.getConnection(id),
              );

              // Seam BELOW this band (between layer i and layer i+1), if adjacent.
              const next = LAYERS[i + 1];
              const seamConnId = next
                ? SEAM_FOR[`${layer.id}|${next.id}`]
                : undefined;
              const seamEntry = seamConnId
                ? r.getConnection(seamConnId)
                : null;

              return (
                <div key={layer.id}>
                  <Band
                    layer={layer}
                    layerEntry={layerEntry}
                    standards={standards}
                    nonAdj={nonAdj}
                    activeId={active?.entry.id}
                    onFocus={focus}
                    onBlur={blur}
                    onPin={pin}
                    first={i === 0}
                  />
                  {seamEntry && (
                    <Seam
                      entry={seamEntry}
                      activeId={active?.entry.id}
                      onFocus={focus}
                      onBlur={blur}
                      onPin={pin}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ---- Docked detail panel (sticky on desktop) ---- */}
          <aside className="lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-1">
              {active ? (
                <ReasonCard
                  key={active.entry.id}
                  entry={active.entry}
                  compact={!pinned || pinned.entry.id !== active.entry.id}
                  className="max-w-none border-0 shadow-none"
                />
              ) : (
                <div className="p-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
                    Detail
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#74706c]">
                    Hover any layer, standard node, fault line, or edge marker
                    for a preview. Click to pin the full reason and sources
                    here.
                  </p>
                </div>
              )}
            </div>
            {pinned && (
              <button
                type="button"
                onClick={() => setPinned(null)}
                className="mt-2 w-full rounded-lg border border-[#e5e7eb] bg-white py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c] transition-colors hover:border-[#dc2626]/40 hover:text-[#dc2626]"
              >
                Unpin
              </button>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ Band -- */

function Band({
  layer,
  layerEntry,
  standards,
  nonAdj,
  activeId,
  onFocus,
  onBlur,
  onPin,
  first,
}: {
  layer: (typeof LAYERS)[number];
  layerEntry: ReadinessEntry;
  standards: ReadinessEntry[];
  nonAdj: ReadinessEntry[];
  activeId?: string;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
  first: boolean;
}) {
  const accent = colorForScore(layerEntry.score);
  const tint = softForScore(layerEntry.score);
  const isActive = activeId === layer.id;

  // Group standards by maturity column (score 1..5). Unrated → column "?".
  const byColumn = useMemo(() => {
    const cols: Record<number, ReadinessEntry[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      0: [], // unrated bucket, rendered before the axis
    };
    for (const s of standards) {
      cols[s.score ?? 0].push(s);
    }
    return cols;
  }, [standards]);

  return (
    <section
      className={cn(
        "st-band relative grid grid-cols-1 overflow-hidden border border-[#e9e7e4] md:grid-cols-[200px_1fr]",
        first ? "rounded-t-xl" : "",
      )}
      style={{
        backgroundColor: tint,
        // Left strata accent — vertical, NOT a connection rail (that's the seam).
        boxShadow: `inset 4px 0 0 ${accent}`,
      }}
      aria-label={`Layer ${layer.n}: ${layer.name} — ${labelForScore(
        layerEntry.score,
      )}`}
    >
      {/* Layer header cell — number, name, readiness pill. Focusable → card. */}
      <button
        type="button"
        onMouseEnter={() => onFocus(layerEntry)}
        onFocus={() => onFocus(layerEntry)}
        onMouseLeave={onBlur}
        onBlur={onBlur}
        onClick={() => onPin(layerEntry)}
        aria-label={`Layer ${layer.n} ${layer.name}, readiness ${labelForScore(
          layerEntry.score,
        )}. Open detail.`}
        className={cn(
          "flex flex-col items-start gap-2 border-b border-black/5 px-5 py-5 text-left transition-colors md:border-b-0 md:border-r",
          isActive && "bg-white/40",
        )}
      >
        <span
          className="inline-flex h-7 items-center rounded-md px-2 font-mono text-xs font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {layer.n}
        </span>
        <span className="font-sans text-sm font-bold leading-tight md:text-base">
          {layer.name}
        </span>
        <span
          className="font-mono text-[10px] uppercase tracking-[0.12em]"
          style={{ color: accent }}
        >
          {labelForScore(layerEntry.score)}
          {layerEntry.score != null ? ` · ${layerEntry.score}/5` : ""}
        </span>
      </button>

      {/* Maturity axis — 5 columns, standards plotted by score. */}
      <div className="relative px-3 py-4 md:px-4">
        {/* Unrated standards sit outside the scored axis. */}
        {byColumn[0].length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {byColumn[0].map((s) => (
              <StandardNode
                key={s.id}
                entry={s}
                activeId={activeId}
                onFocus={onFocus}
                onBlur={onBlur}
                onPin={onPin}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5">
          {MATURITY_ZONES.map((zone, ci) => (
            <div
              key={zone.score}
              className={cn(
                "flex min-h-[3.25rem] flex-col gap-1.5 rounded-md border border-dashed border-black/[0.06] p-1.5",
                ci > 0 && "border-l-black/10",
              )}
            >
              {byColumn[zone.score].map((s) => (
                <StandardNode
                  key={s.id}
                  entry={s}
                  activeId={activeId}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onPin={onPin}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right-edge markers for non-adjacent (skip) connections. */}
      {nonAdj.length > 0 && (
        <div className="pointer-events-none absolute right-1.5 top-1.5 flex flex-col gap-1">
          {nonAdj.map((c) => (
            <SkipMarker
              key={c.id}
              entry={c}
              activeId={activeId}
              onFocus={onFocus}
              onBlur={onBlur}
              onPin={onPin}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* --------------------------------------------------------- StandardNode -- */

function StandardNode({
  entry,
  activeId,
  onFocus,
  onBlur,
  onPin,
}: {
  entry: ReadinessEntry;
  activeId?: string;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const color = colorForScore(entry.score);
  const isActive = activeId === entry.id;
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(entry)}
      onFocus={() => onFocus(entry)}
      onMouseLeave={onBlur}
      onBlur={onBlur}
      onClick={() => onPin(entry)}
      aria-label={`${entry.name} standard, ${labelForScore(
        entry.score,
      )}. Open detail.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-white/85 px-2 py-1 font-mono text-[11px] font-medium leading-none text-[#1a1817] shadow-sm transition-all hover:-translate-y-px hover:shadow-md focus:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        isActive ? "ring-2 ring-offset-1" : "border-black/10",
      )}
      style={
        {
          borderColor: isActive ? color : undefined,
          "--tw-ring-color": color,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {entry.name}
    </button>
  );
}

/* ------------------------------------------------------------------ Seam -- */

function Seam({
  entry,
  activeId,
  onFocus,
  onBlur,
  onPin,
}: {
  entry: ReadinessEntry;
  activeId?: string;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const color = colorForScore(entry.score);
  const isActive = activeId === entry.id;
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(entry)}
      onFocus={() => onFocus(entry)}
      onMouseLeave={onBlur}
      onBlur={onBlur}
      onClick={() => onPin(entry)}
      aria-label={`Integration fault line: ${entry.name}, ${labelForScore(
        entry.score,
      )}. Open detail.`}
      className={cn(
        "group relative flex w-full items-center justify-center border-x border-[#e9e7e4] py-1 transition-colors focus:outline-none",
        isActive ? "bg-black/[0.03]" : "hover:bg-black/[0.02]",
      )}
    >
      {/* The fault line itself — colored by integration score. */}
      <span
        aria-hidden="true"
        className={cn(
          "block h-1 w-full rounded-full transition-all",
          isActive ? "opacity-100" : "opacity-90 group-hover:opacity-100",
        )}
        style={{ backgroundColor: color }}
      />
      {/* Centered integration badge (never a left rail). */}
      <span
        className="absolute inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#4d4944] shadow-sm"
        style={
          isActive ? { borderColor: color, color } : undefined
        }
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        integration · {labelForScore(entry.score)}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------ SkipMarker -- */

function SkipMarker({
  entry,
  activeId,
  onFocus,
  onBlur,
  onPin,
}: {
  entry: ReadinessEntry;
  activeId?: string;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const color = colorForScore(entry.score);
  const isActive = activeId === entry.id;
  // Short edge label, e.g. "01↔06".
  const fromN = entry.from?.replace("layer-", "") ?? "";
  const toN = entry.to?.replace("layer-", "") ?? "";
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(entry)}
      onFocus={() => onFocus(entry)}
      onMouseLeave={onBlur}
      onBlur={onBlur}
      onClick={() => onPin(entry)}
      aria-label={`Skip integration ${fromN} to ${toN}: ${entry.name}, ${labelForScore(
        entry.score,
      )}. Open detail.`}
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1 rounded-l-full border bg-white/90 py-0.5 pl-1.5 pr-1 font-mono text-[9px] font-semibold leading-none text-[#4d4944] shadow-sm backdrop-blur transition-all hover:-translate-x-px focus:outline-none focus-visible:ring-2",
        isActive ? "ring-2" : "border-black/10",
      )}
      style={
        {
          borderColor: isActive ? color : undefined,
          "--tw-ring-color": color,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {fromN}↔{toN}
    </button>
  );
}
