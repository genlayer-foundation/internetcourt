import { getTranslations } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { GLOSSARY_TERMS } from "@/lib/site-content";

/**
 * Glossary section — a semantic <dl> of the project's key terms. Term identity
 * and order come from GLOSSARY_TERMS (non-translatable); the display name and
 * definition come from messages under home.glossary.terms.<key>, so each entry
 * is self-contained and quotable for generative-engine optimization.
 */
export async function GlossarySection() {
  const t = await getTranslations("home.glossary");

  return (
    <section id="glossary" className="py-16 md:py-24 bg-[#f7f7f7]">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t.rich("title", {
            accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
          })}
        />
        <dl className="mt-10 md:mt-14 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          {GLOSSARY_TERMS.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <dt className="text-base md:text-lg font-sans font-extrabold tracking-tight text-[#1a1817]">
                {t(`terms.${key}.name`)}
              </dt>
              <dd className="text-sm md:text-base text-[#4d4944] leading-relaxed">
                {t(`terms.${key}.definition`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
