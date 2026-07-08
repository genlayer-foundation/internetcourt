import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HeroVariant = "dark" | "light" | "light-video";

export type HeroProps = {
  variant?: HeroVariant;
  eyebrow?: ReactNode;
  title: ReactNode;
  subhead?: ReactNode;
  children?: ReactNode;
  mediaSrc?: string;
  className?: string;
  /**
   * When true, the `light-video` background video is NOT rendered inside the
   * hero section. Use this when a shared, full-bleed video backdrop is rendered
   * by the parent (see page.tsx) so the video can flow continuously behind both
   * the hero and the following marquee instead of being clipped to the hero.
   */
  externalVideoBackdrop?: boolean;
  /**
   * When true, renders a short brand-red accent rule directly beneath the
   * headline — a small, deliberate pop of brand color above the fold. Opt-in
   * so other Hero usages stay untouched.
   */
  titleAccentRule?: boolean;
};

/**
 * The `light-video` background video, sized/positioned to match the original
 * in-hero treatment. Rendered either inside the hero (default) or, when the
 * page supplies a shared backdrop, as a full-bleed layer that spans the hero
 * and the marquee below it so the video is never cut by an opaque band.
 *
 * When `cover` is set, the video fills the full height of its (taller) backdrop
 * container via `h-full object-cover` instead of using its intrinsic height
 * anchored at the top. Used when the shared backdrop also spans the intro
 * paragraphs below the marquee, so the video reaches all the way down rather
 * than leaving the lower region on the plain white body background.
 */
export function HeroVideo({
  mediaSrc,
  cover = false,
}: {
  mediaSrc?: string;
  cover?: boolean;
}) {
  return (
    <video
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 z-0 -translate-x-1/2 max-w-none opacity-30 motion-reduce:hidden",
        cover ? "h-full md:h-[75%] w-[1020px] object-cover" : "w-[1020px]",
      )}
    >
      <source src={mediaSrc ?? "/scene-1.mp4"} type="video/mp4" />
    </video>
  );
}

export function Hero({
  variant = "light",
  eyebrow,
  title,
  subhead,
  children,
  mediaSrc,
  className,
  externalVideoBackdrop = false,
  titleAccentRule = false,
}: HeroProps) {
  const isDark = variant === "dark";
  const isLightVideo = variant === "light-video";
  const isLight = !isDark; // both "light" and "light-video"

  // Light variants get the v1 recipe: outer wrapper (max-w-6xl + px) + orb + hero <section>
  if (isLight) {
    return (
      <div
        className={cn(
          "relative mx-auto max-w-6xl px-5 md:px-4 bg-[#f7f4ec] text-[#1c1a16] overflow-x-clip",
          className,
        )}
      >
        {/* Clipped background layer for the orb, which is wider than small
            viewports and must be clipped to avoid horizontal overflow. */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          {/* Subtle background orb */}
          <div className="bg-orb absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#dc2626] opacity-[0.03] blur-[150px]" />
        </div>

        <section className="relative py-12 md:py-14 text-center items-center flex flex-col overflow-visible">
          {/* Background video: absolute within hero, scrolls with page.
              Skipped when the parent renders a shared full-bleed backdrop. */}
          {isLightVideo && !externalVideoBackdrop && <HeroVideo mediaSrc={mediaSrc} />}
          {eyebrow && (
            <div className="relative z-10 font-mono text-xs md:text-sm uppercase tracking-[0.12em] mb-4 text-[#dc2626]">
              {eyebrow}
            </div>
          )}

          <h1 className="relative z-10 font-heading text-[40px] md:text-6xl lg:text-[80px] tracking-[-0.02em] leading-[1.2]">
            {title}
          </h1>

          {titleAccentRule && (
            <span
              className="relative z-10 mt-4 block h-[3px] w-14 rounded-full bg-[#dc2626] animate-fade-in-up delay-100"
              aria-hidden="true"
            />
          )}

          {subhead && (
            <p className="relative z-10 mt-5 max-w-[639px] text-lg text-[#6c665a] md:text-xl text-center leading-snug">
              {subhead}
            </p>
          )}

          {children && <div className="relative z-10 mt-7 w-full flex flex-col items-center">{children}</div>}
        </section>
      </div>
    );
  }

  // Dark variant - kept for backwards compatibility.
  return (
    <section
      className={cn(
        "relative overflow-hidden py-20 md:py-32 bg-[#1c1a16] text-white",
        className,
      )}
    >
      {mediaSrc && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source src={mediaSrc} type="video/mp4" />
        </video>
      )}

      <div
        className="absolute inset-0 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(192,54,43,0.20) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {eyebrow && (
          <div className="font-mono text-xs md:text-sm uppercase tracking-[0.12em] mb-6 text-[#ef6a6a]">
            {eyebrow}
          </div>
        )}

        <h1 className="font-sans font-semibold tracking-[-0.03em] leading-[1.2] text-[40px] md:text-7xl lg:text-[96px]">
          {title}
        </h1>

        {subhead && (
          <p className="mt-6 max-w-[639px] mx-auto text-lg md:text-xl leading-relaxed text-white/70">
            {subhead}
          </p>
        )}

        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

export type AccentProps = {
  variant?: HeroVariant;
  children: ReactNode;
  className?: string;
};

export function Accent({ variant = "dark", children, className }: AccentProps) {
  return (
    <em
      className={cn(
        "font-heading not-italic",
        variant === "dark" ? "text-[#ef6a6a]" : "text-[#dc2626]",
        className,
      )}
    >
      {children}
    </em>
  );
}
