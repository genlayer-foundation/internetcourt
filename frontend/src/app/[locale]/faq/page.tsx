import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FaqSection } from "@/components/site/FaqSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAlternates, localizedUrl } from "@/lib/i18n-metadata";
import { faqPageSchema } from "@/lib/structured-data";

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

  const rawFaqItems = t.raw("faq.items") as { q: string; a: string }[];
  // Answers may embed <link>…</link> markers for inline links; strip the marker
  // tags so the FAQPage JSON-LD carries clean plain-text answers.
  const faqItems = rawFaqItems.map((item) => ({
    q: item.q,
    a: item.a.replace(/<\/?link>/g, ""),
  }));

  return (
    <div className="bg-[#f7f4ec] pt-16 md:pt-20">
      <JsonLd data={[faqPageSchema(faqItems, locale)]} />
      <FaqSection />
    </div>
  );
}
