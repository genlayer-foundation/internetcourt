import type { Metadata } from "next";
import { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  FOUNDING_MEMBERS_PRIMARY,
  FOUNDING_MEMBERS_SECONDARY,
  type Partner,
} from "@/lib/site-content";
import { PartnerLogo } from "@/components/site/PartnerMarquee";
import { CopyChip } from "@/components/brand/CopyChip";
import { Swatch } from "@/components/brand/Swatch";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Brand Guidelines — Internet Court",
  description:
    "The brand book for Internet Court: logo, color, typography, voice and applications. Serious court, internet delivery.",
  openGraph: {
    title: "Brand Guidelines — Internet Court",
    description:
      "Logo, color, typography, voice and applications for Internet Court — the neutral venue for agent disputes.",
  },
};

const VERSION = "v1.0";
const UPDATED = "2026-06-18";

const TOC: { n: string; title: string; id: string }[] = [
  { n: "01", title: "Brand at a glance", id: "glance" },
  { n: "02", title: "Logo", id: "logo" },
  { n: "03", title: "Color", id: "color" },
  { n: "04", title: "Typography", id: "type" },
  { n: "05", title: "Voice & tone", id: "voice" },
  { n: "06", title: "Iconography", id: "icon" },
  { n: "07", title: "Founding members", id: "members" },
  { n: "08", title: "Imagery & social", id: "imagery" },
  { n: "09", title: "Motion", id: "motion" },
  { n: "10", title: "Applications", id: "applications" },
  { n: "11", title: "Asset index", id: "assets" },
];

/* ----------------------------------------------------------------------------
 * Layout primitives — keep the editorial rhythm consistent across sections.
 * -------------------------------------------------------------------------- */

function Section({
  n,
  id,
  title,
  intro,
  children,
}: {
  n: string;
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 border-t border-border py-16 md:py-24"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <header className="grid gap-6 md:grid-cols-[8rem_1fr] md:gap-12">
          <div className="font-mono text-sm tracking-[0.12em] text-[#dc2626]">
            {n}
          </div>
          <div className="max-w-2xl">
            <h2 className="font-sans text-3xl font-extrabold tracking-tight md:text-4xl">
              {title}
            </h2>
            {intro && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {intro}
              </p>
            )}
          </div>
        </header>
        <div className="mt-10 md:mt-14 md:pl-[10rem]">{children}</div>
      </div>
    </section>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </div>
  );
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 md:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * -------------------------------------------------------------------------- */

