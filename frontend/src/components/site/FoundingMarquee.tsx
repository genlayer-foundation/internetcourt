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
      className={cn("bg-white py-8 md:py-10", className)}
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
