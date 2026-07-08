import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CTABandProps = {
  /** Headline. Render with `t.rich(..., { accent })` for the red accent words. */
  title: ReactNode;
  /** Quiet mono tagline under the headline. */
  subhead?: ReactNode;
  /** Call to action below the tagline (the SkillCommand box). */
  children?: ReactNode;
  className?: string;
};

/**
 * Closing CTA (Pablo's Figma frame): a DARK ROUNDED CARD sitting on the paper
 * background rather than a full-bleed band. Near-black `#0a0a0a` card, 16px
 * radius, everything centered: the big DM Sans SemiBold headline in paper
 * `#f7f4ec` with red accent words, a mono eyebrow-style subline beneath it,
 * and the SkillCommand terminal (whose own `#1c1a16` surface reads slightly
 * lighter than the card) as the call to action.
 */
export function CTABand({ title, subhead, children, className }: CTABandProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4", className)}>
      <div className="flex flex-col items-center rounded-2xl bg-[#0a0a0a] px-5 py-12 text-center">
        <h2 className="max-w-[856px] font-sans text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[#f7f4ec] md:text-[3.25rem]">
          {title}
        </h2>

        {subhead && (
          <p className="pt-6 font-mono text-sm uppercase tracking-[0.14em] text-[#6c665a]">
            {subhead}
          </p>
        )}

        {children && (
          <div className="flex w-full flex-col items-center pt-12">{children}</div>
        )}
      </div>
    </div>
  );
}
