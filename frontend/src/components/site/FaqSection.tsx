import { getTranslations } from "next-intl/server";
import { Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";

type FaqItem = { q: string; a: string };

/**
 * FAQ section — plain semantic Q&A (not an accordion) so every answer is in the
 * DOM and crawlable for generative-engine optimization. Each answer leads with
 * a direct, self-contained statement an AI engine can quote verbatim.
 *
 * With only three deliberate questions, each Q&A is an editorial card that
 * follows the homepage visual system: DM Mono index numerals, a brand-red tick
 * rule, DM Sans ink questions, relaxed body answers, hairline borders, a soft
 * shadow, a gentle hover lift, and staggered fade-in on load.
 */
export async function FaqSection() {
  const t = await getTranslations("home.faq");
  const items = t.raw("items") as FaqItem[];
  const delays = ["delay-100", "delay-200", "delay-300"];

  return (
    <section id="faq" className="relative overflow-hidden py-16 md:py-24 bg-white">
      {/* Dotted radial grid backdrop, matching the homepage atmosphere. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(26,24,23,0.06) 1px, transparent 1px)",
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

        <dl className="mt-10 md:mt-16 max-w-3xl mx-auto flex flex-col gap-5 md:gap-6">
          {items.map((_, i) => (
            <div
              key={i}
              className={`group animate-fade-in-up ${delays[i] ?? "delay-300"} rounded-2xl border border-black/[0.06] bg-white/80 backdrop-blur-sm p-6 md:p-8 shadow-[0_30px_70px_-30px_rgba(26,24,23,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_36px_80px_-28px_rgba(26,24,23,0.42)] hover:border-black/[0.1]`}
            >
              <div className="flex gap-5 md:gap-7">
                {/* Decorative index numeral. */}
                <span
                  className="hidden sm:block shrink-0 font-mono text-2xl md:text-3xl tabular-nums leading-none text-[#1a1817]/[0.14] pt-1 tracking-tight"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 min-w-0">
                  <dt className="flex items-start gap-3">
                    {/* Brand-red tick rule. */}
                    <span
                      className="mt-[0.7rem] hidden md:block h-[3px] w-8 shrink-0 rounded-full bg-[#dc2626] transition-all duration-300 group-hover:w-11"
                      aria-hidden="true"
                    />
                    <h3 className="text-xl md:text-2xl font-sans font-extrabold tracking-tight leading-snug text-[#1a1817]">
                      {t(`items.${i}.q`)}
                    </h3>
                  </dt>
                  <dd className="mt-3 md:mt-4 md:pl-11 text-base md:text-[1.0625rem] text-[#4d4944] leading-relaxed">
                    {t(`items.${i}.a`)}
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
