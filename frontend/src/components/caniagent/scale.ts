/**
 * The caniagent readiness scale (5 steps, green → red). See caniagent-plan.md §4.2.
 *
 * The heatmap greens/ambers/reds ARE the color of this feature; chrome stays
 * neutral. Colors here are intentional and load-bearing — do not swap them for
 * brand red. `null` scores render as a neutral "unrated" gray.
 */

import type { CSSProperties } from "react";
import type {
  ReadinessScore,
  ReadinessStatus,
} from "@/data/caniagent/taxonomy";

export interface ScaleStep {
  score: ReadinessScore;
  status: ReadinessStatus;
  /** Short human label for legends/pills. */
  label: string;
  /** One-line meaning (legend tooltip / caption). */
  meaning: string;
  /** Solid cell color (hex). */
  color: string;
  /** Soft background tint for pills/cards (rgba). */
  soft: string;
}

/** Ordered 5 → 1 (production first, like caniuse reads green → red). */
export const SCALE: ScaleStep[] = [
  {
    score: 5,
    status: "production",
    label: "Production",
    meaning: "Live, multiple real deployments, usable today.",
    color: "#059669",
    soft: "rgba(5, 150, 105, 0.12)",
  },
  {
    score: 4,
    status: "available",
    label: "Available",
    meaning: "Spec final + working implementations, early production.",
    color: "#65a30d",
    soft: "rgba(101, 163, 13, 0.12)",
  },
  {
    score: 3,
    status: "emerging",
    label: "Emerging",
    meaning: "Draft/active spec, prototypes exist, not battle-tested.",
    color: "#d97706",
    soft: "rgba(217, 119, 6, 0.12)",
  },
  {
    score: 2,
    status: "experimental",
    label: "Experimental",
    meaning: "Early proposal, single/reference impl, unstable.",
    color: "#ea580c",
    soft: "rgba(234, 88, 12, 0.12)",
  },
  {
    score: 1,
    status: "theoretical",
    label: "Theoretical",
    meaning: "Idea/whitepaper only, little/no working code.",
    color: "#dc2626",
    soft: "rgba(220, 38, 38, 0.12)",
  },
];

/** Neutral "unrated" appearance for null scores. */
export const UNRATED = {
  label: "Unrated",
  meaning: "No readiness data yet.",
  color: "#9ca3af",
  soft: "rgba(156, 163, 175, 0.14)",
} as const;

const BY_SCORE: Record<ReadinessScore, ScaleStep> = SCALE.reduce(
  (acc, step) => {
    acc[step.score] = step;
    return acc;
  },
  {} as Record<ReadinessScore, ScaleStep>,
);

/** The scale step for a score, or null when unrated. */
export function stepForScore(score: ReadinessScore | null): ScaleStep | null {
  if (score == null) return null;
  return BY_SCORE[score] ?? null;
}

/** Solid hex color for a score (gray when unrated). */
export function colorForScore(score: ReadinessScore | null): string {
  return stepForScore(score)?.color ?? UNRATED.color;
}

/** Soft tint for a score (gray when unrated). */
export function softForScore(score: ReadinessScore | null): string {
  return stepForScore(score)?.soft ?? UNRATED.soft;
}

/** Human label for a score (e.g. "Available"; "Unrated" when null). */
export function labelForScore(score: ReadinessScore | null): string {
  return stepForScore(score)?.label ?? UNRATED.label;
}

/** Status string for a score (null when unrated). */
export function statusForScore(
  score: ReadinessScore | null,
): ReadinessStatus | null {
  return stepForScore(score)?.status ?? null;
}

export interface CellStyle {
  /** Inline style for a heatmap cell (solid fill + readable text). */
  style: CSSProperties;
  /** Accessible label, e.g. "Available (4/5)" or "Unrated". */
  ariaLabel: string;
}

/**
 * Inline style + aria label for a heatmap cell. Solid colors are dark enough
 * that white text reads on every step; unrated uses dark text on light gray.
 */
export function cellStyle(score: ReadinessScore | null): CellStyle {
  const step = stepForScore(score);
  if (!step) {
    return {
      style: {
        backgroundColor: UNRATED.color,
        color: "#ffffff",
      },
      ariaLabel: UNRATED.label,
    };
  }
  return {
    style: {
      backgroundColor: step.color,
      color: "#ffffff",
    },
    ariaLabel: `${step.label} (${step.score}/5)`,
  };
}
