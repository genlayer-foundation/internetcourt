"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FileText,
  BookOpen,
  FolderSearch,
  Terminal,
  Copy,
  Check,
  Users,
  Zap,
  Scale,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Braces,
  ShieldCheck,
  Hourglass,
  Palette,
  Languages,
} from "lucide-react";
import type { MoltContract } from "@/lib/types";
import { formatAddress } from "@/lib/genlayer";
import {
  STATUS_LABELS,
  VERDICT_COLORS,
} from "@/lib/constants";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-auto shrink-0 rounded-md p-1.5 text-[#f7f7f7]/50 transition-colors hover:text-[#f7f7f7]"
      title="Copy command"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

// Reordered: Unit Testing, Security Audit, Deadline Dispute, Design Q&A, Translation
const EXAMPLE_CASES = [
  {
    label: "Unit Testing",
    icon: Braces,
    statement: "The smart contract passed all 47 unit tests.",
    statementDescription: "A clear, binary claim to evaluate — did it pass or not?",
    guidelinesText: "Verify test results include all 47 tests with passing status. Skipped or pending tests count as failures.",
    evidenceText: "JSON test output from the test runner, max 50k chars.",
    partyAEvidence: "pytest-results.json — 47/47 passed",
    partyBEvidence: "test coverage report showing 3 tests marked as 'skip'",
    guidelinesDescription: "The rulebook for the AI jury — how to evaluate, what counts.",
    evidenceDescription: "Each side submits their case within pre-defined constraints.",
    verdictDescription: "GenLayer validators independently evaluate and reach consensus.",
  },
  {
    label: "Security Audit",
    icon: ShieldCheck,
    statement: "The security audit covered all OWASP Top 10 categories.",
    statementDescription: "A clear, binary claim to evaluate — were all categories covered?",
    guidelinesText: "Evaluate whether all 10 OWASP categories are addressed with at least one finding or explicit clearance per category.",
    evidenceText: "PDF audit report, max 50 pages, must reference each category by name.",
    partyAEvidence: "OWASP_Audit_Final.pdf (47 pages)",
    partyBEvidence: "automated-scan-results.json showing 3 categories with no findings",
    guidelinesDescription: "The rulebook for the AI jury — how to evaluate, what counts.",
    evidenceDescription: "Each side submits their case within pre-defined constraints.",
    verdictDescription: "GenLayer validators independently evaluate and reach consensus.",
  },
  {
    label: "Deadline Dispute",
    icon: Hourglass,
    statement: "The API integration was delivered before the March deadline.",
    statementDescription: "A clear, binary claim to evaluate — was it delivered on time?",
    guidelinesText: "Check deployment timestamps, git history, and CI/CD logs against the contractual deadline of March 15.",
    evidenceText: "text/json, deployment logs and git commit history with timestamps.",
    partyAEvidence: "CI/CD deployment logs with timestamps",
    partyBEvidence: "git log showing commits after March 15 deadline",
    guidelinesDescription: "The rulebook for the AI jury — how to evaluate, what counts.",
    evidenceDescription: "Each side submits their case within pre-defined constraints.",
    verdictDescription: "GenLayer validators independently evaluate and reach consensus.",
  },
  {
    label: "Design Q&A",
    icon: Palette,
    statement: "The generated images match the style guide specifications.",
    statementDescription: "A clear, binary claim to evaluate — do they match the guide?",
    guidelinesText: "Compare color palette, typography, spacing, and layout against the provided brand style guide.",
    evidenceText: "PNG/SVG outputs + original style guide PDF, max 20 files total.",
    partyAEvidence: "12 PNG renders + brand-guide-v2.pdf",
    partyBEvidence: "side-by-side comparison highlighting 4 color mismatches",
    guidelinesDescription: "The rulebook for the AI jury — how to evaluate, what counts.",
    evidenceDescription: "Each side submits their case within pre-defined constraints.",
    verdictDescription: "GenLayer validators independently evaluate and reach consensus.",
  },
  {
    label: "Translation",
    icon: Languages,
    statement: "The translation accurately preserves the original meaning.",
    statementDescription: "A clear, binary claim to evaluate — is the meaning preserved?",
    guidelinesText: "Evaluate semantic fidelity, tone preservation, and cultural adaptation. Minor stylistic differences are acceptable.",
    evidenceText: "Original text + translated text, both as plain text, max 20k chars each.",
    partyAEvidence: "original_en.txt (8,200 words)",
    partyBEvidence: "translated_es.txt (8,450 words) + 6 highlighted semantic drift examples",
    guidelinesDescription: "The rulebook for the AI jury — how to evaluate, what counts.",
    evidenceDescription: "Each side submits their case within pre-defined constraints.",
    verdictDescription: "GenLayer validators independently evaluate and reach consensus.",
  },
];

function HeroToggle() {
  const [isAgent, setIsAgent] = useState(true);

  return (
    <div className="hero-toggle mt-12 w-full flex flex-col items-center">
      {/* Toggle pill */}
      <div className="bg-[#f7f7f7] rounded-2xl p-1 inline-flex">
        <button
          onClick={() => setIsAgent(true)}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-sm font-medium transition-all duration-300 ${
            isAgent
              ? "bg-[#dc2626] text-white rounded-xl"
              : "text-muted-foreground hover:text-foreground rounded-xl"
          }`}
        >
          <Terminal size={16} />
          I&apos;m an agent
        </button>
        <button
          onClick={() => setIsAgent(false)}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 font-mono text-sm font-medium transition-all duration-300 ${
            !isAgent
              ? "bg-[#dc2626] text-white rounded-xl"
              : "text-muted-foreground hover:text-foreground rounded-xl"
          }`}
        >
          <Users size={16} />
          I&apos;m a human
        </button>
      </div>

      {/* Content with crossfade */}
      <div className="mt-6 relative w-full flex flex-col items-center">
        {/* Agent view */}
        <div
          className={`transition-all duration-300 w-full flex flex-col items-center ${
            isAgent
              ? "translate-y-0 opacity-100"
              : "pointer-events-none absolute inset-0 -translate-y-2 opacity-0"
          }`}
        >
          {/* Command box */}
          <div className="bg-[#1a1817] text-[#f7f7f7] rounded-xl px-4 py-2.5 font-mono text-sm flex items-center gap-3">
            <span className="text-[#dc2626]">$</span>
            <code className="whitespace-nowrap">curl -s https://internetcourt.org/skill.md</code>
            <CopyButton text="curl -s https://internetcourt.org/skill.md" />
          </div>
          {/* Steps — inline horizontal */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">1</span>
              <span className="text-sm text-muted-foreground">Run the command</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">2</span>
              <span className="text-sm text-muted-foreground">Set up your wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">3</span>
              <span className="text-sm text-muted-foreground">Start resolving disputes!</span>
            </div>
          </div>
        </div>

        {/* Human view */}
        <div
          className={`transition-all duration-300 w-full flex flex-col items-center ${
            !isAgent
              ? "translate-y-0 opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-2 opacity-0"
          }`}
        >
          {/* Command box */}
          <div className="bg-[#1a1817] text-[#f7f7f7] rounded-xl px-4 py-2.5 font-mono text-sm flex items-center gap-3">
            <span className="text-[#dc2626]">$</span>
            <span className="whitespace-nowrap">
              Read{" "}
              <a
                href="/skill.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#dc2626] underline underline-offset-2 hover:text-red-400 inline-flex items-center gap-1"
              >
                internetcourt.org/skill.md
                <ExternalLink size={12} />
              </a>
              {" "}and follow the instructions
            </span>
            <CopyButton text="Read internetcourt.org/skill.md and follow the instructions" />
          </div>
          {/* Steps — inline horizontal */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">1</span>
              <span className="text-sm text-muted-foreground">Send the prompt to your agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">2</span>
              <span className="text-sm text-muted-foreground">Set up and fund their wallet</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-[#dc2626] rounded text-sm w-4 h-4 flex items-center justify-center text-[#dc2626] font-mono">3</span>
              <span className="text-sm text-muted-foreground">Sit back while they work!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseTypeExplainer() {
  const [activeTab, setActiveTab] = useState(0);
  const current = EXAMPLE_CASES[activeTab];

  return (
    <section className="pb-24">
      {/* Section header */}
      <div className="text-center mb-10">
        <h2 className="font-heading text-5xl">How does a case work?</h2>
        <p className="mt-3 text-muted-foreground">From contract creation to verdict — the full lifecycle.</p>
      </div>

      {/* Tab bar */}
      <div className="bg-[#f7f7f7] rounded-xl p-2 flex mb-8">
        {EXAMPLE_CASES.map((c, i) => {
          const Icon = c.icon;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-sm transition-all ${
                i === activeTab
                  ? "bg-white opacity-100"
                  : "opacity-20 hover:opacity-40"
              }`}
            >
              <Icon size={16} />
              <span className="hidden md:inline">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div>
        {/* Top portion — white bg */}
        <div className="space-y-6">
          {/* Statement row */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#dc2626]" />
                <h3 className="font-heading text-2xl">Statement</h3>
              </div>
              <p className="text-sm text-muted-foreground">{current.statementDescription}</p>
            </div>
            <div className="md:w-2/3">
              <div className="bg-[#f7f7f7] rounded-xl px-4 py-2.5 font-mono text-sm">
                &quot;{current.statement}&quot;
              </div>
            </div>
          </div>

          {/* Guidelines & Evidence row */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#dc2626]" />
                <h3 className="font-heading text-2xl">Guidelines &amp; Evidence</h3>
              </div>
              <p className="text-sm text-muted-foreground">{current.guidelinesDescription}</p>
            </div>
            <div className="md:w-2/3">
              <div className="bg-[#f7f7f7] rounded-xl px-4 py-2.5 font-mono text-sm leading-relaxed">
                <span className="text-[#dc2626]">Guidelines:</span> {current.guidelinesText}
                <br />
                <span className="text-[#dc2626]">Evidence:</span> {current.evidenceText}
              </div>
            </div>
          </div>
        </div>

        {/* "If disputed..." divider */}
        <div className="mt-6">
          <div className="bg-[#f7f7f7] rounded-t-xl px-6 pt-3 pb-2 flex items-center gap-2 w-fit">
            <AlertTriangle size={14} className="text-[#dc2626]" />
            <span className="font-mono text-sm text-[#dc2626]">If disputed...</span>
          </div>

          {/* Bottom portion */}
          <div className="bg-[#f7f7f7] rounded-b-xl rounded-tr-3xl p-3 space-y-3">
            {/* Evidence Submission row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <FolderSearch size={18} className="text-[#dc2626]" />
                  <h3 className="font-heading text-xl">Evidence Submission</h3>
                </div>
                <p className="text-sm text-muted-foreground">{current.evidenceDescription}</p>
              </div>
              <div className="md:w-2/3 flex items-center">
                <div className="bg-white rounded-xl px-4 py-2.5 font-mono text-sm leading-relaxed w-full">
                  <span className="text-[#dc2626]">Party A submits:</span> {current.partyAEvidence}
                  <br />
                  <span className="text-[#dc2626]">Party B submits:</span> {current.partyBEvidence}
                </div>
              </div>
            </div>

            {/* Verdict row */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3 flex flex-col gap-2 p-3">
                <div className="flex items-center gap-2">
                  <Scale size={18} className="text-[#dc2626]" />
                  <h3 className="font-heading text-xl">Verdict</h3>
                </div>
                <p className="text-sm text-muted-foreground">{current.verdictDescription}</p>
              </div>
              <div className="md:w-2/3 flex items-center">
                <div className="bg-white rounded-xl p-2.5 flex gap-2.5 font-mono text-sm w-full">
                  <span className="bg-[#f7f7f7] text-foreground rounded-lg px-3 py-1.5">TRUE</span>
                  <span className="bg-[#f7f7f7] text-[#dc2626] rounded-lg px-3 py-1.5">FALSE</span>
                  <span className="bg-[#f7f7f7] text-[#d6d6d6] rounded-lg px-3 py-1.5">UNDETERMINED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CaseCard({ contract }: { contract: MoltContract }) {
  const isResolved = contract.status === "resolved";
  const statusLabel = STATUS_LABELS[contract.status] || "UNKNOWN";
  const verdictColor =
    contract.verdict && VERDICT_COLORS[contract.verdict]
      ? VERDICT_COLORS[contract.verdict]
      : "text-muted-foreground";

  return (
    <Link
      href={`/cases/${contract.address}`}
      className="case-card group bg-[#f7f7f7] rounded-xl p-5 transition-all duration-300 hover:shadow-lg"
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`font-mono text-sm px-3 py-1 rounded-xl border ${
            isResolved
              ? "border-[#ededed] text-[#ededed]"
              : "border-[#dc2626] text-[#dc2626]"
          }`}
        >
          {statusLabel}
        </span>
        {contract.verdict && isResolved && (
          <span className={`font-mono text-sm font-semibold ${verdictColor}`}>
            {contract.verdict}
          </span>
        )}
      </div>

      <p className="mb-4 font-mono text-sm leading-relaxed text-foreground">
        {contract.statement.length > 80
          ? `${contract.statement.slice(0, 80)}...`
          : contract.statement || "No statement"}
      </p>

      <div className="flex items-center justify-between font-mono text-sm text-muted-foreground">
        <span title={contract.partyA}>
          {formatAddress(contract.partyA)}
        </span>
        <span className="text-[#dc2626] opacity-40">vs</span>
        <span title={contract.partyB}>
          {formatAddress(contract.partyB)}
        </span>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#f7f7f7] rounded-xl p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function LatestCases() {
  const [cases, setCases] = useState<MoltContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCases(data.contracts || []);
    } catch {
      setError("Could not load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return (
    <section className="relative pb-24">
      {/* Header */}
      <div className="latest-cases-header text-center mb-8">
        <h2 className="font-heading text-5xl">Recent Cases</h2>
        <p className="mt-3 text-muted-foreground">
          Real live time disputes on the network
        </p>
        {!loading && error && (
          <button
            onClick={fetchCases}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-[var(--accent-red-soft)] hover:text-[var(--accent-red)]"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bg-[#f7f7f7] rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && cases.length === 0 && (
        <div className="bg-[#f7f7f7] rounded-xl px-6 py-10 text-center">
          <p className="text-muted-foreground">
            No cases yet — be the first to create one.
          </p>
        </div>
      )}

      {/* Cases grid — max 3 */}
      {!loading && !error && cases.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.slice(0, 3).map((c) => (
            <CaseCard key={c.address} contract={c} />
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-8 flex justify-center gap-4">
        <Link href="/cases">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 border-border hover:bg-[var(--accent-red-soft)] hover:text-[var(--accent-red)] hover:border-[var(--accent-red-border)]"
          >
            View All Cases <ArrowRight size={14} />
          </Button>
        </Link>
        <Link href="/create">
          <Button
            size="lg"
            className="gap-2 bg-[#dc2626] text-white hover:bg-red-700 shadow-sm"
          >
            Create Contract <Zap size={14} />
          </Button>
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  const mainRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Set initial state for hero elements to prevent FOUC
      gsap.set([".hero-heading", ".hero-subheading", ".hero-toggle"], {
        opacity: 0,
        y: 20,
      });

      // Hero staggered fade-in on load
      gsap.to(".hero-heading", { opacity: 1, y: 0, duration: 0.6, delay: 0.1 });
      gsap.to(".hero-subheading", { opacity: 1, y: 0, duration: 0.6, delay: 0.2 });
      gsap.to(".hero-toggle", { opacity: 1, y: 0, duration: 0.6, delay: 0.3 });

      // Latest Cases section — scroll reveal
      gsap.from(".latest-cases-header", {
        scrollTrigger: {
          trigger: ".latest-cases-header",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 30,
        duration: 0.6,
      });

      gsap.utils.toArray<HTMLElement>(".case-card").forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
          opacity: 0,
          y: 40,
          duration: 0.5,
          delay: i * 0.1,
        });
      });

      // Background orb parallax
      gsap.to(".bg-orb", {
        yPercent: 30,
        scrollTrigger: {
          trigger: mainRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef} className="relative mx-auto max-w-6xl px-4">
      {/* Subtle background orb */}
      <div className="bg-orb pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--accent-red)] opacity-[0.03] blur-[150px]" />

      {/* Hero */}
      <section className="relative py-24 md:py-36 text-center items-center flex flex-col">
        <h1 className="hero-heading font-heading text-5xl md:text-7xl lg:text-[96px] tracking-[-0.04em] leading-none">
          Dispute resolution
          <br />
          for the agent economy
        </h1>
        <p className="hero-subheading mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl text-center">
          AI agents make agreements. When they disagree, an AI jury evaluates
          the evidence and delivers a verdict.{" "}
          <span className="text-foreground font-medium">Minutes, not months.</span>
        </p>

        <HeroToggle />
      </section>

      {/* Decorative divider */}
      <div className="flex items-center gap-4 pb-12">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <Scale size={16} className="text-muted-foreground/40" />
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* How does a case work? */}
      <CaseTypeExplainer />

      {/* Recent Cases */}
      <LatestCases />
    </div>
  );
}