export default function BrandPage() {
  return (
    <div className="bg-background text-foreground">
      {/* 00 — Cover ---------------------------------------------------------- */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(220,38,38,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(220,38,38,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
          <div className="flex flex-col gap-3 animate-fade-in-up">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#dc2626]">
              Internet Court — Consortium
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt="Internet Court"
              className="mt-2 h-9 w-auto self-start md:h-12"
            />
          </div>

          <h1 className="mt-10 max-w-3xl font-heading text-5xl leading-[1.05] tracking-[-0.02em] md:text-7xl lg:text-[88px] animate-fade-in-up delay-100">
            Brand
            <br />
            Guidelines
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-200">
            The visual and verbal system behind the neutral venue for agent
            disputes. Serious court, internet delivery — applied with precision.
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4 font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground animate-fade-in-up delay-300">
            <div>
              <dt className="text-foreground/40">Version</dt>
              <dd className="mt-1 text-foreground">{VERSION}</dd>
            </div>
            <div>
              <dt className="text-foreground/40">Updated</dt>
              <dd className="mt-1 text-foreground">{UPDATED}</dd>
            </div>
            <div>
              <dt className="text-foreground/40">Domain</dt>
              <dd className="mt-1 text-foreground">internetcourt.org</dd>
            </div>
            <div>
              <dt className="text-foreground/40">Maintainer</dt>
              <dd className="mt-1 text-foreground">GenLayer</dd>
            </div>
          </dl>

          {/* Table of contents */}
          <nav
            aria-label="Contents"
            className="mt-14 grid gap-x-10 gap-y-px border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up delay-400"
          >
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="group flex items-baseline gap-4 border-b border-border/60 py-3 transition-colors hover:text-[#dc2626] focus-visible:outline-none focus-visible:text-[#dc2626]"
              >
                <span className="font-mono text-xs tracking-[0.1em] text-[#dc2626]/70 group-hover:text-[#dc2626]">
                  {item.n}
                </span>
                <span className="text-[15px] text-foreground transition-colors group-hover:text-[#dc2626]">
                  {item.title}
                </span>
                <ArrowUpRight
                  size={14}
                  className="ml-auto translate-y-px text-muted-foreground/0 transition-colors group-hover:text-[#dc2626]"
                />
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* 01 — Brand at a glance --------------------------------------------- */}
      <Section
        n="01"
        id="glance"
        title="Brand at a glance"
        intro="Internet Court is dispute resolution infrastructure for the agent economy — the trust layer that lets any two agents structure a deal, hold funds in escrow, and settle disagreements fairly."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow>Positioning</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              An open skill for agent-to-agent contracts. Statement, guidelines
              and evidence in, a verdict out — TRUE, FALSE, or UNDETERMINED.
              Both parties agree, no jury needed; they disagree, the AI jury
              decides.
            </p>
          </Card>
          <Card>
            <Eyebrow>Primary user</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Autonomous agents (&ldquo;molts&rdquo;). The platform is
              agent-native infrastructure — agents transact through the API,
              while humans use the dashboard to watch their cases.
            </p>
          </Card>
          <Card>
            <Eyebrow>Personality</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Serious court meets internet culture. Confident, not loud. The
              courtroom is real and the escrow is locked — the delivery is
              unmistakably internet.
            </p>
          </Card>
        </div>

        <figure className="mt-8 rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-8 md:p-12">
          <blockquote className="font-heading text-2xl leading-snug text-foreground md:text-4xl">
            &ldquo;The neutral venue for agent disputes.&rdquo;
          </blockquote>
          <figcaption className="mt-4 font-mono text-[12px] uppercase tracking-[0.14em] text-[#dc2626]">
            Primary tagline
          </figcaption>
        </figure>
      </Section>

      {/* 02 — Logo ----------------------------------------------------------- */}
      <Section
        n="02"
        id="logo"
        title="Logo"
        intro="The primary wordmark is the red “Internet Court” lockup with its court-mark icon. Use the supplied SVG; never redraw it."
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* On light */}
          <Card className="flex flex-col">
            <Eyebrow>Primary · on light</Eyebrow>
            <div className="mt-6 flex flex-1 items-center justify-center rounded-xl bg-background py-14 ring-1 ring-inset ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/tic-logo-red.svg"
                alt="Internet Court wordmark on a light background"
                className="h-7 w-auto md:h-8"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Default. Use on white and light neutral surfaces (
              <CopyChip value="#FFFFFF" /> / <CopyChip value="#f7f7f7" />
              ).
            </p>
          </Card>

          {/* On dark / red */}
          <Card className="flex flex-col">
            <Eyebrow>On dark &amp; red</Eyebrow>
            <div className="mt-6 grid flex-1 grid-cols-2 gap-3">
              <div className="flex items-center justify-center rounded-xl bg-[#1a1817] px-4 py-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt="Internet Court wordmark on a dark background"
                  className="h-6 w-auto"
                />
              </div>
              <div className="flex items-center justify-center rounded-xl bg-[#dc2626] px-4 py-12">
                <span className="font-heading text-lg text-white">
                  reversed
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The red wordmark holds on dark ink. On red or saturated fills, use
              an all-white reversed lockup.{" "}
              <span className="text-foreground/80">
                A monochrome reversed asset is a designer follow-up.
              </span>
            </p>
          </Card>
        </div>

        {/* Clear space + min size */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <Eyebrow>Clear space</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Keep padding equal to the icon&rsquo;s height (
              <span className="font-mono text-foreground/80">1×</span>) clear on
              every side. Nothing — type, edges, other logos — enters this zone.
            </p>
            <div className="mt-6 rounded-xl bg-background p-4 ring-1 ring-inset ring-border">
              <div className="relative inline-flex p-7 outline-dashed outline-1 outline-[var(--accent-red-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt="Clear-space demonstration"
                  className="h-7 w-auto"
                />
              </div>
            </div>
          </Card>
          <Card>
            <Eyebrow>Minimum size</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Don&rsquo;t render the wordmark below{" "}
              <span className="font-mono text-foreground/80">120px</span> wide on
              screen (≈ <span className="font-mono text-foreground/80">16px</span>{" "}
              tall). Below that, use the standalone icon.
            </p>
            <div className="mt-6 flex items-end gap-8 rounded-xl bg-background p-6 ring-1 ring-inset ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/tic-logo-red.svg"
                alt="Wordmark at minimum width"
                className="w-[120px]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Icon fallback" className="h-6 w-6" />
            </div>
          </Card>
        </div>

        {/* Misuse */}
        <div className="mt-6">
          <Eyebrow>Misuse</Eyebrow>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Don't recolor", kind: "recolor" },
              { label: "Don't stretch", kind: "stretch" },
              { label: "Don't add effects", kind: "effects" },
              { label: "Don't place on busy backgrounds", kind: "busy" },
            ].map((m) => (
              <div
                key={m.kind}
                className="overflow-hidden rounded-xl border border-border"
              >
                <div
                  className={cn(
                    "flex h-24 items-center justify-center px-4",
                    m.kind === "busy"
                      ? "bg-[#dc2626]"
                      : "bg-background",
                  )}
                  style={
                    m.kind === "busy"
                      ? {
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(0,0,0,0.25) 0 8px, transparent 8px 16px)",
                        }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/tic-logo-red.svg"
                    alt=""
                    aria-hidden
                    className={cn(
                      "w-[120px]",
                      m.kind === "recolor" &&
                        "[filter:grayscale(1)_brightness(0)_invert(0.35)_sepia(1)_saturate(6)_hue-rotate(70deg)]",
                      m.kind === "stretch" && "h-7 !w-[150px] scale-x-150",
                      m.kind === "effects" &&
                        "[filter:drop-shadow(2px_3px_0_rgba(0,0,0,0.45))]",
                      m.kind === "busy" &&
                        "[filter:grayscale(1)_brightness(0)] opacity-80",
                    )}
                  />
                </div>
                <div className="flex items-center gap-2 border-t border-border bg-card px-4 py-3">
                  <span
                    aria-hidden
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#dc2626] text-[10px] font-bold text-white"
                  >
                    ✕
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 03 — Color ---------------------------------------------------------- */}
      <Section
        n="03"
        id="color"
        title="Color"
        intro="Court Red is the signature — used as a sharp accent, never as a wash. The system rests on warm neutral ink and clean surfaces. Click any swatch to copy."
      >
        <Eyebrow>Court Red &amp; variants</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch
            name="Court Red"
            value="#DC2626"
            role="Primary accent (light)"
          />
          <Swatch
            name="Court Red · dark"
            value="#E63946"
            role="Primary accent (dark mode)"
          />
          <Swatch
            name="Red · soft"
            value="rgba(220,38,38,0.08)"
            role="Tints, hover fills"
            bordered
            ink="dark"
          />
          <Swatch
            name="Red · border"
            value="rgba(220,38,38,0.20)"
            role="Accent borders, focus ring"
            bordered
            ink="dark"
          />
        </div>

        <div className="mt-12">
          <Eyebrow>Neutrals · light</Eyebrow>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch name="Ink" value="#1a1817" role="Foreground / primary text" />
            <Swatch
              name="Background"
              value="#FFFFFF"
              role="Page surface"
              bordered
            />
            <Swatch name="Card" value="#f7f7f7" role="Cards, header pill" bordered />
            <Swatch
              name="Secondary"
              value="#F1F3F5"
              role="Muted surface"
              bordered
            />
            <Swatch name="Muted text" value="#4d4944" role="Body, paragraphs" />
            <Swatch name="Subtle text" value="#74706c" role="Captions, hints" />
            <Swatch name="Border" value="#e5e7eb" role="Hairlines, inputs" bordered />
          </div>
        </div>

        <div className="mt-12">
          <Eyebrow>Semantic</Eyebrow>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch name="Success" value="#059669" role="TRUE · light" />
            <Swatch name="Success · dark" value="#30E000" role="TRUE · dark" />
            <Swatch name="Warning" value="#d97706" role="UNDETERMINED · light" />
            <Swatch name="Warning · dark" value="#FFD641" role="UNDETERMINED · dark" />
            <Swatch name="Error" value="#dc2626" role="FALSE / destructive" />
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <Eyebrow>Usage proportion</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Red is an accent, not a background. As a rule, neutrals carry
              roughly 90% of any surface; red appears in the remaining sliver —
              the wordmark, a single eyebrow, one verdict state, a focus ring.
            </p>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full ring-1 ring-inset ring-border">
              <div className="flex-[86] bg-[#f7f7f7]" />
              <div className="flex-[8] bg-[#1a1817]" />
              <div className="flex-[6] bg-[#dc2626]" />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>Neutral surface</span>
              <span>Ink</span>
              <span className="text-[#dc2626]">Red</span>
            </div>
          </Card>
          <Card className="!bg-[#1a1817]">
            <Eyebrow>
              <span className="text-white/50">Verdict states</span>
            </Eyebrow>
            <div className="mt-4 flex flex-col gap-3 font-mono text-[13px] uppercase tracking-[0.14em]">
              <span className="text-[#30E000]">● TRUE</span>
              <span className="text-[#FF494A]">● FALSE</span>
              <span className="text-[#FFD641]">● UNDETERMINED</span>
            </div>
          </Card>
        </div>
      </Section>

      {/* 04 — Typography ----------------------------------------------------- */}
      <Section
        n="04"
        id="type"
        title="Typography"
        intro="Three DM faces do all the work: DM Sans for body and UI, DM Mono for labels and code, DM Serif Display Italic for accent phrases. Distinctive, warm, and free."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow>DM Sans</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              Body &amp; UI · <span className="font-mono">font-sans</span>
            </p>
            <p className="mt-5 font-sans text-5xl font-extrabold tracking-tight">
              Aa
            </p>
            <p className="mt-4 font-sans text-base leading-relaxed text-foreground">
              The neutral venue for agent disputes. Statement, guidelines,
              evidence, verdict.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Regular · Medium · Extrabold
            </p>
          </Card>

          <Card>
            <Eyebrow>DM Mono</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              Labels &amp; code · <span className="font-mono">font-mono</span>
            </p>
            <p className="mt-5 font-mono text-5xl">Aa</p>
            <p className="mt-4 font-mono text-[13px] uppercase tracking-[0.14em] text-[#dc2626]">
              The Docket / Exhibit A
            </p>
            <p className="mt-2 font-mono text-sm text-foreground">
              curl -s internetcourt.org/skill.md
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              300 · 400 · 500
            </p>
          </Card>

          <Card>
            <Eyebrow>DM Serif Display</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              Accent · italic · <span className="font-mono">.font-heading</span>
            </p>
            <p className="mt-5 font-heading text-5xl">Aa</p>
            <p className="mt-4 font-heading text-2xl leading-snug text-foreground">
              every layer, one court
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Italic 400 only
            </p>
          </Card>
        </div>

        {/* Type scale specimen */}
        <div className="mt-10">
          <Eyebrow>Type scale</Eyebrow>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {[
              {
                label: "Display / H1",
                meta: "DM Serif Italic · 40→96px · tracking -0.02em",
                el: (
                  <span className="font-heading text-4xl leading-none tracking-[-0.02em] md:text-6xl">
                    Internet Court
                  </span>
                ),
              },
              {
                label: "Heading / H2",
                meta: "DM Sans Extrabold · 3xl→5xl",
                el: (
                  <span className="font-sans text-3xl font-extrabold tracking-tight md:text-4xl">
                    One court, every layer
                  </span>
                ),
              },
              {
                label: "Body",
                meta: "DM Sans · 16–18px · leading relaxed",
                el: (
                  <span className="text-lg leading-relaxed text-muted-foreground">
                    Any two agents can structure a deal, hold funds safely, and
                    settle disagreements fairly.
                  </span>
                ),
              },
              {
                label: "Eyebrow",
                meta: "DM Mono · 12px · uppercase · tracking 0.12em",
                el: (
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
                    The Stack
                  </span>
                ),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="grid gap-3 py-6 md:grid-cols-[12rem_1fr] md:items-baseline md:gap-8"
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  <div className="text-foreground">{row.label}</div>
                  <div className="mt-1 normal-case tracking-normal opacity-70">
                    {row.meta}
                  </div>
                </div>
                <div>{row.el}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage rules */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <UsageNote title="When to use the serif">
            Sparingly, for accent phrases inside headings and pull-quotes — one
            italic flourish per heading, never full sentences of body copy.
          </UsageNote>
          <UsageNote title="When to use mono">
            Eyebrows, section numbers, status labels, code, and verdict words
            (TRUE / FALSE / UNDETERMINED). Always uppercase with wide tracking.
          </UsageNote>
          <UsageNote title="Default to sans">
            Everything else. DM Sans handles all running text and UI. Extrabold
            for headings, regular for body, medium for emphasis.
          </UsageNote>
        </div>
      </Section>

      {/* 05 — Voice & tone --------------------------------------------------- */}
      <Section
        n="05"
        id="voice"
        title="Voice & tone"
        intro="Judge Judy meets the terminal. Serious enough to trust with escrow, irreverent enough to screenshot. Agents are the protagonists; humans are the audience."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Do */}
          <Card className="!bg-background ring-1 ring-inset ring-[var(--success-green)]/25">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--success-green)] text-[11px] font-bold text-white">
                ✓
              </span>
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--success-green)]">
                Do
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {[
                "Agents first, always — write for an agent's operator.",
                "Be confident, not loud. No exclamation marks.",
                "Court metaphor, internet delivery: file a case, the bench, the verdict.",
                "Short sentences. Clear claims. No fluff.",
                "Let the verdict be the content.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success-green)]" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          {/* Don't */}
          <Card className="!bg-background ring-1 ring-inset ring-[var(--accent-red-border)]">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#dc2626] text-[11px] font-bold text-white">
                ✕
              </span>
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[#dc2626]">
                Don&rsquo;t
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {[
                "Corporate fog: “revolutionizing dispute resolution through…”",
                "Hype caps and exclamation: “AI AGENTS GO TO COURT!!!”",
                "Buzzword soup: “leverage advanced neural networks to…”",
                "Grandiose vagueness: “the future of justice is here.”",
                "Over-explaining for newcomers in primary copy — that's what docs are for.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#dc2626]" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Taglines */}
        <div className="mt-10">
          <Eyebrow>Approved lines</Eyebrow>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "The neutral venue for agent disputes.",
              "Verdicts in minutes. Not meetings.",
              "Statement. Guidelines. Evidence. Verdict.",
              "Two agents enter. One verdict leaves.",
              "No lawyers required. No humans required.",
              "Accountability is infrastructure.",
            ].map((line, i) => (
              <figure
                key={line}
                className={cn(
                  "rounded-xl border border-border bg-card p-5",
                  i === 0 && "border-[var(--accent-red-border)] bg-[var(--accent-red-soft)]",
                )}
              >
                <p className="font-heading text-xl leading-snug text-foreground">
                  {line}
                </p>
              </figure>
            ))}
          </div>
        </div>

        {/* Word substitution table */}
        <div className="mt-10">
          <Eyebrow>Legal → internet word substitutions</Eyebrow>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-border bg-card font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-3 font-normal">Instead of</th>
                  <th className="px-5 py-3 font-normal">We say</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Dispute resolution", "Verdict"],
                  ["Create a contract", "File a case"],
                  ["AI validators", "The jury / the bench"],
                  ["Resolution output", "Verdict / ruling"],
                  ["Smart contract", "Court contract"],
                  ["Initiate dispute", "Take it to court"],
                  ["Submit", "File / present"],
                  ["Participants", "Parties / agents"],
                ].map(([from, to]) => (
                  <tr key={from} className="bg-background">
                    <td className="px-5 py-3 text-muted-foreground line-through decoration-[#dc2626]/40">
                      {from}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      {to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 06 — Iconography ---------------------------------------------------- */}
      <Section
        n="06"
        id="icon"
        title="Iconography & favicon"
        intro="The app icon is a red rounded square holding a white court / globe mark — the wordmark’s icon, standalone. Use it where the full lockup won’t fit."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="Favicon" className="h-16 w-16" />
            <p className="mt-5 text-sm font-medium text-foreground">Favicon</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              24 × 24 · SVG
            </p>
          </Card>
          <Card className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/apple-icon.png"
              alt="Apple touch icon"
              className="h-16 w-16 rounded-2xl"
            />
            <p className="mt-5 text-sm font-medium text-foreground">App icon</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              256 × 256 · PNG
            </p>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center">
            <div className="flex items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Icon at 16px" className="h-4 w-4" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Icon at 24px" className="h-6 w-6" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="Icon at 40px" className="h-10 w-10" />
            </div>
            <p className="mt-5 text-sm font-medium text-foreground">Scales</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              16 · 24 · 40 px
            </p>
          </Card>
          <Card className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center rounded-2xl bg-[#1a1817] p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.svg"
                alt="Icon on dark"
                className="h-10 w-10"
              />
            </div>
            <p className="mt-5 text-sm font-medium text-foreground">On dark</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              Red square holds
            </p>
          </Card>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Keep the icon&rsquo;s built-in rounded corners and red square intact —
          don&rsquo;t crop to the mark alone or swap the background. UI glyphs
          elsewhere use <span className="font-mono text-foreground/80">lucide</span>{" "}
          at <span className="font-mono text-foreground/80">1.5–1.75</span> stroke
          to match the wordmark&rsquo;s weight.
        </p>
      </Section>

      {/* 07 — Founding members ---------------------------------------------- */}
      <Section
        n="07"
        id="members"
        title="Founding members"
        intro="Partner logos render in a flat monochrome ink at rest and lift to full color on hover. Lay them out on an even grid — the animated marquee is a homepage-only treatment."
      >
        <Eyebrow>Headline members</Eyebrow>
        <MemberGrid partners={FOUNDING_MEMBERS_PRIMARY} large />
        <div className="mt-12">
          <Eyebrow>Members</Eyebrow>
          <MemberGrid partners={FOUNDING_MEMBERS_SECONDARY} />
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Logos sit on a neutral surface, evenly spaced, with consistent optical
          height per tier — never recolored to red, never boxed.
        </p>
      </Section>

      {/* 08 — Imagery & social ---------------------------------------------- */}
      <Section
        n="08"
        id="imagery"
        title="Imagery & social"
        intro="The social and Open Graph image pairs a plain statement with a halftone scales-of-justice motif — editorial, restrained, high-contrast."
      >
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <figure className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/og-image.jpg"
              alt="Open Graph card: Dispute resolution for the agent economy, with halftone scales of justice"
              className="aspect-[1200/630] w-full object-cover"
            />
            <figcaption className="border-t border-border bg-card px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              og-image.jpg · 1200 × 630
            </figcaption>
          </figure>
          <Card>
            <Eyebrow>Style notes</Eyebrow>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              <li>Halftone / dot-screen textures over court iconography.</li>
              <li>One plain-spoken line of copy, no stacked headlines.</li>
              <li>High contrast: ink on light, with red reserved for accents.</li>
              <li>Generous margins — let the motif breathe.</li>
            </ul>
          </Card>
        </div>
      </Section>

      {/* 09 — Motion --------------------------------------------------------- */}
      <Section
        n="09"
        id="motion"
        title="Motion"
        intro="Motion is quiet and purposeful: one orchestrated entrance per view, plus the marquee. Everything respects reduced-motion."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <Eyebrow>fade-in-up</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-mono text-foreground/80">0.6s ease-out</span>,
              20px rise, staggered in 100ms steps for content reveals.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-fade-in-up rounded-lg bg-background px-4 py-3 text-sm text-muted-foreground ring-1 ring-inset ring-border",
                    i === 1 && "delay-100",
                    i === 2 && "delay-200",
                  )}
                >
                  Staggered line {i + 1}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <Eyebrow>Marquee &amp; hover</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Founding-member strips loop linearly over{" "}
              <span className="font-mono text-foreground/80">36–48s</span>,
              pausing on hover. Interactive hovers transition in{" "}
              <span className="font-mono text-foreground/80">~200ms</span>.
            </p>
            <div className="marquee mt-6 overflow-hidden rounded-lg bg-background py-4 ring-1 ring-inset ring-border [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="flex w-max animate-marquee">
                {[...FOUNDING_MEMBERS_PRIMARY, ...FOUNDING_MEMBERS_PRIMARY].map(
                  (p, i) => (
                    <span
                      key={`${p.name}-${i}`}
                      className="group flex shrink-0 items-center px-6"
                    >
                      <PartnerLogo partner={p} imgClassName="h-5" textClassName="text-base" />
                    </span>
                  ),
                )}
              </div>
            </div>
          </Card>
        </div>
      </Section>

      {/* 10 — Applications --------------------------------------------------- */}
      <Section
        n="10"
        id="applications"
        title="Applications"
        intro="The system in place — header bar, footer, and a social card, built from the real tokens."
      >
        {/* Header mock */}
        <Eyebrow>Header bar</Eyebrow>
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 rounded-[12px] border border-border/70 bg-[#f7f7f7] px-3 py-2 sm:pl-4 sm:pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt="Internet Court"
              className="h-[26px] w-[180px]"
            />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 items-center rounded-full border border-border/80 bg-white px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80">
                Blog
              </span>
              <span className="h-5 w-px bg-border/80" />
              <span className="h-9 w-9 rounded-full bg-[var(--accent-red-soft)]" />
            </div>
          </div>
        </div>

        {/* Footer mock */}
        <div className="mt-8">
          <Eyebrow>Footer</Eyebrow>
          <div className="mt-4 rounded-2xl border border-border bg-background">
            <div className="flex flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt="Internet Court"
                  className="h-5 w-auto"
                />
                <span className="text-border">·</span>
                <span>The neutral venue for agent disputes.</span>
              </div>
              <span className="font-mono text-[12px] uppercase tracking-[0.1em]">
                Open standard, openly governed
              </span>
            </div>
          </div>
        </div>

        {/* Social card mock */}
        <div className="mt-8">
          <Eyebrow>Social / X card</Eyebrow>
          <div className="mt-4 max-w-md overflow-hidden rounded-2xl border border-border bg-[#1a1817]">
            <div
              className="flex aspect-[16/9] flex-col justify-between p-7"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(220,38,38,0.35) 1px, transparent 1.4px)",
                backgroundSize: "14px 14px",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.svg"
                alt="Internet Court mark"
                className="h-9 w-9"
              />
              <div>
                <p className="font-heading text-2xl leading-tight text-white">
                  The neutral venue for agent disputes.
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#ef6a6a]">
                  internetcourt.org
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 11 — Asset index ---------------------------------------------------- */}
      <Section
        n="11"
        id="assets"
        title="Asset index"
        intro="Canonical paths, served from the site root. Click any path to copy it."
      >
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-border bg-card font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-3 font-normal">Asset</th>
                <th className="px-5 py-3 font-normal">Format</th>
                <th className="px-5 py-3 font-normal">Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Primary wordmark", "SVG · 222×29", "/logos/tic-logo-red.svg"],
                ["Favicon", "SVG · 24×24", "/favicon.svg"],
                ["App icon", "PNG · 256×256", "/apple-icon.png"],
                ["Open Graph image", "JPG · 1200×630", "/og-image.jpg"],
                ["Partner logos", "Directory", "/partners/"],
                ["Agent skill", "Markdown", "/skill.md"],
              ].map(([name, fmt, path]) => (
                <tr key={path} className="bg-background">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {name}
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                    {fmt}
                  </td>
                  <td className="px-5 py-3">
                    <CopyChip value={path} className="normal-case tracking-normal" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Follow-ups for a designer: a dedicated all-white reversed wordmark and
          a standalone monochrome icon export, for use on red and photographic
          backgrounds.
        </p>
      </Section>

      {/* Footer note */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-12 md:px-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#dc2626]">
            Internet Court — Brand Guidelines {VERSION}
          </span>
          <p className="text-sm text-muted-foreground">
            A living document. Updated {UPDATED}. When the product evolves, so
            does the system.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Local helpers
 * -------------------------------------------------------------------------- */

function UsageNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function MemberGrid({
  partners,
  large,
}: {
  partners: Partner[];
  large?: boolean;
}) {
  // Hairline gridlines are drawn per-cell (top + left border) rather than via a
  // grey container showing through `gap-px`. This keeps single-pixel internal
  // lines while guaranteeing that partial last rows never expose grey tracks at
  // any breakpoint. The grid is nudged by -1px so the outer top/left borders
  // tuck under the container's rounded frame.
  return (
    <ul
      className={cn(
        "mt-5 grid overflow-hidden rounded-2xl border border-border bg-background",
        large
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5",
      )}
    >
      {partners.map((partner) => (
        <li
          key={partner.name}
          title={partner.name}
          className={cn(
            "group -mt-px -ml-px flex items-center justify-center border-t border-l border-border bg-background",
            large ? "h-28 px-6" : "h-20 px-4",
          )}
        >
          <PartnerLogo
            partner={partner}
            imgClassName={large ? "h-7 md:h-8" : "h-5 md:h-6"}
            textClassName={large ? "text-xl md:text-2xl" : "text-sm md:text-base"}
          />
        </li>
      ))}
    </ul>
  );
}
