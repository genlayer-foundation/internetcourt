import { getTranslations } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";

type FaqItem = { q: string; a: string };

/**
 * FAQ section — plain semantic Q&A (not an accordion) so every answer is in the
 * DOM and crawlable for generative-engine optimization. Each answer leads with
 * a direct, self-contained statement an AI engine can quote verbatim.
 */
export async function FaqSection() {
  const t = await getTranslations("home.faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section id="faq" className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t.rich("title", {
            accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
          })}
        />
        <dl className="mt-10 md:mt-14 max-w-3xl mx-auto flex flex-col gap-8 md:gap-10">
          {items.map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <dt>
                <h3 className="text-xl md:text-2xl font-sans font-extrabold tracking-tight leading-snug text-[#1a1817]">
                  {t(`items.${i}.q`)}
                </h3>
              </dt>
              <dd className="text-base md:text-lg text-[#4d4944] leading-relaxed">
                {t(`items.${i}.a`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
