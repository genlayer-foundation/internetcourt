import { FOUNDING_MEMBERS, type Partner } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type PartnerMarqueeProps = {
  /** Logos to scroll. Defaults to the full founding-member list. */
  partners?: Partner[];
  /** "primary" renders large headline logos; "secondary" renders a smaller strip. */
  variant?: "primary" | "secondary";
  /** Scroll right-to-left (default) or, when true, left-to-right. */
  reverse?: boolean;
  /** Loop duration in seconds (lower = faster). */
  durationSeconds?: number;
  className?: string;
};

const VARIANTS = {
  primary: {
    img: "h-8 md:h-11",
    text: "text-2xl md:text-4xl",
    row: "gap-14 pr-14 md:gap-24 md:pr-24",
  },
  secondary: {
    img: "h-5 md:h-6",
    text: "text-base md:text-lg",
    row: "gap-12 pr-12 md:gap-16 md:pr-16",
  },
} as const;

/**
 * Infinite auto-scrolling strip of founding-member logos. The sequence is
 * rendered twice (the duplicate is aria-hidden) inside a track animated
 * translateX(0 → -50%), which loops seamlessly because both halves are
 * identical in width. Pauses on hover; with reduced motion the animation is
 * disabled and the strip sits statically (clipped by overflow-hidden).
 * Edges are feathered with a CSS mask so logos slide in/out softly.
 *
 * Two of these stacked (a large primary row + a smaller reversed secondary row)
 * form the double marquee at the top of the page.
 */
export function PartnerMarquee({
  partners = FOUNDING_MEMBERS,
  variant = "secondary",
  reverse = false,
  durationSeconds = 36,
  className,
}: PartnerMarqueeProps) {
  const sizing = VARIANTS[variant];
  return (
    <div
      className={cn(
        "marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-max",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
        )}
        style={{ animationDuration: `${durationSeconds}s` }}
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
          <PartnerLogo
            partner={partner}
            imgClassName={sizing.img}
            textClassName={sizing.text}
          />
        </li>
      ))}
    </ul>
  );
}

// Uniform monochrome at rest (logos arrive as mixed colored/white/PNG assets,
// so we flatten them all to dark ink), lifting to full opacity on hover.
const LOGO_FILTER =
  "[filter:grayscale(1)_brightness(0)] opacity-60 transition-opacity duration-300 group-hover:opacity-100";

type PartnerLogoProps = {
  partner: Partner;
  /** Height/sizing classes for the logo image. */
  imgClassName?: string;
  /** Typography classes for the icon + text composition. */
  textClassName?: string;
};

/**
 * Single partner logo with the shared monochrome treatment. Expects an ancestor
 * with the `group` class for the hover reveal.
 */
export function PartnerLogo({
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
      {partner.iconSrc && (
        <img
          src={partner.iconSrc}
          alt=""
          aria-hidden="true"
          className={cn("w-auto object-contain", imgClassName, LOGO_FILTER)}
        />
      )}
      <span
        className={cn(
          "font-sans font-medium text-[#1a1817]/60 transition-colors duration-300 group-hover:text-[#1a1817]",
          textClassName,
        )}
      >
        {partner.name}
      </span>
    </span>
  );
}
