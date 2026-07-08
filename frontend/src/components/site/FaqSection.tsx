import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Link } from "@/i18n/routing";
import { TELEGRAM_BOT_URL } from "@/lib/site-content";

type FaqItem = { q: string; a: string };

/** Slug of the "use cases" blog post linked from the FAQ. */
const USE_CASES_SLUG = "internet-court-use-cases";

/**
 * Per-item link handler for next-intl rich text. Only a couple of answers embed
 * a `<link>...</link>` marker; every other answer renders the tag as a no-op so
 * `t.rich` can be used uniformly across all items. Internal destinations use the
 * locale-aware Link; external ones (Telegram) use a plain anchor.
 */
const LINK_CLASS =
  "text-[#dc2626] underline decoration-[#dc2626]/40 underline-offset-2 transition-colors hover:decoration-[#dc2626]";

function linkFor(index: number): (chunks: ReactNode) => ReactNode {
  // Item 12 (index 11): use-cases blog post. Item 16 (index 15): Telegram.
  if (index === 11) {
    return (chunks) => (
      <Link href={`/blog/${USE_CASES_SLUG}`} className={LINK_CLASS}>
        {chunks}
      </Link>
    );
  }
  if (index === 15) {
    return (chunks) => (
      <a
        href={TELEGRAM_BOT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        {chunks}
      </a>
    );
  }
  // Fallback: render the marked text as plain (no anchor) for any other item.
  return (chunks) => <>{chunks}</>;
}

/**
 * FAQ section — plain semantic Q&A (not an accordion) so every answer is in the
 * DOM and crawlable for generative-engine optimization. Each answer leads with a
 * direct, self-contained statement an AI engine can quote verbatim.
 *
 * At sixteen questions the layout is a calm, editorial single-column list rather
 * than sixteen heavy cards: hairline rules separate each Q&A, a muted DM Mono
 * index numbers them, a short brand-red tick anchors the question, and the answer
 * sits in relaxed gray. Questions use DM Sans; the title's highlight is the
 * red Accent words. Subtle staggered fade-in on load.
 */
export async function FaqSection() {
  const t = await getTranslations("home.faq");
  const items = t.raw("items") as FaqItem[];

  return (
    <section id="faq" className="relative overflow-hidden py-16 md:py-24 bg-[#f7f4ec]">
      {/* Dotted radial grid backdrop, matching the homepage atmosphere. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(28,26,22,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t.rich("title", {
            accent: (chunks) => <Accent variant="light">{chunks}</Accent>,
          })}
        />

        <dl className="mt-10 md:mt-16 max-w-3xl mx-auto border-t border-black/[0.06]">
          {items.map((_, i) => (
            <div
              key={i}
              className="animate-fade-in-up group border-b border-black/[0.06] py-6 md:py-8"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              <div className="flex gap-4 md:gap-7">
                {/* Muted mono index numeral. */}
                <span
                  className="hidden sm:block shrink-0 w-8 pt-1 font-mono text-sm tabular-nums leading-none tracking-[0.12em] text-[#6c665a]/70"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 min-w-0">
                  <dt className="flex items-start gap-3">
                    {/* Brand-red tick rule. */}
                    <span
                      className="mt-[0.55rem] hidden md:block h-[3px] w-6 shrink-0 rounded-full bg-[#dc2626] transition-all duration-300 group-hover:w-9"
                      aria-hidden="true"
                    />
                    <h3 className="text-lg md:text-xl font-sans font-semibold tracking-[-0.03em] leading-snug text-[#1c1a16]">
                      {t(`items.${i}.q`)}
                    </h3>
                  </dt>
                  <dd className="mt-2.5 md:mt-3 md:pl-9 text-base md:text-[1.0625rem] text-[#6c665a] leading-relaxed">
                    {t.rich(`items.${i}.a`, { link: linkFor(i) })}
                  </dd>
                </div>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
