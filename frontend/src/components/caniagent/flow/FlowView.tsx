"use client";

/**
 * caniagent — Variant 4 "Flow"
 *
 * A vertical lifecycle PIPELINE. The six-layer agentic-commerce stack reads
 * top → bottom as a process (discovery → disputes). Each layer is a step card,
 * tinted by its readiness. Between consecutive cards sits a CENTERED vertical
 * connector segment (the "pipe") colored by the integration readiness of that
 * edge. Non-adjacent integrations (01↔06, 03↔06, 04↔06) hang off the RIGHT
 * edge of the relevant card as colored tabs. Standards live inside each card as
 * chips, each carrying a tiny 5-dot maturity meter.
 *
 * Hard constraints honored:
 *  - NO left-side arcs / rails / spines. Connectors are centered (in the flow)
 *    or right-edge tabs (non-adjacent). The left gutter holds nothing.
 *  - Static-first & robust: the whole pipeline renders correct with ZERO JS —
 *    colors, meters, badges and labels are all plain CSS/markup. No DOM-measured
 *    SVG geometry. GSAP reveal is a pure progressive enhancement; reduced-motion
 *    or no-JS shows the final static state.
 *  - Stack DNA (6 layers = lifecycle) + Roadmap DNA (5-dot maturity meters).
 *
 * Interaction: every card / connector / chip / tab is a focusable <button> with
 * an aria-label. Hover or focus → the docked ReasonCard panel shows that entry
 * (compact). Click → it pins the entry (full, with sources). Keyboard users tab
 * through in reading order; Escape clears the pin.
 */

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { LAYERS, CONNECTIONS, type ReadinessEntry } from "@/data/caniagent/taxonomy";
import { getReadiness } from "@/data/caniagent/load";
import {
  UNRATED,
  colorForScore,
  softForScore,
  labelForScore,
} from "@/components/caniagent/scale";
import { Legend } from "@/components/caniagent/Legend";
import { ReasonCard } from "@/components/caniagent/ReasonCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data prep (synchronous, pure — safe at module/render time)
// ---------------------------------------------------------------------------

const readiness = getReadiness();

/** Consecutive-edge connection between layer n and n+1 (the centered pipe). */
function consecutiveConnection(fromId: string, toId: string): ReadinessEntry | null {
  const def = CONNECTIONS.find((c) => c.from === fromId && c.to === toId);
  return def ? readiness.getConnection(def.id) : null;
}

/** Non-adjacent connections that "tap into" a given layer as a source. */
function rightEdgeConnectionsFor(layerId: string): ReadinessEntry[] {
  const layerIndex = LAYERS.findIndex((l) => l.id === layerId);
  return CONNECTIONS.filter((c) => {
    if (c.from !== layerId) return false;
    const toIndex = LAYERS.findIndex((l) => l.id === c.to);
    // Adjacent (n → n+1) edges are drawn as centered pipes, not tabs.
    return toIndex - layerIndex !== 1;
  }).map((c) => readiness.getConnection(c.id));
}

