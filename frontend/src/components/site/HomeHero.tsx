import { getTranslations } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { FoundingMarquee } from "@/components/site/FoundingMarquee";
import { HeroScrollCue } from "@/components/site/heroes/HeroScrollCue";
import { HeroVideoPanel } from "@/components/site/heroes/HeroVideoPanel";
import { SkillCommand } from "@/components/site/SkillCommand";

/**
 * Production homepage hero — ported from the `split-5-tall` preview
 * (SplitV5Tall). Identical above-the-fold layout, "tall" video sizing, live
 * top-left-pixel color extension, translucent text card, pinned founding-logo
 * marquee + scroll cue. Two differences from the preview:
 *
 *   1. Copy comes from next-intl (`home.hero.*`) instead of hardcoded English,
 *      so eyebrow / title / subhead are localized. The title is "Internet Court"
 *      in every locale, so wrapping the word "Court" in <Accent> works for all.
 *   2. The live-colored extension + tall video stay identical to the preview.
 *
 * Server component: the card is server-rendered; only HeroVideoPanel is the
 * client island. Relies on the parent route's `setRequestLocale` for the locale.
 */
export async function HomeHero() {
  const t = await getTranslations("home");

  // Title is "Internet Court" in every locale — split on "Court" so the word
  // gets the serif-italic accent treatment regardless of language.
  const [titleBefore, titleAfter] = t("hero.title").split("Court");

  return (
    <section className="relative isolate min-h-[calc(100dvh-4.625rem)] bg-white text-[#1a1817] lg:h-[calc(100dvh-4.625rem)] lg:overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(26,24,23,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="mx-auto flex h-full max-w-6xl flex-col px-5 py-5 md:px-4 md:py-7">
        <div className="relative flex min-h-0 w-full flex-1 items-center">
          <div className="relative flex w-full flex-col lg:block">
            {/* Text card — on mobile it renders FIRST (above the video) in
                normal flow with a gap below it; on lg it is `lg:absolute` and
                overlays the left of the video panel (DOM order is irrelevant to
                the desktop look because it's taken out of flow). The blur lives
                on a dedicated inset glass layer (NOT on the content box) so
                Chrome composites it reliably and Firefox applies it at first
                paint instead of after load. CSS-only; no JS. */}
            <div className="relative z-10 mb-6 lg:absolute lg:inset-y-0 lg:left-0 lg:mb-0 lg:my-auto lg:h-fit lg:w-[34rem]">
              <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] p-5 shadow-[0_30px_70px_-30px_rgba(26,24,23,0.35)] md:p-7">
                {/* Glass layer: a clean, NON-transformed inset element that
                    carries the translucent fill + backdrop blur. Because no
                    ancestor between this layer and the <section> uses a
                    transform/filter/perspective, the backdrop root is the
                    section itself — so Chrome can sample the real content
                    behind the card and Firefox blurs from first paint without
                    a post-load reflow. This element must never carry a
                    transform (a transform on the same element as
                    backdrop-filter disables the filter in Chrome). Tailwind v4
                    emits both `-webkit-backdrop-filter` and `backdrop-filter`. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl bg-white/75 backdrop-blur-2xl"
                />

                {/* Text content sits ABOVE the glass layer. The entrance
                    animation lives HERE (a sibling of the glass layer, not an
                    ancestor) so its transform end-state never creates a
                    backdrop root for the glass — keeping the blur working in
                    Chrome. */}
                <div className="animate-fade-in-up delay-100 relative z-10">
                  <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#dc2626] md:text-sm lg:whitespace-nowrap">
                    {t("hero.eyebrow")}
                  </div>

                  <h1 className="mt-2.5 font-heading text-[32px] leading-[1.05] tracking-[-0.02em] md:text-5xl lg:whitespace-nowrap">
                    {titleBefore}
                    <Accent variant="light">Court</Accent>
                    {titleAfter}
                  </h1>

                  <p className="mt-2.5 text-base leading-snug text-[#74706c] md:text-lg lg:whitespace-nowrap">
                    {t("hero.subhead")}
                  </p>

                  <div className="mt-4">
                    <SkillCommand className="mx-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tallest video: width derived from the stage height so the
                16:9 picture fills the fold's height. Capped to the viewport
                width so it never overflows horizontally. On mobile the video
                fills the panel (no left extension, fully rounded) and sits
                BELOW the card; the live-colored left extension + flush seam
                return at lg. */}
            <HeroVideoPanel
              className="mx-auto w-full max-w-[min(100%,calc((58dvh-2rem)*16/9))] pl-0 lg:ml-[28rem] lg:w-[calc(100%-28rem+7rem)] lg:max-w-[calc(100vw-max(1rem,50vw-36rem)-30rem)] lg:pl-24"
            />
          </div>
        </div>

        <div className="relative z-10 mt-3 shrink-0 border-t border-black/[0.06]">
          <FoundingMarquee className="animate-fade-in-up delay-300 !py-2.5" />
        </div>

        <HeroScrollCue className="relative z-10 mt-2 shrink-0" />
      </div>
    </section>
  );
}
