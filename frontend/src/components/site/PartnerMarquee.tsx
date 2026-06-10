import { FOUNDING_MEMBERS, type Partner } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type PartnerMarqueeProps = {
  className?: string;
};

/**
 * Infinite auto-scrolling strip of founding-member logos. The sequence is
 * rendered twice (the duplicate is aria-hidden) inside a track animated
 * translateX(0 → -50%), which loops seamlessly because both halves are
 * identical in width. Pauses on hover; with reduced motion the animation is
 * disabled and the strip sits statically (clipped by overflow-hidden).
 * Edges are feathered with a CSS mask so logos slide in/out softly.
 */
export function PartnerMarquee({ className }: PartnerMarqueeProps) {
  return (
    <div
      className={cn(
        "marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div className="flex w-max animate-marquee">
        <MarqueeRow />
        <MarqueeRow ariaHidden />
      </div>
    </div>
  );
}

function MarqueeRow({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <ul
      aria-hidden={ariaHidden || undefined}
      className="flex shrink-0 items-center gap-12 pr-12 md:gap-16 md:pr-16"
    >
      {FOUNDING_MEMBERS.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className="group flex shrink-0 items-center"
        >
          <PartnerLogo
            partner={partner}
            imgClassName="h-6 md:h-7"
            textClassName="text-base md:text-lg"
          />
        </li>
      ))}
    </ul>
  );
}

const LOGO_FILTER =
  "[filter:grayscale(1)_brightness(0)] opacity-65 transition-[filter,opacity] duration-300 group-hover:[filter:none] group-hover:opacity-100";

type PartnerLogoProps = {
  partner: Partner;
  /** Height/sizing classes for the logo image. */
  imgClassName?: string;
  /** Typography classes for the icon + text composition. */
  textClassName?: string;
};

/**
 * Single partner logo with the shared monochrome-at-rest / color-on-hover
 * treatment. Expects an ancestor with the `group` class for the hover reveal.
 */
function PartnerLogo({
  partner,
  imgClassName = "h-7 md:h-8",
  textClassName = "text-lg md:text-xl",
}: PartnerLogoProps) {
  if (partner.src) {
    return (
      <img
        src={partner.src}
        alt={partner.name}
        className={cn("w-auto max-w-full object-contain", imgClassName, LOGO_FILTER)}
      />
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={partner.iconSrc}
        alt=""
        aria-hidden="true"
        className={cn("w-auto object-contain", imgClassName, LOGO_FILTER)}
      />
      <span
        className={cn(
          "font-sans font-medium text-[#1a1817]/65 transition-colors duration-300 group-hover:text-[#1a1817]",
          textClassName,
        )}
      >
        {partner.name}
      </span>
    </span>
  );
}
