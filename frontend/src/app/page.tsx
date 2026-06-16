import type { Metadata } from "next";
import { Hero, Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StackTable } from "@/components/site/StackTable";
import { FoundingMarquee } from "@/components/site/FoundingMarquee";
import { CTABand } from "@/components/site/CTABand";

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
      {/* Founding members - double marquee, above the hero title */}
      <FoundingMarquee />

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

      {/* Section 3 - The Goal */}
      <section id="goal" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="The Goal"
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

      {/* Section 4 - CTA band */}
      <section className="py-16 md:py-24 bg-white">
        <CTABand title="The trust layer for agent-to-agent commerce." />
      </section>
    </>
  );
}
