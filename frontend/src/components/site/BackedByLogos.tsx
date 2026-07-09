"use client";

import { useEffect, useRef, useState } from "react";
import { FOUNDING_MEMBERS, type Partner } from "@/lib/site-content";
import { PartnerLogo } from "@/components/site/PartnerMarquee";
import { cn } from "@/lib/utils";

/**
 * Constant linear travel speed (CSS px per second), matching the site's other
 * marquees (see PartnerMarquee). Each row derives its animation duration from
 * its own measured content width so both rows scroll at identical px/sec.
 */
const SPEED_PX_PER_SECOND = 45;

/** Split the full founding-members list across the two rows (15 / 14). */
const ROW_SPLIT = Math.ceil(FOUNDING_MEMBERS.length / 2);
const ROW_ONE = FOUNDING_MEMBERS.slice(0, ROW_SPLIT);
const ROW_TWO = FOUNDING_MEMBERS.slice(ROW_SPLIT);

/**
 * One copy of a row's box sequence. The track renders it twice (the duplicate
 * aria-hidden) and translates -50%, which loops seamlessly because the two
 * halves are identical in width; `pr-[15px]` keeps the box gap across the
 * seam. Boxes keep the "Backed by" treatment at a compact size: 152x72 (seven
 * boxes per 1152px container width instead of the previous five 218x104),
 * warm `#ebe9e0` fill, 12px radius, logo centered. Logos reuse PartnerLogo's
 * per-partner CSS vars scaled down x0.72 to match the smaller box.
 */
const LOGO_IMG_CLASS =
  "h-[calc(var(--logo-h)*0.72)] w-auto md:h-[calc(var(--logo-h-md)*0.72)]";
const LOGO_TEXT_CLASS =
  "text-[length:calc(var(--logo-h)*0.65)] md:text-[length:calc(var(--logo-h-md)*0.65)]";

function BoxRow({
  partners,
  ariaHidden = false,
}: {
  partners: Partner[];
  ariaHidden?: boolean;
}) {
  return (
    <ul
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-[15px] pr-[15px]"
    >
      {partners.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className="group flex h-[72px] w-[152px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ebe9e0] px-4"
        >
          <PartnerLogo
            partner={partner}
            imgClassName={LOGO_IMG_CLASS}
            textClassName={LOGO_TEXT_CLASS}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * A continuous marquee line of logo boxes (duplicate-track technique, same as
 * PartnerMarquee): the track holds two identical copies and translates -50%,
 * with the duration derived from the measured half-track width so the px/sec
 * speed stays constant across rows and breakpoints. Pauses on hover (the
 * `.marquee:hover` rule in globals.css); with reduced motion the keyframes
 * are disabled and the row sits statically, clipped by overflow-hidden.
 */
function BoxMarqueeRow({
  partners,
  reverse = false,
}: {
  partners: Partner[];
  reverse?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | undefined>();

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
    <div className="marquee relative overflow-hidden">
      <div
        ref={trackRef}
        className={cn(
          "flex w-max",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
        style={
          durationSeconds
            ? { animationDuration: `${durationSeconds}s` }
            : undefined
        }
      >
        <BoxRow partners={partners} />
        <BoxRow partners={partners} ariaHidden />
      </div>
    </div>
  );
}

/**
 * "Backed by" double marquee: TWO counter-scrolling lines of logo boxes (no
 * label; the `home.hero.backedBy` message key still exists but is not
 * rendered). Row 1 (first 15 founding members) scrolls right-to-left; row 2
 * (remaining 14) scrolls left-to-right, mirroring the site's old double
 * marquee. Every logo is always somewhere in the track (no swapping or
 * crossfade), and the rows run full-bleed edge to edge with no fade masks,
 * matching the old FoundingMarquee behavior.
 */
export function BackedByLogos({ className }: { className?: string }) {
  return (
    <div className={className}>
      {/* Full-bleed escape from the centered container (same trick as the old
          FoundingMarquee): symmetric 50% - 50vw margins span the viewport
          without introducing a horizontal scrollbar. */}
      <div className="relative mx-[calc(50%-50vw)] flex flex-col gap-[15px]">
        <BoxMarqueeRow partners={ROW_ONE} />
        <BoxMarqueeRow partners={ROW_TWO} reverse />
      </div>
    </div>
  );
}
