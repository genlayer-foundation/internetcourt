import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { HomeHero } from "@/components/site/HomeHero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AnimatedStack } from "@/components/site/AnimatedStack";
import { PartnerGrid } from "@/components/site/PartnerGrid";
import { SkillCommand } from "@/components/site/SkillCommand";
import { CTABand } from "@/components/site/CTABand";
import HomeBlogFeatured15 from "@/components/site/HomeBlogFeatured15";
import { getHomepagePosts } from "@/lib/blog";
import { buildAlternates } from "@/lib/i18n-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home.metadata" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: buildAlternates("/", locale),
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <>
      {/* Section 1 - Hero (Figma "cleaner top" layout). Self-contained top
          section: eyebrow + headline left, SkillCommand card right, then the
          full-width video panel and the cycling "Backed by" logo row (which
          replaces the old FoundingMarquee on this page). */}
      <HomeHero />

      {/* Explanatory paragraphs - constrained, centered. */}
      <section className="bg-[#f7f4ec]">
        <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16 md:px-4 text-[#1c1a16]">
          <div className="mx-auto mb-20 md:mb-28 flex max-w-2xl flex-col gap-5 text-center text-base md:text-lg text-[#6c665a] leading-relaxed">
            <p>{t("intro.p1")}</p>
            <p>{t("intro.p2")}</p>
          </div>
        </div>
      </section>

      {/* Section 2 - The stack (centerpiece) */}
      <section id="stack" className="py-16 md:py-24 bg-[#f7f4ec]">
        <AnimatedStack
          pinned
          header={
            <SectionHeading
              eyebrow={t("stack.eyebrow")}
              title={t.rich("stack.title", {
                accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
              })}
              subhead={t("stack.subhead")}
            />
          }
          footer={
            <p className="mt-8 px-4 text-center text-sm italic text-muted-foreground">
              {t("stack.footer")}
            </p>
          }
        />
      </section>

      {/* Section 3 - The Goal */}
      <section id="goal" className="py-16 md:py-24 bg-[#efe9da]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow={t("goal.eyebrow")}
            title={t.rich("goal.title", {
              accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
            })}
          />
          <div className="mt-10 max-w-2xl mx-auto flex flex-col gap-5 text-center text-base md:text-lg text-[#6c665a] leading-relaxed">
            <p>{t("goal.p1")}</p>
            <p>{t("goal.p2")}</p>
            <p>
              {t.rich("goal.p3", {
                strong: (chunks) => (
                  <strong className="font-semibold text-[#1c1a16]">
                    {chunks}
                  </strong>
                ),
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2.6 - Blog (Briefings from the court) */}
      <HomeBlogFeatured15 posts={getHomepagePosts(locale)} />

      {/* Section 4 - Founding partners (logo wall) */}
      <section id="founding-partners" className="py-16 md:py-24 bg-[#efe9da]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow={t("partners.eyebrow")}
            title={t.rich("partners.title", {
              accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
            })}
            subhead={t("partners.subhead")}
          />
          <div className="mt-12 md:mt-16">
            <PartnerGrid />
          </div>
        </div>
      </section>

      {/* Section 5 - CTA band (editorial closing) */}
      <section className="py-24 md:py-32 bg-[#f7f4ec]">
        <CTABand
          title={t.rich("cta.title", {
            accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
          })}
          subhead={t("cta.subhead")}
        >
          <SkillCommand />
        </CTABand>
      </section>
    </>
  );
}
