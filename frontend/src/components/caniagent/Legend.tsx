"use client";

import { cn } from "@/lib/utils";
import { SCALE, UNRATED } from "./scale";

export type LegendProps = {
  /** Show the "Unrated" gray stop at the end. Default true. */
  showUnrated?: boolean;
  className?: string;
};

/**
 * caniuse-style horizontal legend: the 5 readiness color stops with labels,
 * green (production) → red (theoretical). Neutral chrome; the swatches are the
 * only color. Each stop exposes its meaning via title for hover.
 */
export function Legend({ showUnrated = true, className }: LegendProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2",
        "font-mono text-[11px] uppercase tracking-[0.12em] text-[#4d4944]",
        className,
      )}
      role="list"
      aria-label="Readiness scale"
    >
      {SCALE.map((step) => (
        <div
          key={step.score}
          role="listitem"
          title={step.meaning}
          className="flex items-center gap-1.5"
        >
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: step.color }}
          />
          <span>{step.label}</span>
        </div>
      ))}

      {showUnrated && (
        <div
          role="listitem"
          title={UNRATED.meaning}
          className="flex items-center gap-1.5"
        >
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: UNRATED.color }}
          />
          <span>{UNRATED.label}</span>
        </div>
      )}
    </div>
  );
}

export default Legend;
