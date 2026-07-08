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
 *      underneath (card fills the ~530px column). RIGHT: the video panel
 *      (rounded 12px, near-black backdrop, object-cover) stretched to match
 *      the left column's height, ~560px wide. This replaces the former
 *      full-width 1152x675 video panel.
 *   2. Below the row, full container width: the "Backed by" grid, TWO rows of
 *      five cycling logo boxes covering the full founding-partners list
 *      (BackedByLogos, 10 slots).
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
        {/* Hero row: heading + SkillCommand left, video right. Stacks on
            mobile (title, then card, then video). */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
          <div className="animate-fade-in-up flex flex-1 flex-col">
            <p className="font-mono text-sm uppercase tracking-[0.1em] text-[#6c665a]">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 whitespace-pre-line font-sans text-[40px] font-semibold leading-none tracking-[-0.03em] md:text-[56px]">
              {t("hero.title")}
            </h1>
            <div className="mt-6 w-full">
              <SkillCommand className="mx-0" />
            </div>
          </div>

          {/* Right column video: fills the column height on lg (object-cover
              inside the player crops the 16:9 source elegantly); fixed
              aspect on mobile where the column has no height to inherit. */}
          <div className="animate-fade-in-up delay-100 w-full lg:w-[560px] lg:shrink-0">
            <HeroVideoPlayer className="aspect-video h-full w-full rounded-xl bg-[#0a0a0a] lg:aspect-auto" />
          </div>
        </div>

        {/* Backed-by logo grid: 2 x 5 cycling boxes (replaces the marquee). */}
        <BackedByLogos
          label={t("hero.backedBy")}
          className="animate-fade-in-up delay-300 mt-10"
        />
      </div>
    </section>
  );
}
