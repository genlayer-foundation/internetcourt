"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { getReadiness, LAYERS, CONNECTIONS } from "@/data/caniagent/load";
import type { ReadinessEntry } from "@/data/caniagent/taxonomy";
import {
  SCALE,
  colorForScore,
  softForScore,
  labelForScore,
} from "@/components/caniagent/scale";
import { Legend } from "@/components/caniagent/Legend";
import { ReasonCard } from "@/components/caniagent/ReasonCard";

/* --------------------------------------------------------------------------
 * Lanes — the maturity roadmap, refined and merged with the stack.
 *
 * 6 horizontal LANES stacked (layers 01→06 = the agentic-commerce lifecycle).
 * A sticky MATURITY HEADER runs across the top with 5 columns
 * (Theoretical → Experimental → Emerging → Available → Production). Each lane
 * is a CSS grid: a lane-label cell + 5 maturity columns + a right-edge
 * readiness block. A standard sits in the column matching its score, so a
 * chip's horizontal position IS its maturity. The layer's own readiness is the
 * bold colored block on the RIGHT edge (deliberately right, never left).
 *
 * Connections (NO left arcs / spines / rails):
 *   (a) focusing/hovering a lane highlights the lanes it integrates with and
 *       drops a small inline score badge onto each partner lane's right block;
 *   (b) an always-on integration strip at the bottom lists all 8 connections
 *       as colored from→to chips.
 *
 * Static-first: renders fully correct with zero JS — pure CSS grid, no
 * measured SVG geometry. GSAP only stagger-fades the lanes in on scroll;
 * reduced-motion / no-JS keeps the final static state.
 * -------------------------------------------------------------------------- */

// SCALE is stored 5→1 (production first). Reverse it for the left→right axis
// Theoretical(1) → … → Production(5), so column index = score - 1.
const MATURITY = [...SCALE].reverse(); // score 1..5, left→right

// For each layer, the connections it participates in (as from OR to).
const CONNS_BY_LAYER: Record<string, string[]> = {};
for (const c of CONNECTIONS) {
  (CONNS_BY_LAYER[c.from] ??= []).push(c.id);
  (CONNS_BY_LAYER[c.to] ??= []).push(c.id);
}

const layerNum = (id: string | null) => id?.replace("layer-", "") ?? "";

type Focused = { entry: ReadinessEntry } | null;

