"use client";

import { cn } from "@/lib/utils";
import type { ReadinessEntry } from "@/data/caniagent/taxonomy";
import { labelForScore, softForScore, colorForScore } from "./scale";

/** Cap on visible partner chips before collapsing into a "+N more" tag. */
const PARTNER_CAP = 12;

export type ReasonCardProps = {
  entry: ReadinessEntry;
  /** Compact form for tooltips (hides sources + second paragraph). */
  compact?: boolean;
  className?: string;
};

/**
 * The hover/click detail card used by every variant. Presentational only — the
 * variant decides positioning (floating tooltip vs. docked side panel).
 *
 * House style: DM Mono uppercase wide-tracking eyebrows/labels, neutral chrome,
 * the status pill carries the readiness color (the one place color lives here).
 */
export function ReasonCard({ entry, compact = false, className }: ReasonCardProps) {
  const status = labelForScore(entry.score);
  const accent = colorForScore(entry.score);
  const tint = softForScore(entry.score);

  // reason is authored as exactly two paragraphs separated by a blank line.
  const paragraphs = entry.reason
    ? entry.reason.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    : [];
  const shownParagraphs = compact ? paragraphs.slice(0, 1) : paragraphs;

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-xl border border-[#e5e7eb] bg-white p-5 text-left text-[#1a1817] shadow-lg",
        className,
      )}
    >
      {/* Eyebrow: type + parent context */}
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
        {entry.type}
      </div>

      {/* Name + status pill */}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <h3 className="text-lg font-sans font-extrabold leading-tight tracking-tight">
          {entry.name}
        </h3>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em]"
          style={{ backgroundColor: tint, color: accent }}
        >
          {entry.score != null ? `${status} · ${entry.score}/5` : status}
        </span>
      </div>

      {/* Title / what-it-is seed */}
      {entry.title && (
        <p className="mt-1 text-sm text-[#74706c] leading-snug">{entry.title}</p>
      )}

      {/* Summary */}
      {entry.summary && (
        <p className="mt-3 text-sm font-medium leading-snug text-[#1a1817]">
          {entry.summary}
        </p>
      )}

      {/* Reason paragraphs */}
      {shownParagraphs.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {shownParagraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-[#4d4944]">
              {p}
            </p>
          ))}
        </div>
      )}

      {/* Notes (caveats / name disputes) */}
      {!compact && entry.notes && (
        <p className="mt-3 font-mono text-[11px] leading-snug text-[#74706c]">
          {entry.notes}
        </p>
      )}

      {/* Metrics — "By the numbers" (full mode only) */}
      {!compact && entry.metrics && entry.metrics.length > 0 && (
        <div className="mt-4 border-t border-[#e5e7eb] pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
            By the numbers
          </div>
          <ul className="mt-2 space-y-2">
            {entry.metrics.map((m, i) => (
              <li key={i} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#74706c]">
                    {m.label}
                  </span>
                  {m.confidence === "low" && (
                    <span className="shrink-0 rounded-sm bg-[#f1f3f5] px-1 py-px font-mono text-[9px] uppercase tracking-[0.1em] text-[#9ca3af]">
                      est.
                    </span>
                  )}
                  {m.asOf && (
                    <span className="ml-auto shrink-0 font-mono text-[9px] tracking-[0.06em] text-[#9ca3af]">
                      {m.asOf}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium leading-snug text-[#1a1817]">
                  {m.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Partners & implementers (full mode only) */}
      {!compact && entry.partners && entry.partners.length > 0 && (
        <div className="mt-4 border-t border-[#e5e7eb] pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
            Partners &amp; implementers
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.partners.slice(0, PARTNER_CAP).map((p, i) => (
              <span
                key={i}
                title={partnerTitle(p)}
                className="rounded-full border border-[#e5e7eb] bg-[#f7f7f7] px-2 py-0.5 font-mono text-[10px] tracking-[0.04em] text-[#4d4944]"
              >
                {p.name}
              </span>
            ))}
            {entry.partners.length > PARTNER_CAP && (
              <span className="self-center font-mono text-[10px] tracking-[0.06em] text-[#9ca3af]">
                +{entry.partners.length - PARTNER_CAP} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Sources */}
      {!compact && entry.sources && entry.sources.length > 0 && (
        <div className="mt-4 border-t border-[#e5e7eb] pt-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#74706c]">
            Sources
          </div>
          <ul className="mt-1.5 space-y-1">
            {entry.sources.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#dc2626] underline decoration-[#dc2626]/30 underline-offset-2 hover:decoration-[#dc2626] break-all"
                >
                  {prettyUrl(url)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Build a hover tooltip from a partner's role/where (either may be absent). */
function partnerTitle(p: { name: string; role?: string; where?: string }): string {
  const detail = [p.role, p.where].filter(Boolean).join(" · ");
  return detail ? `${p.name} — ${detail}` : p.name;
}

/** Strip protocol + trailing slash for compact source display. */
function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
}

export default ReasonCard;
