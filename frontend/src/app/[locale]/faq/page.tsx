import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqSection } from "@/components/site/FaqSection";
import { GlossarySection } from "@/components/site/GlossarySection";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAlternates, localizedUrl } from "@/lib/i18n-metadata";
import { faqPageSchema, definedTermSetSchema } from "@/lib/structured-data";
import { GLOSSARY_TERMS } from "@/lib/site-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq.metadata" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: buildAlternates("/faq", locale),
    openGraph: {
      title,
      description,
      url: localizedUrl("/faq", locale),
      type: "website",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const faqItems = t.raw("faq.items") as { q: string; a: string }[];
  const glossaryTerms = GLOSSARY_TERMS.map((id) => ({
    id,
    name: t(`glossary.terms.${id}.name`),
    definition: t(`glossary.terms.${id}.definition`),
  }));

  return (
    <div className="bg-white pt-16 md:pt-20">
      <JsonLd
        data={[
          faqPageSchema(faqItems, locale),
          definedTermSetSchema(glossaryTerms, locale),
        ]}
      />
      <FaqSection />
      <GlossarySection />
    </div>
  );
}
