"use client";

import { useEffect, useRef, useState } from "react";
import {
  FOUNDING_MEMBERS,
  GRID_HEIGHT_BY_NAME,
  type Partner,
} from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type PartnerMarqueeProps = {
  /** Logos to scroll. Defaults to the full founding-member list. */
  partners?: Partner[];
  /** "primary" renders large headline logos; "secondary" renders a smaller strip. */
  variant?: "primary" | "secondary";
  /** Scroll right-to-left (default) or, when true, left-to-right. */
  reverse?: boolean;
  className?: string;
};

/**
 * Constant linear travel speed (CSS px per second) shared by every marquee row.
 * Both rows compute their animation duration from their own content width
 * (duration = contentWidth / SPEED), so they scroll at the identical px/sec
 * regardless of how many logos each carries.
 */
const SPEED_PX_PER_SECOND = 45;

/**
 * Logo heights match the static grid (PartnerGrid). Grid logos are sized as
 * `gridHeight × SCALE` px — 1.2 on mobile, 1.5 on desktop — so we reuse those
 * same factors here keyed by partner name. Fallback unit (18) mirrors the grid.
 */
const GRID_SCALE = 1.5;
const GRID_SCALE_MOBILE = 1.2;

// Identical monochrome treatment to PartnerGrid: colored/dark marks get a tonal
// `grayscale(1)` (preserves internal detail so solid-fill logos like Starknet
// and Anoma stay recognizable), while white/light-on-transparent marks (flagged
// `partner.white`) get `brightness(0)` so they read as dark ink on the light
// background. Both sit at 60% opacity, lifting to full opacity on hover.
const LOGO_MOTION =
  "opacity-60 transition-opacity duration-300 group-hover:opacity-100";
const logoFilter = (white?: boolean) =>
  white
    ? `[filter:brightness(0)] ${LOGO_MOTION}`
    : `[filter:grayscale(1)] ${LOGO_MOTION}`;

const VARIANTS = {
  primary: {
    row: "gap-14 pr-14 md:gap-24 md:pr-24",
  },
  secondary: {
    row: "gap-12 pr-12 md:gap-16 md:pr-16",
  },
} as const;

/**
 * Infinite auto-scrolling strip of founding-member logos. The sequence is
 * rendered twice (the duplicate is aria-hidden) inside a track animated
 * translateX(0 → -50%), which loops seamlessly because both halves are
 * identical in width. The animation duration is derived from the measured
 * content width so the scroll speed (px/sec) is constant across rows. Pauses on
 * hover; with reduced motion the animation is disabled and the strip sits
 * statically (clipped by overflow-hidden). Logos run crisp all the way to the
 * left and right edges (no edge fade/mask).
 *
 * Two of these stacked (a large primary row + a smaller reversed secondary row)
 * form the double marquee at the top of the page.
 */
export function PartnerMarquee({
  partners = FOUNDING_MEMBERS,
  variant = "secondary",
  reverse = false,
  className,
}: PartnerMarqueeProps) {
  const sizing = VARIANTS[variant];
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>();

  // Measure one copy's width (= half the track) and derive a duration that keeps
  // the linear travel speed constant. Re-measures on resize so the speed stays
  // constant across breakpoints.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const halfWidth = track.scrollWidth / 2;
      if (halfWidth > 0) {
        setDurationSeconds(halfWidth / SPEED_PX_PER_SECOND);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [partners]);

  return (
    <div
      className={cn(
        "marquee relative overflow-hidden",
        className,
      )}
    >
      <div
        ref={trackRef}
        className={cn(
          "flex w-max",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
        style={durationSeconds ? { animationDuration: `${durationSeconds}s` } : undefined}
      >
        <MarqueeRow partners={partners} sizing={sizing} />
        <MarqueeRow partners={partners} sizing={sizing} ariaHidden />
      </div>
    </div>
  );
}

type Sizing = (typeof VARIANTS)[keyof typeof VARIANTS];

function MarqueeRow({
  partners,
  sizing,
  ariaHidden = false,
}: {
  partners: Partner[];
  sizing: Sizing;
  ariaHidden?: boolean;
}) {
  return (
    <ul
      aria-hidden={ariaHidden || undefined}
      className={cn("flex shrink-0 items-center", sizing.row)}
    >
      {partners.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className="group flex shrink-0 items-center"
        >
          <PartnerLogo partner={partner} />
        </li>
      ))}
    </ul>
  );
}

type PartnerLogoProps = {
  partner: Partner;
  /** Optional height override (e.g. brand page). Defaults to grid-matched height. */
  imgClassName?: string;
  /** Optional typography override paired with `imgClassName`. */
  textClassName?: string;
};

/**
 * Single partner logo, rendered with the identical monochrome treatment as the
 * static grid (logoFilter: tonal grayscale for colored marks, brightness(0) ink
 * for white marks, at 60% opacity, lifting to full opacity on hover). No blur.
 * Height matches the
 * static grid (gridHeight × SCALE) unless an explicit
 * `imgClassName`/`textClassName` override is supplied.
 */
export function PartnerLogo({ partner, imgClassName, textClassName }: PartnerLogoProps) {
  const unit = GRID_HEIGHT_BY_NAME[partner.name] ?? partner.gridHeight ?? 18;
  const style = {
    "--logo-h": `${unit * GRID_SCALE_MOBILE}px`,
    "--logo-h-md": `${unit * GRID_SCALE}px`,
  } as React.CSSProperties;
  const logoSize =
    imgClassName ?? "h-[var(--logo-h)] w-auto md:h-[var(--logo-h-md)]";
  const textSize =
    textClassName ??
    "text-[length:calc(var(--logo-h)*0.9)] md:text-[length:calc(var(--logo-h-md)*0.9)]";

  if (partner.src) {
    return (
      <img
        src={partner.src}
        alt={partner.name}
        style={style}
        className={cn("max-w-full object-contain", logoSize, logoFilter(partner.white))}
      />
    );
  }
  return (
    <span className="flex items-center gap-2.5" style={style}>
      {partner.iconSrc && (
        <img
          src={partner.iconSrc}
          alt=""
          aria-hidden="true"
          className={cn("object-contain", logoSize, logoFilter(partner.white))}
        />
      )}
      <span
        className={cn(
          "font-sans font-medium leading-none text-[#1c1a16]/60 transition-colors duration-300 group-hover:text-[#1c1a16]",
          textSize,
        )}
      >
        {partner.name}
      </span>
    </span>
  );
}
