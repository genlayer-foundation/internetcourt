import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CTABandProps = {
  /** Headline. Render with `t.rich(..., { accent })` for the serif-italic red accent. */
  title: ReactNode;
  /** Quiet mono tagline under the headline. */
  subhead?: ReactNode;
  /** Call to action below the tagline (the SkillCommand box). */
  children?: ReactNode;
  className?: string;
};

/**
 * Editorial closing band. Light background with a typographic, serif-forward
 * treatment: a thin hairline rule opens the section, the serif headline closes
 * on the red serif-italic accent, and a quiet mono tagline sits beneath it. The
 * skill.md box (`children`) sits below as the call to action.
 */
export function CTABand({ title, subhead, children, className }: CTABandProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-col items-center px-5 text-center text-[#1a1817]",
        className,
      )}
    >
      {/* Hairline rule */}
      <span aria-hidden="true" className="block h-px w-16 bg-[#dc2626]/40" />

      <h2 className="mt-8 font-heading text-[2rem] leading-[1.15] tracking-[-0.01em] md:text-[3.25rem]">
        {title}
      </h2>

      {subhead && (
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[#74706c]">
          {subhead}
        </p>
      )}

      {children && <div className="mt-12 w-full">{children}</div>}
    </div>
  );
}