export function LanesView() {
  const r = useMemo(() => getReadiness(), []);
  const rootRef = useRef<HTMLDivElement>(null);

  // Hover → compact preview; click → pinned full card in the docked panel.
  const [hovered, setHovered] = useState<Focused>(null);
  const [pinned, setPinned] = useState<Focused>(null);

  // Which layer's lane is currently highlighted (hover/focus), for connection
  // cross-highlighting. Distinct from the ReasonCard focus so that hovering a
  // standard chip inside a lane still lights up that lane's integrations.
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  const active = pinned ?? hovered;

  // The set of layers that integrate with the active layer + the connection
  // entries that touch it (used for inline badges on partner lanes).
  const { partnerLayers, connByPartner } = useMemo(() => {
    const partners = new Set<string>();
    const byPartner = new Map<string, ReadinessEntry>();
    if (!activeLayer) return { partnerLayers: partners, connByPartner: byPartner };
    for (const id of CONNS_BY_LAYER[activeLayer] ?? []) {
      const conn = r.getConnection(id);
      const other = conn.from === activeLayer ? conn.to : conn.from;
      if (other) {
        partners.add(other);
        byPartner.set(other, conn);
      }
    }
    return { partnerLayers: partners, connByPartner: byPartner };
  }, [activeLayer, r]);

  // GSAP entrance — lanes stagger-fade in. Reduced-motion → static.
  //
  // FAIL-SAFE: the lanes are visible by default in the markup; the animation
  // only ever ANIMATES TOWARD that visible end state (fromTo → autoAlpha:1).
  // Even if the ScrollTrigger never fires or is mis-measured, an explicit
  // fallback timer forces the final visible state, so content can never be
  // stranded hidden on load (the original `gsap.from(... once:true)` bug).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lanes = gsap.utils.toArray<HTMLElement>(".ln-lane", el);
      if (!lanes.length) return;

      // Guarantees lanes end fully visible no matter what happens to the
      // trigger; clearProps drops the inline styles GSAP added.
      const reveal = () =>
        gsap.set(lanes, { autoAlpha: 1, y: 0, clearProps: "all" });

      const tween = gsap.fromTo(
        lanes,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "power2.out",
          stagger: 0.1,
          onComplete: reveal,
          scrollTrigger: {
            trigger: el,
            // Satisfied as soon as the container's top is anywhere above the
            // viewport bottom — i.e. already true on a plain load.
            start: "top bottom",
            once: true,
          },
        },
      );

      // Trigger geometry is measured before fonts/layout settle; refresh so the
      // already-satisfied start fires on load without needing a scroll.
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      document.fonts?.ready.then(refresh);
      const refreshTimer = window.setTimeout(refresh, 350);

      // Hard fallback: if the trigger somehow never reveals the lanes, force
      // the visible end state. Cheap no-op once they're already shown.
      const fallbackTimer = window.setTimeout(reveal, 1200);

      return () => {
        window.removeEventListener("load", refresh);
        window.clearTimeout(refreshTimer);
        window.clearTimeout(fallbackTimer);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
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
          Lanes — the agentic-commerce stack on a maturity roadmap
        </h1>
        <p className="mt-1 max-w-2xl font-mono text-xs leading-relaxed text-white/50">
          Six lanes, one per layer. Standards sit in the maturity column that
          matches their readiness; each lane carries its own readiness as a bold
          block on the right. Hover a lane to light up the layers it integrates
          with; the strip below grades every connection.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Legend + axis caption */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#74706c]">
              Maturity roadmap — left to right
            </div>
            <p className="mt-1 max-w-md text-sm leading-snug text-[#74706c]">
              A standard&rsquo;s horizontal position is its readiness. The
              further right, the closer to production.
            </p>
          </div>
          <Legend />
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* ---- The roadmap (header + lanes) ---- */}
          <div className="min-w-0 flex-1">
            {/* Sticky maturity header — 5 columns, reversed SCALE (1→5). The
                grid template is shared with every lane below via the same
                column class so headers and chips line up exactly. */}
            <div
              className="ln-grid sticky top-0 z-30 mb-1.5 rounded-lg border border-[#e9e7e4] bg-[#fafaf9]/95 backdrop-blur"
              role="presentation"
            >
              {/* lane-label spacer (hidden on mobile where columns collapse) */}
              <div className="hidden items-center px-3 py-2 md:flex">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#9a958f]">
                  Layer
                </span>
              </div>
              {/* 5 maturity column headers */}
              <div className="col-span-1 hidden grid-cols-5 md:grid">
                {MATURITY.map((step) => (
                  <div
                    key={step.score}
                    className="flex flex-col items-center gap-1 border-l border-black/[0.06] px-1 py-2 text-center"
                    title={step.meaning}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-6 rounded-full"
                      style={{ backgroundColor: step.color }}
                    />
                    <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.06em] text-[#74706c]">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* readiness-block header */}
              <div className="hidden items-center justify-center border-l border-black/[0.06] px-2 py-2 md:flex">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a958f]">
                  Readiness
                </span>
              </div>
              {/* Mobile-only caption for the collapsed header */}
              <div className="px-3 py-2 md:hidden">
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#9a958f]">
                  Layers · grouped by maturity →
                </span>
              </div>
            </div>

            <div ref={rootRef} className="flex flex-col gap-1.5">
              {LAYERS.map((layer) => (
                <Lane
                  key={layer.id}
                  layer={layer}
                  layerEntry={r.getLayer(layer.id)}
                  standards={r.getStandardsForLayer(layer.id)}
                  activeId={active?.entry.id}
                  activeLayer={activeLayer}
                  isPartner={partnerLayers.has(layer.id)}
                  partnerConn={connByPartner.get(layer.id) ?? null}
                  onActivateLayer={setActiveLayer}
                  onDeactivateLayer={() => setActiveLayer(null)}
                  onFocus={focus}
                  onBlur={blur}
                  onPin={pin}
                />
              ))}
            </div>

            {/* ---- Integration strip (always on) — all 8 connections ---- */}
            <IntegrationStrip
              connections={CONNECTIONS.map((c) => r.getConnection(c.id))}
              activeId={active?.entry.id}
              activeLayer={activeLayer}
              onActivateLayer={setActiveLayer}
              onDeactivateLayer={() => setActiveLayer(null)}
              onFocus={focus}
              onBlur={blur}
              onPin={pin}
            />
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
                    Hover any lane, standard chip, right-edge readiness block, or
                    integration chip for a preview. Click to pin the full reason
                    and sources here.
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

      {/* Shared grid template: lane-label · 5 maturity columns · readiness block.
          One declaration keeps the sticky header and every lane in lockstep
          (no measured geometry). Collapses to a single column on mobile. */}
      <style>{`
        .ln-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .ln-grid {
            grid-template-columns: 184px minmax(0, 1fr) 132px;
          }
        }
      `}</style>
    </main>
  );
}

