import {
  FOUNDING_MEMBERS_PRIMARY,
  FOUNDING_MEMBERS_SECONDARY,
  type Partner,
} from "@/lib/site-content";
import { PartnerLogo } from "@/components/site/PartnerMarquee";
import { cn } from "@/lib/utils";

export type PartnerGridProps = {
  className?: string;
};

/**
 * Static founding-partners showcase — no grid lines. Headline partners render
 * large in the top group; the remaining partners render smaller below. Each
 * logo uses the shared monochrome treatment that lifts to full opacity on hover.
 */
export function PartnerGrid({ className }: PartnerGridProps) {
  return (
    <div className={cn("flex flex-col items-center gap-10 md:gap-14", className)}>
      <PartnerRow
        partners={FOUNDING_MEMBERS_PRIMARY}
        imgClassName="h-8 md:h-11"
        textClassName="text-2xl md:text-3xl"
        className="gap-x-12 gap-y-8 md:gap-x-16 md:gap-y-10"
      />
      <PartnerRow
        partners={FOUNDING_MEMBERS_SECONDARY}
        imgClassName="h-5 md:h-6"
        textClassName="text-base md:text-lg"
        className="max-w-4xl gap-x-10 gap-y-6 md:gap-x-12 md:gap-y-8"
      />
    </div>
  );
}

function PartnerRow({
  partners,
  imgClassName,
  textClassName,
  className,
}: {
  partners: Partner[];
  imgClassName: string;
  textClassName: string;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center justify-center", className)}>
      {partners.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className="group flex items-center"
        >
          <PartnerLogo
            partner={partner}
            imgClassName={imgClassName}
            textClassName={textClassName}
          />
        </li>
      ))}
    </ul>
  );
}
