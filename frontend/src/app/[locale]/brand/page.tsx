import type { Metadata } from "next";
import { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
import { buildAlternates } from "@/lib/i18n-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand.metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: buildAlternates("/brand", locale),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

const VERSION = "v1.0";
const UPDATED = "2026-06-18";

// Section ids — the human-readable titles come from messages (brand.toc.items).
const TOC_IDS = [
  "glance",
  "logo",
  "color",
  "type",
  "voice",
  "icon",
  "members",
  "imagery",
  "motion",
  "applications",
  "assets",
] as const;

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

export default async function BrandPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brand");

  const voiceDo = t.raw("voice.do") as string[];
  const voiceDont = t.raw("voice.dont") as string[];
  const taglines = t.raw("voice.taglines") as string[];
  const substitutionRows = t.raw("voice.substitution.rows") as [
    string,
    string,
  ][];
  const styleNotes = t.raw("imagery.styleNotes") as string[];

  // Misuse demos: structural `kind` (drives the CSS treatment) merged with
  // localized labels by key.
  const misuse: { kind: string; label: string }[] = [
    { kind: "recolor", label: t("logo.misuse.recolor") },
    { kind: "stretch", label: t("logo.misuse.stretch") },
    { kind: "effects", label: t("logo.misuse.effects") },
    { kind: "busy", label: t("logo.misuse.busy") },
  ];

  // Asset index: paths/formats are content-as-data; only the name is localized.
  const assetRows: { name: string; fmt: string; path: string }[] = [
    { name: t("assets.rows.wordmark"), fmt: "SVG · 222×29", path: "/logos/tic-logo-red.svg" },
    { name: t("assets.rows.favicon"), fmt: "SVG · 24×24", path: "/favicon.svg" },
    { name: t("assets.rows.appIcon"), fmt: "PNG · 256×256", path: "/apple-icon.png" },
    { name: t("assets.rows.og"), fmt: "JPG · 1200×630", path: "/og-image.jpg" },
    { name: t("assets.rows.partners"), fmt: "Directory", path: "/partners/" },
    { name: t("assets.rows.skill"), fmt: "Markdown", path: "/skill.md" },
  ];

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
              {t("cover.eyebrow")}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt={t("cover.logoAlt")}
              className="mt-2 h-9 w-auto self-start md:h-12"
            />
          </div>

          <h1 className="mt-10 max-w-3xl font-heading text-5xl leading-[1.05] tracking-[-0.02em] md:text-7xl lg:text-[88px] animate-fade-in-up delay-100">
            {t("cover.title1")}
            <br />
            {t("cover.title2")}
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground animate-fade-in-up delay-200">
            {t("cover.lede")}
          </p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4 font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground animate-fade-in-up delay-300">
            <div>
              <dt className="text-foreground/40">{t("cover.version")}</dt>
              <dd className="mt-1 text-foreground">{VERSION}</dd>
            </div>
            <div>
              <dt className="text-foreground/40">{t("cover.updated")}</dt>
              <dd className="mt-1 text-foreground">{UPDATED}</dd>
            </div>
            <div>
              <dt className="text-foreground/40">{t("cover.domain")}</dt>
              <dd className="mt-1 text-foreground">internetcourt.org</dd>
            </div>
            <div>
              <dt className="text-foreground/40">{t("cover.maintainer")}</dt>
              <dd className="mt-1 text-foreground">GenLayer</dd>
            </div>
          </dl>

          {/* Table of contents */}
          <nav
            aria-label={t("toc.contentsLabel")}
            className="mt-14 grid gap-x-10 gap-y-px border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up delay-400"
          >
            {TOC_IDS.map((id, i) => (
              <a
                key={id}
                href={`#${id}`}
                className="group flex items-baseline gap-4 border-b border-border/60 py-3 transition-colors hover:text-[#dc2626] focus-visible:outline-none focus-visible:text-[#dc2626]"
              >
                <span className="font-mono text-xs tracking-[0.1em] text-[#dc2626]/70 group-hover:text-[#dc2626]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[15px] text-foreground transition-colors group-hover:text-[#dc2626]">
                  {t(`toc.items.${id}`)}
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
        title={t("glance.title")}
        intro={t("glance.intro")}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow>{t("glance.positioning.eyebrow")}</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t("glance.positioning.body")}
            </p>
          </Card>
          <Card>
            <Eyebrow>{t("glance.primaryUser.eyebrow")}</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t("glance.primaryUser.body")}
            </p>
          </Card>
          <Card>
            <Eyebrow>{t("glance.personality.eyebrow")}</Eyebrow>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {t("glance.personality.body")}
            </p>
          </Card>
        </div>

        <figure className="mt-8 rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] p-8 md:p-12">
          <blockquote className="font-heading text-2xl leading-snug text-foreground md:text-4xl">
            {t("glance.tagline")}
          </blockquote>
          <figcaption className="mt-4 font-mono text-[12px] uppercase tracking-[0.14em] text-[#dc2626]">
            {t("glance.taglineCaption")}
          </figcaption>
        </figure>
      </Section>

      {/* 02 — Logo ----------------------------------------------------------- */}
      <Section
        n="02"
        id="logo"
        title={t("logo.title")}
        intro={t("logo.intro")}
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* On light */}
          <Card className="flex flex-col">
            <Eyebrow>{t("logo.onLight.eyebrow")}</Eyebrow>
            <div className="mt-6 flex flex-1 items-center justify-center rounded-xl bg-background py-14 ring-1 ring-inset ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/tic-logo-red.svg"
                alt={t("logo.onLight.imgAlt")}
                className="h-7 w-auto md:h-8"
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t.rich("logo.onLight.note", {
                white: () => <CopyChip value="#FFFFFF" />,
                card: () => <CopyChip value="#f7f7f7" />,
              })}
            </p>
          </Card>

          {/* On dark / red */}
          <Card className="flex flex-col">
            <Eyebrow>{t("logo.onDark.eyebrow")}</Eyebrow>
            <div className="mt-6 grid flex-1 grid-cols-2 gap-3">
              <div className="flex items-center justify-center rounded-xl bg-[#1a1817] px-4 py-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt={t("logo.onDark.imgAltDark")}
                  className="h-6 w-auto"
                />
              </div>
              <div className="flex items-center justify-center rounded-xl bg-[#dc2626] px-4 py-12">
                <span className="font-heading text-lg text-white">
                  {t("logo.onDark.reversed")}
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("logo.onDark.note")}
              <span className="text-foreground/80">
                {t("logo.onDark.noteEmphasis")}
              </span>
            </p>
          </Card>
        </div>

        {/* Clear space + min size */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <Eyebrow>{t("logo.clearSpace.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t.rich("logo.clearSpace.note", {
                oneX: () => (
                  <span className="font-mono text-foreground/80">
                    {t("logo.clearSpace.oneX")}
                  </span>
                ),
              })}
            </p>
            <div className="mt-6 rounded-xl bg-background p-4 ring-1 ring-inset ring-border">
              <div className="relative inline-flex p-7 outline-dashed outline-1 outline-[var(--accent-red-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt={t("logo.clearSpace.imgAlt")}
                  className="h-7 w-auto"
                />
              </div>
            </div>
          </Card>
          <Card>
            <Eyebrow>{t("logo.minSize.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t.rich("logo.minSize.note", {
                minWidth: () => (
                  <span className="font-mono text-foreground/80">
                    {t("logo.minSize.minWidth")}
                  </span>
                ),
                minHeight: () => (
                  <span className="font-mono text-foreground/80">
                    {t("logo.minSize.minHeight")}
                  </span>
                ),
              })}
            </p>
            <div className="mt-6 flex items-end gap-8 rounded-xl bg-background p-6 ring-1 ring-inset ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/tic-logo-red.svg"
                alt={t("logo.minSize.imgAlt")}
                className="w-[120px]"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.svg"
                alt={t("logo.minSize.iconAlt")}
                className="h-6 w-6"
              />
            </div>
          </Card>
        </div>

        {/* Misuse */}
        <div className="mt-6">
          <Eyebrow>{t("logo.misuse.eyebrow")}</Eyebrow>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {misuse.map((m) => (
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
        title={t("color.title")}
        intro={t("color.intro")}
      >
        <Eyebrow>{t("color.courtRedGroup")}</Eyebrow>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch
            name={t("color.swatches.courtRed")}
            value="#DC2626"
            role={t("color.swatches.courtRedRole")}
          />
          <Swatch
            name={t("color.swatches.courtRedDark")}
            value="#E63946"
            role={t("color.swatches.courtRedDarkRole")}
          />
          <Swatch
            name={t("color.swatches.redSoft")}
            value="rgba(220,38,38,0.08)"
            role={t("color.swatches.redSoftRole")}
            bordered
            ink="dark"
          />
          <Swatch
            name={t("color.swatches.redBorder")}
            value="rgba(220,38,38,0.20)"
            role={t("color.swatches.redBorderRole")}
            bordered
            ink="dark"
          />
        </div>

        <div className="mt-12">
          <Eyebrow>{t("color.neutralsGroup")}</Eyebrow>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch
              name={t("color.swatches.ink")}
              value="#1a1817"
              role={t("color.swatches.inkRole")}
            />
            <Swatch
              name={t("color.swatches.background")}
              value="#FFFFFF"
              role={t("color.swatches.backgroundRole")}
              bordered
            />
            <Swatch
              name={t("color.swatches.card")}
              value="#f7f7f7"
              role={t("color.swatches.cardRole")}
              bordered
            />
            <Swatch
              name={t("color.swatches.secondary")}
              value="#F1F3F5"
              role={t("color.swatches.secondaryRole")}
              bordered
            />
            <Swatch
              name={t("color.swatches.mutedText")}
              value="#4d4944"
              role={t("color.swatches.mutedTextRole")}
            />
            <Swatch
              name={t("color.swatches.subtleText")}
              value="#74706c"
              role={t("color.swatches.subtleTextRole")}
            />
            <Swatch
              name={t("color.swatches.border")}
              value="#e5e7eb"
              role={t("color.swatches.borderRole")}
              bordered
            />
          </div>
        </div>

        <div className="mt-12">
          <Eyebrow>{t("color.semanticGroup")}</Eyebrow>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch
              name={t("color.swatches.success")}
              value="#059669"
              role={t("color.swatches.successRole")}
            />
            <Swatch
              name={t("color.swatches.successDark")}
              value="#30E000"
              role={t("color.swatches.successDarkRole")}
            />
            <Swatch
              name={t("color.swatches.warning")}
              value="#d97706"
              role={t("color.swatches.warningRole")}
            />
            <Swatch
              name={t("color.swatches.warningDark")}
              value="#FFD641"
              role={t("color.swatches.warningDarkRole")}
            />
            <Swatch
              name={t("color.swatches.error")}
              value="#dc2626"
              role={t("color.swatches.errorRole")}
            />
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <Eyebrow>{t("color.usage.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("color.usage.body")}
            </p>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full ring-1 ring-inset ring-border">
              <div className="flex-[86] bg-[#f7f7f7]" />
              <div className="flex-[8] bg-[#1a1817]" />
              <div className="flex-[6] bg-[#dc2626]" />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>{t("color.usage.neutralSurface")}</span>
              <span>{t("color.usage.ink")}</span>
              <span className="text-[#dc2626]">{t("color.usage.red")}</span>
            </div>
          </Card>
          <Card className="!bg-[#1a1817]">
            <Eyebrow>
              <span className="text-white/50">{t("color.verdict.eyebrow")}</span>
            </Eyebrow>
            <div className="mt-4 flex flex-col gap-3 font-mono text-[13px] uppercase tracking-[0.14em]">
              <span className="text-[#30E000]">{t("color.verdict.true")}</span>
              <span className="text-[#FF494A]">{t("color.verdict.false")}</span>
              <span className="text-[#FFD641]">
                {t("color.verdict.undetermined")}
              </span>
            </div>
          </Card>
        </div>
      </Section>

      {/* 04 — Typography ----------------------------------------------------- */}
      <Section
        n="04"
        id="type"
        title={t("type.title")}
        intro={t("type.intro")}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <Eyebrow>{t("type.sans.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("type.sans.use")}
              <span className="font-mono">font-sans</span>
            </p>
            <p className="mt-5 font-sans text-5xl font-extrabold tracking-tight">
              Aa
            </p>
            <p className="mt-4 font-sans text-base leading-relaxed text-foreground">
              {t("type.sans.specimen")}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("type.sans.weights")}
            </p>
          </Card>

          <Card>
            <Eyebrow>{t("type.mono.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("type.mono.use")}
              <span className="font-mono">font-mono</span>
            </p>
            <p className="mt-5 font-mono text-5xl">Aa</p>
            <p className="mt-4 font-mono text-[13px] uppercase tracking-[0.14em] text-[#dc2626]">
              {t("type.mono.label")}
            </p>
            <p className="mt-2 font-mono text-sm text-foreground">
              curl -s internetcourt.org/skill.md
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("type.mono.weights")}
            </p>
          </Card>

          <Card>
            <Eyebrow>{t("type.serif.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("type.serif.use")}
              <span className="font-mono">.font-heading</span>
            </p>
            <p className="mt-5 font-heading text-5xl">Aa</p>
            <p className="mt-4 font-heading text-2xl leading-snug text-foreground">
              {t("type.serif.specimen")}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("type.serif.weights")}
            </p>
          </Card>
        </div>

        {/* Type scale specimen */}
        <div className="mt-10">
          <Eyebrow>{t("type.scale.eyebrow")}</Eyebrow>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {[
              {
                label: t("type.scale.displayLabel"),
                meta: t("type.scale.displayMeta"),
                el: (
                  <span className="font-heading text-4xl leading-none tracking-[-0.02em] md:text-6xl">
                    {t("type.scale.displaySpecimen")}
                  </span>
                ),
              },
              {
                label: t("type.scale.headingLabel"),
                meta: t("type.scale.headingMeta"),
                el: (
                  <span className="font-sans text-3xl font-extrabold tracking-tight md:text-4xl">
                    {t("type.scale.headingSpecimen")}
                  </span>
                ),
              },
              {
                label: t("type.scale.bodyLabel"),
                meta: t("type.scale.bodyMeta"),
                el: (
                  <span className="text-lg leading-relaxed text-muted-foreground">
                    {t("type.scale.bodySpecimen")}
                  </span>
                ),
              },
              {
                label: t("type.scale.eyebrowLabel"),
                meta: t("type.scale.eyebrowMeta"),
                el: (
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
                    {t("type.scale.eyebrowSpecimen")}
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
          <UsageNote title={t("type.rules.serifTitle")}>
            {t("type.rules.serifBody")}
          </UsageNote>
          <UsageNote title={t("type.rules.monoTitle")}>
            {t("type.rules.monoBody")}
          </UsageNote>
          <UsageNote title={t("type.rules.sansTitle")}>
            {t("type.rules.sansBody")}
          </UsageNote>
        </div>
      </Section>

      {/* 05 — Voice & tone --------------------------------------------------- */}
      <Section
        n="05"
        id="voice"
        title={t("voice.title")}
        intro={t("voice.intro")}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Do */}
          <Card className="!bg-background ring-1 ring-inset ring-[var(--success-green)]/25">
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--success-green)] text-[11px] font-bold text-white">
                ✓
              </span>
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--success-green)]">
                {t("voice.doLabel")}
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {voiceDo.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success-green)]" />
                  {line}
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
                {t("voice.dontLabel")}
              </span>
            </div>
            <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {voiceDont.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#dc2626]" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Taglines */}
        <div className="mt-10">
          <Eyebrow>{t("voice.approvedLinesLabel")}</Eyebrow>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {taglines.map((line, i) => (
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
          <Eyebrow>{t("voice.substitution.label")}</Eyebrow>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-border bg-card font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-5 py-3 font-normal">
                    {t("voice.substitution.insteadOf")}
                  </th>
                  <th className="px-5 py-3 font-normal">
                    {t("voice.substitution.weSay")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {substitutionRows.map(([from, to]) => (
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
        title={t("icon.title")}
        intro={t("icon.intro")}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt={t("icon.faviconAlt")} className="h-16 w-16" />
            <p className="mt-5 text-sm font-medium text-foreground">
              {t("icon.faviconName")}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("icon.faviconMeta")}
            </p>
          </Card>
          <Card className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/apple-icon.png"
              alt={t("icon.appIconAlt")}
              className="h-16 w-16 rounded-2xl"
            />
            <p className="mt-5 text-sm font-medium text-foreground">
              {t("icon.appIconName")}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("icon.appIconMeta")}
            </p>
          </Card>
          <Card className="flex flex-col items-center justify-center text-center">
            <div className="flex items-end gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt={t("icon.scaleAlt16")} className="h-4 w-4" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt={t("icon.scaleAlt24")} className="h-6 w-6" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt={t("icon.scaleAlt40")} className="h-10 w-10" />
            </div>
            <p className="mt-5 text-sm font-medium text-foreground">
              {t("icon.scalesName")}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("icon.scalesMeta")}
            </p>
          </Card>
          <Card className="flex flex-col items-center text-center">
            <div className="flex items-center justify-center rounded-2xl bg-[#1a1817] p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon.svg"
                alt={t("icon.onDarkAlt")}
                className="h-10 w-10"
              />
            </div>
            <p className="mt-5 text-sm font-medium text-foreground">
              {t("icon.onDarkName")}
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("icon.onDarkMeta")}
            </p>
          </Card>
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t.rich("icon.note", {
            lucide: () => (
              <span className="font-mono text-foreground/80">
                {t("icon.lucide")}
              </span>
            ),
            stroke: () => (
              <span className="font-mono text-foreground/80">
                {t("icon.stroke")}
              </span>
            ),
          })}
        </p>
      </Section>

      {/* 07 — Founding members ---------------------------------------------- */}
      <Section
        n="07"
        id="members"
        title={t("members.title")}
        intro={t("members.intro")}
      >
        <Eyebrow>{t("members.headline")}</Eyebrow>
        <MemberGrid partners={FOUNDING_MEMBERS_PRIMARY} large />
        <div className="mt-12">
          <Eyebrow>{t("members.members")}</Eyebrow>
          <MemberGrid partners={FOUNDING_MEMBERS_SECONDARY} />
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          {t("members.note")}
        </p>
      </Section>

      {/* 08 — Imagery & social ---------------------------------------------- */}
      <Section
        n="08"
        id="imagery"
        title={t("imagery.title")}
        intro={t("imagery.intro")}
      >
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <figure className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/og-image.jpg"
              alt={t("imagery.ogAlt")}
              className="aspect-[1200/630] w-full object-cover"
            />
            <figcaption className="border-t border-border bg-card px-5 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              {t("imagery.ogCaption")}
            </figcaption>
          </figure>
          <Card>
            <Eyebrow>{t("imagery.styleNotesLabel")}</Eyebrow>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {styleNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      {/* 09 — Motion --------------------------------------------------------- */}
      <Section
        n="09"
        id="motion"
        title={t("motion.title")}
        intro={t("motion.intro")}
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <Eyebrow>{t("motion.fade.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t.rich("motion.fade.note", {
                duration: () => (
                  <span className="font-mono text-foreground/80">
                    {t("motion.fade.duration")}
                  </span>
                ),
              })}
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
                  {t("motion.fade.staggeredLine", { n: i + 1 })}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <Eyebrow>{t("motion.marquee.eyebrow")}</Eyebrow>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t.rich("motion.marquee.note", {
                loop: () => (
                  <span className="font-mono text-foreground/80">
                    {t("motion.marquee.loop")}
                  </span>
                ),
                hover: () => (
                  <span className="font-mono text-foreground/80">
                    {t("motion.marquee.hover")}
                  </span>
                ),
              })}
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
        title={t("applications.title")}
        intro={t("applications.intro")}
      >
        {/* Header mock */}
        <Eyebrow>{t("applications.headerBar")}</Eyebrow>
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 rounded-[12px] border border-border/70 bg-[#f7f7f7] px-3 py-2 sm:pl-4 sm:pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt={t("applications.logoAlt")}
              className="h-[26px] w-[180px]"
            />
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 items-center rounded-full border border-border/80 bg-white px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80">
                {t("applications.blog")}
              </span>
              <span className="h-5 w-px bg-border/80" />
              <span className="h-9 w-9 rounded-full bg-[var(--accent-red-soft)]" />
            </div>
          </div>
        </div>

        {/* Footer mock */}
        <div className="mt-8">
          <Eyebrow>{t("applications.footer")}</Eyebrow>
          <div className="mt-4 rounded-2xl border border-border bg-background">
            <div className="flex flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/tic-logo-red.svg"
                  alt={t("applications.logoAlt")}
                  className="h-5 w-auto"
                />
                <span className="text-border">·</span>
                <span>{t("applications.footerTagline")}</span>
              </div>
              <span className="font-mono text-[12px] uppercase tracking-[0.1em]">
                {t("applications.footerGoverned")}
              </span>
            </div>
          </div>
        </div>

        {/* Social card mock */}
        <div className="mt-8">
          <Eyebrow>{t("applications.socialCard")}</Eyebrow>
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
                alt={t("applications.markAlt")}
                className="h-9 w-9"
              />
              <div>
                <p className="font-heading text-2xl leading-tight text-white">
                  {t("applications.socialLine")}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#ef6a6a]">
                  {t("applications.socialDomain")}
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
        title={t("assets.title")}
        intro={t("assets.intro")}
      >
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-border bg-card font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-5 py-3 font-normal">{t("assets.colAsset")}</th>
                <th className="px-5 py-3 font-normal">{t("assets.colFormat")}</th>
                <th className="px-5 py-3 font-normal">{t("assets.colPath")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assetRows.map(({ name, fmt, path }) => (
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
          {t("assets.note")}
        </p>
      </Section>

      {/* Footer note */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-12 md:px-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#dc2626]">
            {t("footerNote.label", { version: VERSION })}
          </span>
          <p className="text-sm text-muted-foreground">
            {t("footerNote.body", { updated: UPDATED })}
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