/* ------------------------------------------------------------------ Lane -- */

function Lane({
  layer,
  layerEntry,
  standards,
  activeId,
  activeLayer,
  isPartner,
  partnerConn,
  onActivateLayer,
  onDeactivateLayer,
  onFocus,
  onBlur,
  onPin,
}: {
  layer: (typeof LAYERS)[number];
  layerEntry: ReadinessEntry;
  standards: ReadinessEntry[];
  activeId?: string;
  activeLayer: string | null;
  isPartner: boolean;
  partnerConn: ReadinessEntry | null;
  onActivateLayer: (id: string) => void;
  onDeactivateLayer: () => void;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const accent = colorForScore(layerEntry.score);
  const tint = softForScore(layerEntry.score);
  const isActiveLane = activeLayer === layer.id;
  // Dim non-related lanes while a lane is active (focus the integration set).
  const dimmed = activeLayer != null && !isActiveLane && !isPartner;

  // Bucket standards by maturity column (score 1..5). Unrated → bucket 0.
  const byColumn = useMemo(() => {
    const cols: Record<number, ReadinessEntry[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const s of standards) cols[s.score ?? 0].push(s);
    return cols;
  }, [standards]);

  const laneHandlers = {
    onMouseEnter: () => onActivateLayer(layer.id),
    onMouseLeave: onDeactivateLayer,
  };

  return (
    <section
      className={cn(
        "ln-lane ln-grid overflow-hidden rounded-lg border bg-white transition-[opacity,box-shadow] duration-200",
        isActiveLane
          ? "border-black/15 shadow-md"
          : isPartner
            ? "border-black/15"
            : "border-[#e9e7e4]",
        dimmed && "opacity-45",
      )}
      style={
        isPartner && !isActiveLane
          ? ({ boxShadow: `inset 0 0 0 1.5px ${colorForScore(partnerConn?.score ?? null)}33` } as React.CSSProperties)
          : undefined
      }
      aria-label={`Layer ${layer.n}: ${layer.name} — ${labelForScore(layerEntry.score)}`}
      {...laneHandlers}
    >
      {/* Lane label — number + name. Focusable: activates the lane (for
          connection highlighting) AND opens the layer ReasonCard. */}
      <button
        type="button"
        onFocus={() => {
          onActivateLayer(layer.id);
          onFocus(layerEntry);
        }}
        onMouseEnter={() => onFocus(layerEntry)}
        onMouseLeave={onBlur}
        onBlur={() => {
          onDeactivateLayer();
          onBlur();
        }}
        onClick={() => onPin(layerEntry)}
        aria-label={`Layer ${layer.n} ${layer.name}, readiness ${labelForScore(
          layerEntry.score,
        )}. Highlights its integrations; opens detail.`}
        className={cn(
          "flex items-start gap-2.5 border-b border-black/5 px-3 py-3 text-left transition-colors md:border-b-0 md:border-r",
          isActiveLane && "bg-black/[0.02]",
        )}
        style={{ backgroundColor: isActiveLane ? undefined : tint }}
      >
        <span
          className="mt-0.5 inline-flex h-6 shrink-0 items-center rounded-md px-1.5 font-mono text-[11px] font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {layer.n}
        </span>
        <span className="min-w-0">
          <span className="block font-sans text-[13px] font-bold leading-tight">
            {layer.name}
          </span>
          {isPartner && partnerConn && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em]"
              style={{
                backgroundColor: softForScore(partnerConn.score),
                color: colorForScore(partnerConn.score),
              }}
            >
              integrates · {labelForScore(partnerConn.score)}
            </span>
          )}
        </span>
      </button>

      {/* Maturity columns (desktop) — 5 cells; chips land in their score column.
          On mobile the same standards render as a grouped flow (see below). */}
      <div className="hidden grid-cols-5 md:grid">
        {/* Unrated chips, if any, ride the leftmost (theoretical-adjacent) gutter */}
        {MATURITY.map((step, ci) => (
          <div
            key={step.score}
            className={cn(
              "flex min-h-[3.5rem] flex-col gap-1.5 p-1.5",
              ci > 0 && "border-l border-black/[0.06]",
            )}
            style={{ backgroundColor: `${step.color}0a` }}
          >
            {ci === 0 &&
              byColumn[0].map((s) => (
                <Chip
                  key={s.id}
                  entry={s}
                  activeId={activeId}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onPin={onPin}
                />
              ))}
            {byColumn[step.score].map((s) => (
              <Chip
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

      {/* Mobile maturity layout — chips grouped under a maturity label, so the
          5-column grid degrades to a readable stacked list. */}
      <div className="flex flex-col gap-2 px-3 py-3 md:hidden">
        {[0, 1, 2, 3, 4, 5]
          .filter((sc) => byColumn[sc].length > 0)
          .map((sc) => (
            <div key={sc} className="flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#9a958f]">
                {sc === 0
                  ? "Unrated"
                  : MATURITY.find((m) => m.score === sc)?.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {byColumn[sc].map((s) => (
                  <Chip
                    key={s.id}
                    entry={s}
                    activeId={activeId}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onPin={onPin}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Right-edge readiness block — the layer's own score, deliberately RIGHT.
          Carries an inline integration badge when this lane is a partner of
          the currently-active lane. */}
      <ReadinessBlock
        layerEntry={layerEntry}
        accent={accent}
        isActive={activeId === layer.id}
        partnerConn={isPartner ? partnerConn : null}
        onFocus={onFocus}
        onBlur={onBlur}
        onPin={onPin}
      />
    </section>
  );
}

/* -------------------------------------------------------- ReadinessBlock -- */

function ReadinessBlock({
  layerEntry,
  accent,
  isActive,
  partnerConn,
  onFocus,
  onBlur,
  onPin,
}: {
  layerEntry: ReadinessEntry;
  accent: string;
  isActive: boolean;
  partnerConn: ReadinessEntry | null;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const score = layerEntry.score;
  const pct = score != null ? `${score * 20}%` : "—";
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(layerEntry)}
      onFocus={() => onFocus(layerEntry)}
      onMouseLeave={onBlur}
      onBlur={onBlur}
      onClick={() => onPin(layerEntry)}
      aria-label={`Layer readiness ${labelForScore(score)}${
        score != null ? ` ${score} of 5` : ""
      }. Open detail.`}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 border-t border-white/20 px-2 py-3 text-center text-white transition-all md:border-l md:border-t-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset",
        isActive && "ring-2 ring-inset ring-white/70",
      )}
      style={{ backgroundColor: accent }}
    >
      <span className="font-sans text-lg font-extrabold leading-none">{pct}</span>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] opacity-90">
        {labelForScore(score)}
      </span>
      {/* Inline integration badge: shown when this lane integrates with the
          active lane. Colored by the connection's score. */}
      {partnerConn && (
        <span
          className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.06em] shadow-sm"
          style={{ color: colorForScore(partnerConn.score) }}
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: colorForScore(partnerConn.score) }}
          />
          link {partnerConn.score ?? "?"}/5
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ Chip -- */

function Chip({
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
        "inline-flex items-center gap-1.5 self-start rounded-full border bg-white px-2 py-1 font-mono text-[11px] font-medium leading-none text-[#1a1817] shadow-sm transition-all hover:-translate-y-px hover:shadow-md focus:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
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

/* ----------------------------------------------------- IntegrationStrip -- */

function IntegrationStrip({
  connections,
  activeId,
  activeLayer,
  onActivateLayer,
  onDeactivateLayer,
  onFocus,
  onBlur,
  onPin,
}: {
  connections: ReadinessEntry[];
  activeId?: string;
  activeLayer: string | null;
  onActivateLayer: (id: string) => void;
  onDeactivateLayer: () => void;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  return (
    <div className="mt-5 rounded-lg border border-[#e9e7e4] bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
          Integrations · {connections.length} edges
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#9a958f]">
          hover a chip to light its lanes
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {connections.map((conn) => (
          <ConnChip
            key={conn.id}
            entry={conn}
            activeId={activeId}
            activeLayer={activeLayer}
            onActivateLayer={onActivateLayer}
            onDeactivateLayer={onDeactivateLayer}
            onFocus={onFocus}
            onBlur={onBlur}
            onPin={onPin}
          />
        ))}
      </div>
    </div>
  );
}

function ConnChip({
  entry,
  activeId,
  activeLayer,
  onActivateLayer,
  onDeactivateLayer,
  onFocus,
  onBlur,
  onPin,
}: {
  entry: ReadinessEntry;
  activeId?: string;
  activeLayer: string | null;
  onActivateLayer: (id: string) => void;
  onDeactivateLayer: () => void;
  onFocus: (e: ReadinessEntry) => void;
  onBlur: () => void;
  onPin: (e: ReadinessEntry) => void;
}) {
  const color = colorForScore(entry.score);
  const isActive = activeId === entry.id;
  // The chip relates to the active lane if either endpoint is the active layer.
  const related =
    activeLayer != null &&
    (entry.from === activeLayer || entry.to === activeLayer);
  const from = layerNum(entry.from);
  const to = layerNum(entry.to);

  // Hovering a conn chip activates its source lane → both endpoints light up
  // (the partner highlight already follows from the source layer's edges).
  const activate = () => entry.from && onActivateLayer(entry.from);

  return (
    <button
      type="button"
      onMouseEnter={() => {
        activate();
        onFocus(entry);
      }}
      onFocus={() => {
        activate();
        onFocus(entry);
      }}
      onMouseLeave={() => {
        onDeactivateLayer();
        onBlur();
      }}
      onBlur={() => {
        onDeactivateLayer();
        onBlur();
      }}
      onClick={() => onPin(entry)}
      aria-label={`Integration ${from} to ${to}: ${entry.name}, ${labelForScore(
        entry.score,
      )}. Open detail.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-medium leading-none transition-all hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        isActive || related ? "ring-2 ring-offset-1" : "border-black/10",
      )}
      style={
        {
          backgroundColor: softForScore(entry.score),
          color,
          borderColor: isActive || related ? color : undefined,
          "--tw-ring-color": color,
        } as React.CSSProperties
      }
    >
      <span className="font-semibold text-[#1a1817]/70">
        {from}
        <span className="px-0.5 text-[#9a958f]">→</span>
        {to}
      </span>
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}
