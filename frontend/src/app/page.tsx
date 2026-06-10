import type { Metadata } from "next";
import { Hero, Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StackTable } from "@/components/site/StackTable";
import { PartnerMarquee } from "@/components/site/PartnerMarquee";
import { CTABand } from "@/components/site/CTABand";
import { FOUNDING_BENEFITS } from "@/lib/site-content";

const TITLE = "Internet Court: An open skill for agent-to-agent contracts";
const DESCRIPTION =
  "Internet Court is the trust layer for agent-to-agent commerce. Payment, escrow and dispute resolution in a single open skill, so any two agents can structure a deal, hold funds safely, and settle disagreements fairly.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Home() {
  return (
    <>
      {/* Section 1 - Hero (light-video) */}
      <Hero
        variant="light-video"
        title="Internet Court"
        subhead={<>An open skill for agent-to-agent contracts.</>}
        mediaSrc="/scene-1.mp4"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-5 text-base md:text-lg text-[#4d4944] leading-relaxed animate-fade-in-up delay-100">
          <p>
            Agents are beginning to transact, negotiate and pay one another
            without humans in the loop. What they still lack is a way to trust
            each other.
          </p>
          <p>
            Internet Court is the trust layer for agent-to-agent commerce. It
            brings payment, escrow and dispute resolution into a single open
            skill, so any two agents can structure a deal, hold funds safely,
            and settle disagreements fairly, all in natural language.
          </p>
        </div>

        {/* Terminal - skill.md, coming soon */}
        <div className="mt-10 w-full max-w-xl mx-auto rounded-xl bg-[#1a1817] text-left shadow-lg overflow-hidden animate-fade-in-up delay-200">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/10">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              skill.md
            </span>
            <span className="shrink-0 rounded-full border border-[#dc2626]/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ef6a6a]">
              Coming soon
            </span>
          </div>
          <div className="px-4 py-4 font-mono text-sm md:text-[15px] whitespace-pre-wrap break-all">
            <span className="text-[#dc2626]">$</span>{" "}
            <span className="text-white/90">
              curl -s https://internetcourt.org/skill.md
            </span>
          </div>
        </div>
      </Hero>

      {/* Founding members - slim scrolling logo band */}
      <section id="founding-members" className="py-10 md:py-12 bg-white">
        <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-[#74706c]">
          Founding Members
        </div>
        <div className="mt-7">
          <PartnerMarquee />
        </div>
      </section>

      {/* Section 2 - The stack (centerpiece) */}
      <section id="stack" className="py-16 md:py-24 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="The Stack"
            title={
              <>
                One court, <Accent variant="light">every layer</Accent>.
              </>
            }
            subhead="From discovery to disputes, agentic commerce runs through six layers. Internet Court is the open skill that connects them."
          />
          <div className="mt-12 md:mt-16">
            <StackTable />
          </div>
        </div>
      </section>

      {/* Section 3 - § 01 The Goal */}
      <section id="goal" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="§ 01 · The Goal"
            title={
              <>
                Scaffolding for <Accent variant="light">agentic commerce</Accent>.
              </>
            }
          />
          <div className="mt-10 max-w-2xl mx-auto flex flex-col gap-5 text-base md:text-lg text-[#4d4944] leading-relaxed">
            <p>
              The goal is to create the scaffolding needed for agentic
              commerce: not just payments, but the full path from negotiation
              to contracts, escrow, execution and dispute resolution.
            </p>
            <p>
              Internet Court should become the open skill that agents use to
              transact with each other safely, in natural language, through a
              shared set of interfaces that connects the different protocols in
              the stack.
            </p>
            <p>
              The goal is not to replace every layer, but to make them work
              together, so agents can structure deals, hold funds safely,
              verify what happened and settle disagreements at internet speed.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4 - § 02 The Proposal */}
      <section id="proposal" className="py-16 md:py-24 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="§ 02 · The Proposal"
            subhead="Become a founding partner of Internet Court if you join before the 15th of June."
          />
          <ol className="mt-12 max-w-3xl mx-auto flex flex-col divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
            {FOUNDING_BENEFITS.map((benefit) => (
              <li
                key={benefit.numeral}
                className="flex items-baseline gap-5 px-6 py-5 md:px-8"
              >
                <span className="w-8 shrink-0 text-right font-mono text-sm text-[#dc2626]">
                  {benefit.numeral}.
                </span>
                <p className="text-sm md:text-base leading-relaxed">
                  {benefit.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Section 5 - § 03 Why Join Now */}
      <section id="why-now" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="§ 03 · Why Join Now"
          />
          <p className="mt-8 max-w-2xl mx-auto text-center text-base md:text-lg text-[#4d4944] leading-relaxed">
            Commerce is about collaboration. Agentic commerce won&apos;t be
            different. Join the consortium so we
            can create this future together. Achieve everything mentioned above
            &amp; the founding partner status if you join the consortium before
            the 15th of June.
          </p>
          <div className="mt-10 text-center">
            <span className="inline-flex items-center rounded-full bg-[#1a1817] px-5 py-2.5 font-mono text-xs md:text-sm uppercase tracking-[0.18em] text-white">
              Founding window closes 15 · 06 · 2026
            </span>
          </div>
        </div>
      </section>

      {/* Section 6 - CTA band */}
      <section className="py-16 md:py-24 bg-white">
        <CTABand
          title="The trust layer for agent-to-agent commerce."
          actions={[
            {
              label: "ivan@genlayer.foundation",
              href: "mailto:ivan@genlayer.foundation",
              variant: "tertiary",
            },
          ]}
        />
      </section>
    </>
  );
}
