import { FOUNDING_MEMBERS_GRID, type Partner } from "@/lib/site-content";
import { cn } from "@/lib/utils";

export type PartnerGridProps = {
  className?: string;
};

/**
 * Global scale applied to each logo's Figma cell-height (in 40px-cell units).
 * The tallest entry (GenLayer / Collective Memory / etc. at ~22–24) lands at
 * ~33–36px on desktop, which sits comfortably in the fixed-height cells while
 * preserving the relative sizing of the Figma "Frame 68" layout exactly.
 */
const SCALE = 1.75;
/** Slightly smaller on phones, where the 3-column grid is narrower. */
const SCALE_MOBILE = 1.3;

// Monochrome at rest, lifting to full opacity on hover. Two treatments,
// matching the buró reference app: colored/dark marks get a tonal `grayscale(1)`
// (preserves internal luminance detail, so solid-fill logos like Starknet and
// Anoma stay recognizable), while white/light-on-transparent marks (flagged
// `partner.white`) get `brightness(0)` so they read as dark ink on the light
// background instead of vanishing. `brightness(0)` is NOT applied to colored
// logos, which is what used to crush them into featureless black blobs.
const LOGO_MOTION =
  "opacity-60 transition-opacity duration-300 group-hover:opacity-100";
const logoFilter = (white?: boolean) =>
  white
    ? `[filter:brightness(0)] ${LOGO_MOTION}`
    : `[filter:grayscale(1)] ${LOGO_MOTION}`;

/**
 * Static founding-members showcase: 6 columns on desktop (3 on mobile), source
 * order preserved. Uses flex-wrap with justify-center so any trailing partial
 * row sits centered, while the full rows above fill the width. Every cell is a
 * fixed-height flex box sized to hold 6 (or 3) logos per row; each logo's height
 * is the cell-height unit x SCALE, applied inline (px) so the relative sizing is
 * preserved. Logos use the shared monochrome treatment that lifts to full
 * opacity on hover.
 */
export function PartnerGrid({ className }: PartnerGridProps) {
  return (
    <ul
      className={cn(
        "mx-auto flex max-w-5xl flex-wrap justify-center gap-x-6 gap-y-10 md:gap-y-12",
        className,
      )}
    >
      {FOUNDING_MEMBERS_GRID.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className="group flex h-12 basis-[calc(33.333%-1rem)] items-center justify-center md:h-16 md:basis-[calc(16.666%-1.25rem)]"
        >
          <GridLogo partner={partner} />
        </li>
      ))}
    </ul>
  );
}

function GridLogo({ partner }: { partner: Partner }) {
  const unit = partner.gridHeight ?? 18;
  // Responsive px height via CSS custom property: mobile scale by default,
  // desktop scale at md+ (Tailwind arbitrary value reads the same variable).
  const style = {
    "--logo-h": `${unit * SCALE_MOBILE}px`,
    "--logo-h-md": `${unit * SCALE}px`,
  } as React.CSSProperties;

  if (partner.src) {
    return (
      <img
        src={partner.src}
        alt={partner.name}
        style={style}
        className={cn(
          "h-[var(--logo-h)] w-auto max-w-full object-contain md:h-[var(--logo-h-md)]",
          logoFilter(partner.white),
        )}
      />
    );
  }
  return (
    <span className="flex items-center gap-2" style={style}>
      {partner.iconSrc && (
        <img
          src={partner.iconSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "h-[var(--logo-h)] w-auto object-contain md:h-[var(--logo-h-md)]",
            logoFilter(partner.white),
          )}
        />
      )}
      <span
        className={cn(
          "font-sans font-medium leading-none text-[#1a1817]/60 transition-colors duration-300 group-hover:text-[#1a1817]",
          // Text height tracks the logo height (0.9× the cell unit) so icon+text
          // logos scale with the same Figma ratio as wordmark logos.
          "text-[length:calc(var(--logo-h)*0.9)] md:text-[length:calc(var(--logo-h-md)*0.9)]",
        )}
      >
        {partner.name}
      </span>
    </span>
  );
}
