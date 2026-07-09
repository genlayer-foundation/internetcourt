import { getTranslations } from "next-intl/server";
import { BackedByLogos } from "@/components/site/BackedByLogos";
import { HeroVideoPlayer } from "@/components/site/heroes/HeroVideoPlayer";
import { SkillCommand } from "@/components/site/SkillCommand";

/**
 * Production homepage hero: heading, SkillCommand card AND video all above
 * the fold on a typical desktop viewport.
 *
 *   1. Two-column hero row inside the 1152px container. LEFT: mono eyebrow +
 *      DM Sans SemiBold headline with the SkillCommand terminal card directly
 *      underneath (card fills the ~448px column). RIGHT: the video panel
 *      (rounded 12px, near-black backdrop) at a fixed 16:9 aspect-video box,
 *      640px wide so it clearly outweighs the SkillCommand card,
 *      object-contain so the source is never cropped; the column
 *      self-centers against the left column.
 *   2. Below the row: the backed-by logos, TWO counter-scrolling marquee rows
 *      of compact logo boxes covering the full founding-partners list
 *      (BackedByLogos, no label).
 *
 * Responsive: below md everything stacks full width (title, card, video).
 * From md to lg the heading and the SkillCommand card share one row (heading
 * flex-1 at 40px, card a fixed 400px bottom-aligned column) with the video
 * full width underneath, so the video is not pushed below the fold on
 * tablets. At lg+ the two-column layout above applies unchanged.
 *
 * Fold math (1440x900): header ~84px + hero pt 40px + row ~399px (eyebrow 20
 * + 16 + three 56px headline lines 168 + 24 + SkillCommand ~171) = ~523px to
 * the bottom of the row; heading, card and video all clear the fold with the
 * first logo row as well. Server component: only HeroVideoPlayer and
 * BackedByLogos are client islands. The headline uses explicit line breaks
 * from the translation (whitespace-pre-line).
 */
export async function HomeHero() {
  const t = await getTranslations("home");

  return (
    <section className="bg-[#f7f4ec] text-[#1c1a16]">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-4 md:pt-10">
        {/* Hero row. Below md: full-width stack (title, card, video). From md
            to lg: heading left and SkillCommand right in one row, video
            full-width underneath so it stays above the fold on tablets. At
            lg+: heading with the card underneath on the left, video right. */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="animate-fade-in-up flex flex-1 flex-col md:flex-row md:items-end md:gap-8 lg:flex-col lg:items-stretch lg:gap-0">
            <div className="min-w-0 md:flex-1 lg:flex-none">
              <p className="font-mono text-sm uppercase tracking-[0.1em] text-[#6c665a]">
                {t("hero.eyebrow")}
              </p>
              <h1 className="mt-4 whitespace-pre-line font-sans text-[40px] font-semibold leading-none tracking-[-0.03em] lg:text-[56px]">
                {t("hero.title")}
              </h1>
            </div>
            {/* Card: full width when stacked, a fixed 400px column beside the
                heading on the md row (wide enough for the one-token skill.md
                URL at md:break-normal), back to full column width at lg. */}
            <div className="mt-6 w-full md:mt-0 md:w-[400px] md:shrink-0 lg:mt-6 lg:w-full">
              <SkillCommand className="mx-0" />
            </div>
          </div>

          {/* Right column video: always a fixed 16:9 box (aspect-video) at
              full column width, never cropped (object-contain inside the
              dark rounded panel). The column self-centers against the
              taller left column instead of stretching. */}
          <div className="animate-fade-in-up delay-100 w-full self-center lg:w-[640px] lg:shrink-0">
            <HeroVideoPlayer
              className="aspect-video w-full rounded-xl bg-[#0a0a0a]"
              videoClassName="object-contain"
            />
          </div>
        </div>

        {/* Backed-by logos: two counter-scrolling marquee rows of compact
            boxes (label intentionally not rendered). */}
        <BackedByLogos className="animate-fade-in-up delay-300 mt-10" />
      </div>
    </section>
  );
}
