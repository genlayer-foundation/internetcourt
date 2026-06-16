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
 * Double founding-members marquee (webflow wb-infinite-marquee style): a large
 * headline row of the most prominent partners scrolling one way, stacked over a
 * smaller row of the remaining partners scrolling the opposite way.
 */
export function FoundingMarquee({ className }: FoundingMarqueeProps) {
  return (
    <section
      id="founding-members"
      className={cn("bg-white py-10 md:py-12", className)}
    >
      <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-[#74706c]">
        Founding Members
      </div>
      <div className="mt-8 flex flex-col gap-6 md:mt-10 md:gap-8">
        <PartnerMarquee
          partners={FOUNDING_MEMBERS_PRIMARY}
          variant="primary"
          durationSeconds={48}
        />
        <PartnerMarquee
          partners={FOUNDING_MEMBERS_SECONDARY}
          variant="secondary"
          reverse
          durationSeconds={40}
        />
      </div>
    </section>
  );
}
