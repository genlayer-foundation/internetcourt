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
};

export function Hero({
  variant = "light",
  eyebrow,
  title,
  subhead,
  children,
  mediaSrc,
  className,
}: HeroProps) {
  const isDark = variant === "dark";
  const isLightVideo = variant === "light-video";
  const isLight = !isDark; // both "light" and "light-video"

  // Light variants get the v1 recipe: outer wrapper (max-w-6xl + px) + orb + hero <section>
  if (isLight) {
    return (
      <div
        className={cn(
          "relative mx-auto max-w-6xl px-5 md:px-4 bg-white text-[#1a1817] overflow-x-clip",
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

        <section className="relative py-20 md:py-32 text-center items-center flex flex-col overflow-visible">
          {/* Background video: absolute within hero, scrolls with page */}
          {isLightVideo && (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 z-0 w-[1020px] max-w-none opacity-30 motion-reduce:hidden"
            >
              <source src={mediaSrc ?? "/scene-1.mp4"} type="video/mp4" />
            </video>
          )}
          {eyebrow && (
            <div className="relative z-10 font-mono text-xs md:text-sm uppercase tracking-[0.12em] mb-6 text-[#dc2626]">
              {eyebrow}
            </div>
          )}

          <h1 className="relative z-10 font-heading text-[40px] md:text-7xl lg:text-[96px] tracking-[-0.02em] leading-[1.2]">
            {title}
          </h1>

          {subhead && (
            <p className="relative z-10 mt-5 max-w-[639px] text-lg text-[#74706c] md:text-xl text-center leading-normal">
              {subhead}
            </p>
          )}

          {children && <div className="relative z-10 mt-10 w-full flex flex-col items-center">{children}</div>}
        </section>
      </div>
    );
  }

  // Dark variant - kept for backwards compatibility.
  return (
    <section
      className={cn(
        "relative overflow-hidden py-20 md:py-32 bg-[#0a0913] text-white",
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
            "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        {eyebrow && (
          <div className="font-mono text-xs md:text-sm uppercase tracking-[0.12em] mb-6 text-[#c8b6ff]">
            {eyebrow}
          </div>
        )}

        <h1 className="font-sans font-extrabold tracking-[-0.02em] leading-[1.2] text-[40px] md:text-7xl lg:text-[96px]">
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
        variant === "dark" ? "text-[#c8b6ff]" : "text-[#dc2626]",
        className,
      )}
      style={{ fontStyle: "italic" }}
    >
      {children}
    </em>
  );
}