function layerName(id: string): string {
  return LAYERS.find((l) => l.id === id)?.name ?? id;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

/** A 5-dot maturity meter: dots 1..score filled in the score's color. */
function MaturityMeter({ score }: { score: number | null }) {
  const color = colorForScore(score as 1 | 2 | 3 | 4 | 5 | null);
  return (
    <span className="ml-2 inline-flex shrink-0 items-center gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((dot) => {
        const filled = score != null && dot <= score;
        return (
          <span
            key={dot}
            className="h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: filled ? color : "transparent",
              border: `1px solid ${filled ? color : "#d1d5db"}`,
            }}
          />
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

type Active = { entry: ReadinessEntry; pinned: boolean } | null;

export function FlowView() {
  const [active, setActive] = useState<Active>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Hover/focus → preview (compact). Does not override a pin.
  const preview = (entry: ReadinessEntry) =>
    setActive((cur) => (cur?.pinned ? cur : { entry, pinned: false }));
  const clearPreview = () =>
    setActive((cur) => (cur && !cur.pinned ? null : cur));
  // Click → toggle a pin (full card, with sources).
  const pin = (entry: ReadinessEntry) =>
    setActive((cur) =>
      cur?.pinned && cur.entry.id === entry.id ? null : { entry, pinned: true },
    );

  // Escape clears a pin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Optional GSAP: reveal pipeline steps + pipes top→bottom on scroll. Pure
  // enhancement — markup is already in its final state, so reduced-motion / no
  // JS simply shows everything. Never measures the DOM for geometry.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = rootRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const items = gsap.utils.toArray<HTMLElement>(".flow-reveal", el);
      gsap.from(items, {
        autoAlpha: 0,
        y: 18,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          once: true,
        },
      });
    });
    return () => mm.revert();
  }, []);

  const sharedHandlers = (entry: ReadinessEntry) => ({
    onMouseEnter: () => preview(entry),
    onMouseLeave: clearPreview,
    onFocus: () => preview(entry),
    onBlur: clearPreview,
    onClick: () => pin(entry),
  });

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#1a1817]">
      {/* Internal-preview chrome (matches hero-previews; no left back-arrow). */}
      <header className="border-b border-black/10 bg-[#1a1817] px-5 py-6 text-white md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ef6a6a]">
          caniagent · internal preview
        </p>
        <h1 className="mt-1 font-heading text-2xl md:text-3xl">
          Variant 4 — Flow
        </h1>
        <p className="mt-1 max-w-2xl font-mono text-xs text-white/50">
          The agentic-commerce stack as a vertical lifecycle pipeline. Layers
          flow top → bottom; centered pipes carry the integration readiness
          between steps; right-edge tabs are the non-adjacent feedback loops.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ------------------------------------------------------------ */}
        {/* The pipeline */}
        {/* ------------------------------------------------------------ */}
        <div ref={rootRef}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#74706c]">
                Lifecycle pipeline
              </div>
              <p className="mt-1 max-w-md text-sm text-[#4d4944]">
                Each step is a layer, tinted by readiness. Hover the pipe between
                two steps to read whether they actually compose today.
              </p>
            </div>
            <Legend />
          </div>

          <ol className="relative list-none">
            {LAYERS.map((layerDef, i) => {
              const layer = readiness.getLayer(layerDef.id);
              const standards = readiness.getStandardsForLayer(layerDef.id);
              const tint = softForScore(layer.score);
              const accent = colorForScore(layer.score);
              const rightTabs = rightEdgeConnectionsFor(layerDef.id);

              const next = LAYERS[i + 1];
              const pipe = next
                ? consecutiveConnection(layerDef.id, next.id)
                : null;

              const isActive = active?.entry.id === layer.id;

              return (
                <li key={layerDef.id}>
                  {/* ---- Step card ---- */}
                  <div className="flow-reveal relative">
                    {/* Right-edge tabs (non-adjacent integrations). Anchored to
                        the card's right edge on sm+ — never the left gutter.
                        On mobile (<sm) they would overlap the card title, so
                        there they render in-flow as a wrapped row BELOW the
                        card instead (see the mobile block after the card). */}
                    {rightTabs.length > 0 && (
                      <div className="absolute right-0 top-6 z-10 hidden translate-x-0 flex-col items-end gap-1.5 sm:flex sm:translate-x-[calc(100%-12px)]">
                        {rightTabs.map((conn) => {
                          const c = colorForScore(conn.score);
                          const tActive = active?.entry.id === conn.id;
                          return (
                            <button
                              key={conn.id}
                              type="button"
                              {...sharedHandlers(conn)}
                              aria-label={`Integration ${conn.name}. ${labelForScore(
                                conn.score,
                              )}. ${conn.summary}`}
                              className={cn(
                                "group flex items-center gap-1.5 rounded-r-md rounded-l-md py-1 pl-1.5 pr-2 text-left shadow-sm outline-none transition",
                                "focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
                                tActive && "ring-2 ring-[#1a1817]/40",
                              )}
                              style={{
                                backgroundColor: "#ffffff",
                                borderLeft: `3px solid ${c}`,
                              }}
                            >
                              <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] font-mono text-[9px] font-bold text-white"
                                style={{ backgroundColor: c }}
                              >
                                {conn.score ?? "?"}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#4d4944]">
                                ↔ {layerName(conn.to ?? "")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      {...sharedHandlers(layer)}
                      aria-label={`Layer ${layerDef.n}: ${layerDef.name}. Readiness ${labelForScore(
                        layer.score,
                      )}.`}
                      className={cn(
                        "block w-full rounded-2xl border bg-white p-5 text-left outline-none transition md:p-6",
                        "hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
                        isActive && "ring-2 ring-[#1a1817]/40",
                      )}
                      style={{
                        borderColor: "#e5e7eb",
                        // A readiness-tinted left bar inside the card edge — note
                        // this is INSIDE the card, not a left-gutter rail.
                        boxShadow: `inset 4px 0 0 ${accent}`,
                        background: `linear-gradient(90deg, ${tint} 0%, #ffffff 40%)`,
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="inline-flex h-9 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                          style={{ backgroundColor: accent }}
                        >
                          {layerDef.n}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="font-sans text-base font-extrabold leading-tight tracking-tight md:text-lg">
                              {layerDef.name}
                            </h2>
                            <span
                              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]"
                              style={{ backgroundColor: tint, color: accent }}
                            >
                              {layer.score != null
                                ? `${labelForScore(layer.score)} · ${layer.score}/5`
                                : labelForScore(layer.score)}
                            </span>
                          </div>

                          {/* Standards as chips with a 5-dot maturity meter. */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {standards.map((std) => {
                              const sActive = active?.entry.id === std.id;
                              const sColor = colorForScore(std.score);
                              return (
                                <span
                                  key={std.id}
                                  role="button"
                                  tabIndex={0}
                                  {...sharedHandlers(std)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      pin(std);
                                    }
                                  }}
                                  // Stop the chip click from also toggling the
                                  // parent card's pin.
                                  onClickCapture={(e) => e.stopPropagation()}
                                  aria-label={`Standard ${std.name}. Maturity ${labelForScore(
                                    std.score,
                                  )}, ${std.score ?? "unrated"} of 5. ${std.summary}`}
                                  className={cn(
                                    "inline-flex cursor-pointer items-center rounded-md border bg-white px-2 py-1 outline-none transition",
                                    "hover:border-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
                                    sActive && "ring-2 ring-[#1a1817]/40",
                                  )}
                                  style={{ borderColor: "#e5e7eb" }}
                                >
                                  <span
                                    className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: sColor }}
                                    aria-hidden="true"
                                  />
                                  <span className="font-mono text-[11px] font-medium text-[#1a1817]">
                                    {std.name}
                                  </span>
                                  <MaturityMeter score={std.score} />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Mobile-only: non-adjacent integration tabs as a wrapped
                        row below the card so they never overlap the title. */}
                    {rightTabs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                        {rightTabs.map((conn) => {
                          const c = colorForScore(conn.score);
                          const tActive = active?.entry.id === conn.id;
                          return (
                            <button
                              key={conn.id}
                              type="button"
                              {...sharedHandlers(conn)}
                              aria-label={`Integration ${conn.name}. ${labelForScore(
                                conn.score,
                              )}. ${conn.summary}`}
                              className={cn(
                                "flex items-center gap-1.5 rounded-md py-1 pl-1.5 pr-2 text-left shadow-sm outline-none transition",
                                "focus-visible:ring-2 focus-visible:ring-[#1a1817]/40",
                                tActive && "ring-2 ring-[#1a1817]/40",
                              )}
                              style={{
                                backgroundColor: "#ffffff",
                                borderLeft: `3px solid ${c}`,
                              }}
                            >
                              <span
                                className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] font-mono text-[9px] font-bold text-white"
                                style={{ backgroundColor: c }}
                              >
                                {conn.score ?? "?"}
                              </span>
                              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#4d4944]">
                                ↔ {layerName(conn.to ?? "")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ---- Centered connector pipe to the next step ---- */}
                  {pipe && (
                    <div className="flow-reveal relative flex justify-center py-1.5">
                      <button
                        type="button"
                        {...sharedHandlers(pipe)}
                        aria-label={`Integration ${pipe.name}. ${labelForScore(
                          pipe.score,
                        )}. ${pipe.summary}`}
                        className={cn(
                          "group relative flex flex-col items-center outline-none",
                        )}
                      >
                        {/* The pipe: a centered vertical bar colored by the edge
                            readiness, with a score badge floated on it. Pure CSS
                            — no measured geometry. */}
                        <span
                          className={cn(
                            "block w-[6px] rounded-full transition-all",
                            "h-8 md:h-10 group-hover:w-[8px]",
                            active?.entry.id === pipe.id && "w-[8px]",
                          )}
                          style={{
                            background: `linear-gradient(${colorForScore(
                              readiness.getLayer(layerDef.id).score,
                            )}, ${colorForScore(pipe.score)}, ${colorForScore(
                              readiness.getLayer(next!.id).score,
                            )})`,
                          }}
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            "pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 shadow-sm transition",
                            "group-hover:shadow-md",
                            active?.entry.id === pipe.id && "ring-2 ring-[#1a1817]/30",
                          )}
                          style={{ borderColor: colorForScore(pipe.score) }}
                        >
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white"
                            style={{ backgroundColor: colorForScore(pipe.score) }}
                          >
                            {pipe.score ?? "?"}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#74706c]">
                            {labelForScore(pipe.score)}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* Docked detail panel (sticky). Compact on hover, full on click. */}
        {/* ------------------------------------------------------------ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#74706c]">
            Detail
          </div>
          <div className="mt-2 min-h-[180px]">
            {active ? (
              <ReasonCard
                entry={active.entry}
                compact={!active.pinned}
                className="max-w-none shadow-md"
              />
            ) : (
              <div
                className="rounded-xl border border-dashed bg-white/60 p-5 text-sm text-[#74706c]"
                style={{ borderColor: "#d1d5db" }}
              >
                <p className="font-medium text-[#4d4944]">
                  Hover any step, pipe, chip, or tab.
                </p>
                <p className="mt-2 leading-relaxed">
                  Hover (or tab-focus) shows a compact reason; click to pin the
                  full card with sources. Press{" "}
                  <kbd className="rounded border border-[#d1d5db] bg-white px-1 font-mono text-[10px]">
                    Esc
                  </kbd>{" "}
                  to clear.
                </p>
                <div
                  className="mt-4 flex items-center gap-2 border-t pt-3"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: UNRATED.color }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em]">
                    Gray = unrated
                  </span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default FlowView;
