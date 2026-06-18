import type { Metadata } from "next";
import { Hero, Accent } from "@/components/site/Hero";
import { SectionHeading } from "@/components/site/SectionHeading";
import { AnimatedStack } from "@/components/site/AnimatedStack";
import { FoundingMarquee } from "@/components/site/FoundingMarquee";
import { PartnerGrid } from "@/components/site/PartnerGrid";
import { SkillCommand } from "@/components/site/SkillCommand";
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

        {/* skill.md - copyable curl + link to canonical SKILL.md on GitHub */}
        <SkillCommand className="mt-10 animate-fade-in-up delay-200" />
      </Hero>

      {/* Section 2 - The stack (centerpiece) */}
      <section id="stack" className="py-16 md:py-24 bg-white">
        <AnimatedStack
          pinned
          header={
            <SectionHeading
              eyebrow="The Stack"
              title={
                <>
                  One court, <Accent variant="light">every layer</Accent>.
                </>
              }
              subhead="From discovery to disputes, agentic commerce runs through six layers. Internet Court is the open skill that connects them."
            />
          }
          footer={
            <p className="mt-8 px-4 text-center text-sm italic text-muted-foreground">
              The agentic commerce stack, where Internet Court sits across the
              layers.
            </p>
          }
        />
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

      {/* Section 4 - Founding partners (logo wall) */}
      <section id="founding-partners" className="py-16 md:py-24 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto px-4">
          <SectionHeading
            eyebrow="Founding Partners"
            title={
              <>
                Building the <Accent variant="light">trust layer</Accent> together.
              </>
            }
            subhead="The protocols, platforms and standards bringing agentic commerce into a single open skill."
          />
          <div className="mt-12 md:mt-16">
            <PartnerGrid />
          </div>
        </div>
      </section>

      {/* Section 5 - CTA band */}
      <section className="py-16 md:py-24 bg-white">
        <CTABand title="The trust layer for agent-to-agent commerce.">
          <SkillCommand />
        </CTABand>
      </section>
    </>
  );
}
