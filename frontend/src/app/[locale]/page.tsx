import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero, HeroVideo, Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AnimatedStack } from "@/components/site/AnimatedStack";
import { FoundingMarquee } from "@/components/site/FoundingMarquee";
import { PartnerGrid } from "@/components/site/PartnerGrid";
import { SkillCommand } from "@/components/site/SkillCommand";
import { CTABand } from "@/components/site/CTABand";
import { TheaterWatch } from "@/components/site/watch/TheaterWatch";
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
      {/* Section 1 - Hero (light-video) + partner marquee + intro paragraphs.
          The hero's background video is rendered here as a SHARED full-bleed
          backdrop that spans the hero, the marquee AND the intro paragraphs, so
          the video flows continuously behind all three instead of being cut by
          an opaque band or stopping above the copy. `overflow-x-clip` prevents
          the over-wide video from introducing a horizontal scrollbar. */}
      <div className="relative overflow-x-clip bg-white">
        {/* Shared background video backdrop (absolute, behind hero + marquee +
            intro paragraphs). `cover` makes the video fill the full height of
            this taller container so it reaches down behind the paragraphs
            rather than leaving them on the plain white body background. */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden="true"
        >
          <HeroVideo mediaSrc="/scene-1.mp4" cover />
        </div>

        <Hero
          variant="light-video"
          externalVideoBackdrop
          titleAccentRule
          className="bg-transparent"
          eyebrow={t("hero.eyebrow")}
          title={t("hero.title")}
          subhead={t("hero.subhead")}
          mediaSrc="/scene-1.mp4"
        >
          {/* skill.md - copyable curl + link to canonical SKILL.md on GitHub */}
          <SkillCommand className="animate-fade-in-up delay-100" />
        </Hero>

        {/* Partner-logo marquee - full-viewport-width band. Fully transparent
            (no fill, scrim, or blur) so the shared video backdrop above shows
            through completely behind the floating gray logos. */}
        <FoundingMarquee className="!py-6 animate-fade-in-up delay-200" />

        {/* Explanatory paragraphs - constrained, centered (formerly Hero
            children). Transparent background (no fill/scrim/blur) so the shared
            hero video backdrop shows through behind the copy, matching the
            marquee. `relative z-10` keeps the copy above the z-0 video. */}
        <div className="relative z-10 mx-auto max-w-6xl px-5 pt-6 md:px-4 text-[#1a1817]">
          <div className="mx-auto mb-20 md:mb-28 flex max-w-2xl flex-col gap-5 text-center text-base md:text-lg text-[#4d4944] leading-relaxed animate-fade-in-up delay-300">
            <p>{t("intro.p1")}</p>
            <p>{t("intro.p2")}</p>
          </div>
        </div>
      </div>

      {/* Section 2 - The stack (centerpiece) */}
      <section id="stack" className="py-16 md:py-24 bg-white">
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

      {/* Section 2.5 - Watch (launch video) */}
      <TheaterWatch />

      {/* Section 2.6 - Blog (Briefings from the court) */}
      <HomeBlogFeatured15 posts={getHomepagePosts(locale)} />

      {/* Section 3 - The Goal */}
      <section id="goal" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow={t("goal.eyebrow")}
            title={t.rich("goal.title", {
              accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
            })}
          />
          <div className="mt-10 max-w-2xl mx-auto flex flex-col gap-5 text-base md:text-lg text-[#4d4944] leading-relaxed">
            <p>{t("goal.p1")}</p>
            <p>{t("goal.p2")}</p>
            <p>{t("goal.p3")}</p>
          </div>
        </div>
      </section>

      {/* Section 4 - Founding partners (logo wall) */}
      <section id="founding-partners" className="py-16 md:py-24 bg-[#f7f7f7]">
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

      {/* Section 5 - CTA band */}
      <section className="py-16 md:py-24 bg-white">
        <CTABand title={t("cta.title")}>
          <SkillCommand />
        </CTABand>
      </section>
    </>
  );
}
