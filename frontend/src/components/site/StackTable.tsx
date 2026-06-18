"use client";

import { useEffect, useRef, useState } from "react";
import { STACK_ROWS } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type StackTableProps = {
  className?: string;
};

const ROW_DELAYS = [
  "",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-400",
  "delay-500",
];

/**
 * The agentic commerce stack table from the one-pager.
 * A vertical "INTERNET COURT" banner spans all six rows on the right -
 * signifying Internet Court sits across every layer. On mobile the banner
 * becomes a horizontal bar below the rows.
 *
 * As the table scrolls into view, a red connector line per row fills from the
 * Internet Court banner toward the layer (right → left), one row at a time;
 * by the time the whole table is on screen every line is filled.
 */
export function StackTable({ className }: StackTableProps) {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // 0 when the table's top sits at the bottom of the viewport; 1 once the
      // whole table has scrolled fully into view.
      const p = (vh - rect.top) / (rect.height || 1);
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const rowCount = STACK_ROWS.length;

  return (
    <figure ref={ref} className={cn("max-w-4xl mx-auto", className)}>
      <div className="flex flex-col md:flex-row rounded-2xl border border-border overflow-hidden bg-white shadow-sm">
        {/* Rows */}
        <div className="flex-1 flex flex-col divide-y divide-border">
          {STACK_ROWS.map((row, i) => {
            // Each row fills across its own slice of the scroll progress, so the
            // lines complete in sequence from top to bottom.
            const fill = Math.min(1, Math.max(0, progress * rowCount - i));
            return (
              <div
                key={row.n}
                className={cn(
                  "relative flex items-baseline md:items-center gap-4 md:gap-8 px-5 py-5 md:px-10 md:py-7 animate-fade-in-up",
                  ROW_DELAYS[i],
                )}
              >
                {/* Scroll-driven connector line: anchored at the Internet Court
                    banner (right) and growing toward the layer (left). */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 -right-10 hidden h-[2px] origin-right rounded-full bg-[#dc2626] md:block"
                  style={{ transform: `scaleX(${fill})`, willChange: "transform" }}
                />
                <span className="relative font-mono text-sm md:text-base text-[#dc2626] tabular-nums shrink-0">
                  {row.n}
                </span>
                <span className="relative font-sans font-medium text-base md:text-xl leading-snug flex-1">
                  {row.layer}
                </span>
                <span className="relative font-mono text-xs md:text-sm text-muted-foreground text-right shrink-0 max-w-[40%] md:max-w-none">
                  {row.standards}
                </span>
              </div>
            );
          })}
        </div>

        {/* Vertical banner - desktop */}
        <div
          className="hidden md:flex w-16 shrink-0 items-center justify-center bg-[#dc2626] text-white"
          aria-hidden="true"
        >
          <span
            className="font-mono text-sm uppercase tracking-[0.5em] whitespace-nowrap rotate-180"
            style={{ writingMode: "vertical-rl" }}
          >
            Internet Court
          </span>
        </div>

        {/* Horizontal banner - mobile */}
        <div
          className="md:hidden flex items-center justify-center bg-[#dc2626] text-white py-3"
          aria-hidden="true"
        >
          <span className="font-mono text-xs uppercase tracking-[0.4em] whitespace-nowrap pl-[0.4em]">
            Internet Court
          </span>
        </div>
      </div>
      <span className="sr-only">
        Internet Court sits across all six layers of the stack.
      </span>

      <figcaption className="mt-5 text-center text-sm italic text-muted-foreground">
        The agentic commerce stack, where Internet Court sits across the
        layers.
      </figcaption>
    </figure>
  );
}
