import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Accent } from "@/components/site/Hero";
import { Legend } from "@/components/caniagent/Legend";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Can I Agent? — variant previews — Internet Court",
  robots: { index: false, follow: false },
};

const TAG = "Stack × Roadmap";

const VARIANTS: ReadonlyArray<{
  n: number;
  name: string;
  href: string;
  desc: string;
}> = [
  {
    n: 1,
    name: "Strata",
    href: "/caniagent/strata",
    desc: "Stacked geological bands. Standards sit on a maturity axis inside each band, and the integrations live in the colored seams between the bands.",
  },
  {
    n: 2,
    name: "Ledger",
    href: "/caniagent/ledger",
    desc: "An editorial, caniuse-style table — readiness %-bars and standard chips, with an inline strip of colored integration squares per row.",
  },
  {
    n: 3,
    name: "Thermal",
    href: "/caniagent/thermal",
    desc: "Bold heat tiles with standard heat sub-cells. Integrations surface as inline connector tabs the moment a tile expands.",
  },
  {
    n: 4,
    name: "Flow",
    href: "/caniagent/flow",
    desc: "A vertical lifecycle pipeline. Centered colored connector pipes join the steps; each standard carries its own mini maturity meter.",
  },
  {
    n: 5,
    name: "Lanes",
    href: "/caniagent/lanes",
    desc: "A refined roadmap of maturity-column lanes, a layer-readiness block on the right, and connections via highlight plus a bottom integration strip.",
  },
] as const;

export default async function CaniagentIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Enable static rendering for this locale (mirrors hero-previews pattern).
  setRequestLocale(locale);

  return (
    <main className="bg-white text-[#1a1817]">
      {/* Internal-preview banner — same chrome as hero-previews. */}
      <header className="border-b border-black/10 bg-[#1a1817] px-5 py-6 text-white md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ef6a6a]">
          Internal preview
        </p>
        <h1 className="mt-1 font-heading text-2xl md:text-3xl">
          Can I Agent? — round 2 · five Stack × Roadmap treatments
        </h1>
        <p className="mt-1 font-mono text-xs text-white/50">
          A focused set of Stack × Roadmap explorations. Same data across all
          five; the difference is form.
        </p>
      </header>

      {/* Concept / intro */}
      <section className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-20">
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
          The agentic-commerce readiness map
        </div>
        <h2 className="mt-4 max-w-3xl font-heading text-4xl leading-[1.1] tracking-[-0.02em] md:text-6xl">
          <Accent variant="light">Can I Agent?</Accent>
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#4d4944] md:text-xl">
          caniuse.com tells you which web features browsers support today. This
          asks the equivalent for autonomous commerce:{" "}
          <span className="text-[#1a1817]">
            can agents transact with each other yet — and which parts of the
            stack are actually ready?
          </span>
        </p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#74706c]">
          It is an interactive heatmap of the six-layer agentic-commerce stack:
          every layer, every standard inside it (ERC-7857, A2A, x402, GenLayer,
          and more), and the integrations <em className="not-italic">between</em>{" "}
          layers are colored on a green → red readiness scale. Hover any cell to
          read why it earned its color, with sources.
        </p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#74706c]">
          This is round 2 — a focused set of{" "}
          <span className="text-[#1a1817]">Stack × Roadmap</span> explorations.
          Each treatment marries the layered stack with a maturity axis and
          surfaces the integrations a different way.
        </p>

        {/* Establish the color language up front. */}
        <div className="mt-10 rounded-xl border border-black/10 bg-[#fafaf9] px-5 py-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[#74706c]">
            Readiness scale
          </p>
          <Legend showUnrated />
        </div>
      </section>

      {/* Variant cards */}
      <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8 md:pb-24">
        <div className="mb-8 flex items-baseline justify-between border-b border-black/10 pb-4">
          <h3 className="font-heading text-xl text-[#1a1817] md:text-2xl">
            Five treatments
          </h3>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#74706c]">
            Stack × Roadmap · different form
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VARIANTS.map(({ n, name, href, desc }) => (
            <li key={n} className="flex">
              <Link
                href={href}
                className={cn(
                  "group relative flex w-full flex-col rounded-2xl border border-black/10 bg-white p-6",
                  "transition-all duration-200 hover:-translate-y-1 hover:border-[#dc2626]/40 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#dc2626]">
                    {String(n).padStart(2, "0")}
                  </span>
                  <span className="rounded-full border border-black/10 bg-[#fafaf9] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#74706c]">
                    {TAG}
                  </span>
                </div>

                <h4 className="mt-4 font-heading text-2xl text-[#1a1817]">
                  {name}
                </h4>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#74706c]">
                  {desc}
                </p>

                <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#1a1817] transition-colors group-hover:text-[#dc2626]">
                  View
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-2xl font-mono text-[11px] leading-relaxed text-[#9ca3af]">
          Internal preview — round 2. These five Stack × Roadmap pages exist so
          we can pick one direction to promote to a public Can I Agent? page. All
          are noindexed for now.
        </p>
      </section>
    </main>
  );
}
