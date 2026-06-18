import {
  FOUNDING_MEMBERS_PRIMARY,
  FOUNDING_MEMBERS_SECONDARY,
} from "@/lib/site-content";
import { PartnerMarquee } from "@/components/site/PartnerMarquee";
import { cn } from "@/lib/utils";

export type FoundingMarqueeProps = {
  className?: string;
};

/**
 * Double partner-logo marquee (webflow wb-infinite-marquee style): a large
 * headline row of the most prominent partners scrolling one way, stacked over a
 * smaller row of the remaining partners scrolling the opposite way.
 */
export function FoundingMarquee({ className }: FoundingMarqueeProps) {
  return (
    <section
      id="founding-members"
      className={cn(
        // Full-bleed: escape any centered/max-width parent container and span
        // the full viewport width. Negative symmetric margins (50% - 50vw on
        // each side) keep the block at width:auto, so it spans 100vw without the
        // horizontal scrollbar a raw `w-screen`/100vw block can introduce.
        //
        // Fully transparent: the hero's background video is rendered as a
        // shared full-bleed backdrop behind both the hero and this marquee (see
        // page.tsx), so it flows continuously through here. No background fill,
        // scrim, or blur of any kind. Only the gray monochrome logos float over
        // the video. `z-10` keeps those logos above the backdrop.
        "relative z-10 mx-[calc(50%-50vw)] py-8 md:py-10",
        className,
      )}
    >
      <div className="flex flex-col gap-6 md:gap-8">
        <PartnerMarquee
          partners={FOUNDING_MEMBERS_PRIMARY}
          variant="primary"
        />
        <PartnerMarquee
          partners={FOUNDING_MEMBERS_SECONDARY}
          variant="secondary"
          reverse
        />
      </div>
    </section>
  );
}
