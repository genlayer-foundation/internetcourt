"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS, VERDICT_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { MoltContract, ContractStatus } from "@/lib/types";
import { Loader2, AlertCircle, Copy, Check, ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

const STATUS_ORDER: ContractStatus[] = [
  "created",
  "active",
  "disputed",
  "resolving",
  "resolved",
];

function ProgressBar({ current }: { current: ContractStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(current);

  return (
    <div className="mb-10">
      {/* Bar */}
      <div className="mb-1.5 flex overflow-hidden rounded-lg h-1.5 bg-card">
        {STATUS_ORDER.map((s, i) => (
          <div
            key={s}
            className={`flex-1 ${
              i < currentIdx
                ? "bg-foreground"
                : i === currentIdx
                  ? "bg-[#dc2626]"
                  : ""
            }`}
          />
        ))}
      </div>
      {/* Labels */}
      <div className="flex">
        {STATUS_ORDER.map((s, i) => (
          <span
            key={s}
            className={`flex-1 text-center text-[10px] font-semibold tracking-wide ${
              i === currentIdx ? "text-[#dc2626]" : "text-muted-foreground"
            }`}
          >
            {STATUS_LABELS[s] || s.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[11px] text-muted-foreground break-all">
        {address || "—"}
      </span>
      {address && (
        <button
          onClick={handleCopy}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Copy address"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}

function formatEvidence(raw: string): string {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function EvidenceDefsSummary({ defs }: { defs: MoltContract["evidenceDefs"] }) {
  if (!defs?.party_a && !defs?.party_b) return null;

  const formatDef = (def: typeof defs.party_a) => {
    if (!def) return "—";
    const parts: string[] = [];
    if (def.allowed_types) parts.push(Array.isArray(def.allowed_types) ? def.allowed_types.join(", ") : String(def.allowed_types));
    if (def.max_chars) parts.push(`max ${def.max_chars.toLocaleString()} chars`);
    if (def.constraints) parts.push(def.constraints);
    return parts.join(" · ") || "—";
  };

  return (
    <div className="mb-8 flex justify-center gap-8 rounded-lg bg-card px-5 py-3.5 text-xs text-muted-foreground">
      {defs.party_a && (
        <span>
          <strong className="text-foreground">Party A:</strong> {formatDef(defs.party_a)}
        </span>
      )}
      {defs.party_b && (
        <span>
          <strong className="text-foreground">Party B:</strong> {formatDef(defs.party_b)}
        </span>
      )}
    </div>
  );
}

interface DocketLink {
  label: string;
  url: string;
}

interface DocketEntry {
  action: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  actor: string | null;
  details: string | null;
  evidence: string | null;
  source: string;
  links: DocketLink[];
}

const SOURCE_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  Base: {
    bg: "bg-blue-50 border-blue-200/60",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "Base",
  },
  LayerZero: {
    bg: "bg-amber-50 border-amber-200/60",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "LayerZero",
  },
};

function DocketTab({ address, isBase }: { address: string; isBase: boolean }) {
  const [docket, setDocket] = useState<DocketEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocket() {
      try {
        const res = await fetch(`/api/cases/${encodeURIComponent(address)}/docket`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setDocket(data.docket || []);
          if (data.note) setNote(data.note);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load docket");
      } finally {
        setLoading(false);
      }
    }
    loadDocket();
  }, [address, isBase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading docket...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-5 w-5" />
        {error}
      </div>
    );
  }

  if (docket.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        {note || "No transactions found"}
      </div>
    );
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 11) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isVerdictEntry = (action: string) =>
    action.startsWith("Verdict delivered") || action.startsWith("Outcome confirmed");

  return (
    <div>
      {/* Docket header */}
      <div className="mb-6 flex items-baseline justify-between border-b border-border pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg italic text-foreground">Case Record</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {docket.length} filing{docket.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {["Base", "LayerZero"].map((src) => {
            const style = SOURCE_STYLES[src];
            const count = docket.filter((e) => e.source === src).length;
            if (!count) return null;
            return (
              <span key={src} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
                <span className="font-mono">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical rule */}
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border" />

        {/* Entries */}
        <div className="space-y-0">
          {docket.map((entry, idx) => {
            const style = SOURCE_STYLES[entry.source] || SOURCE_STYLES.Base;
            const isVerdict = isVerdictEntry(entry.action);
            const isLast = idx === docket.length - 1;

            return (
              <div
                key={`${entry.txHash}-${idx}`}
                className="animate-fade-in-up group relative"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="flex gap-0">
                  {/* Left: Number + dot column */}
                  <div className="flex w-12 shrink-0 flex-col items-center pt-5">
                    <div
                      className={`relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-all ${
                        isLast
                          ? "border-[#dc2626] bg-[#dc2626] shadow-[0_0_8px_rgba(220,38,38,0.3)]"
                          : isVerdict
                            ? "border-foreground bg-foreground"
                            : "border-border bg-background group-hover:border-muted-foreground"
                      }`}
                    >
                      <span
                        className={`font-mono text-[8px] font-bold leading-none ${
                          isLast || isVerdict ? "text-white" : "text-muted-foreground"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Right: Content card */}
                  <div
                    className={`flex-1 border-b border-border/60 py-4 pr-2 transition-colors ${
                      isVerdict ? "" : "group-hover:bg-card/40"
                    }`}
                  >
                    {/* Top row: timestamp + source */}
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {entry.source}
                      </span>
                    </div>

                    {/* Action title */}
                    <div
                      className={`mb-1 font-serif text-[15px] leading-snug ${
                        isVerdict ? "text-[#dc2626] font-medium" : "text-foreground"
                      }`}
                    >
                      {entry.action}
                    </div>

                    {/* Actor */}
                    {entry.actor && (
                      <div className="mb-0.5 text-[11px] text-muted-foreground">
                        by{" "}
                        <span className="font-mono text-foreground/70">
                          {truncateAddress(entry.actor)}
                        </span>
                      </div>
                    )}

                    {/* Details */}
                    {entry.details && (
                      <div
                        className={`mt-1.5 text-[12px] leading-relaxed text-muted-foreground ${
                          isVerdict
                            ? "rounded-md border border-border/80 bg-card px-3 py-2.5 italic"
                            : ""
                        }`}
                      >
                        {entry.details.split("\n").map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    )}

                    {/* Evidence block */}
                    {entry.evidence && (
                      <div className="mt-2 rounded-md border border-border bg-card/80 px-3.5 py-2.5">
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-[1.5px] text-muted-foreground/60">
                          Evidence
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/80">
                          {(() => {
                            try { return JSON.stringify(JSON.parse(entry.evidence), null, 2); } catch { return entry.evidence; }
                          })()}
                        </pre>
                      </div>
                    )}

                    {/* Links row */}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {(entry.links || []).map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground/60 transition-colors hover:text-[#dc2626]"
                        >
                          {link.label} <ExternalLink size={9} />
                        </a>
                      ))}
                      <span className="font-mono text-[10px] text-muted-foreground/40">
                        {entry.txHash.slice(0, 10)}...{entry.txHash.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* End marker */}
        <div className="flex w-12 justify-center pt-3">
          <div className="h-2 w-2 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: address } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [contract, setContract] = useState<MoltContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBase, setIsBase] = useState(false);

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam === "docket" ? "docket" : "overview";

  const setActiveTab = useCallback((tab: "overview" | "docket") => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    async function load() {
      try {
        // Try Base Sepolia API first (Solidity contracts)
        const casesRes = await fetch(`/api/cases/${encodeURIComponent(address)}`);
        const casesData = await casesRes.json();

        if (casesRes.ok && !casesData.error) {
          // Adapt Base Sepolia response to MoltContract format
          const statusMap: Record<string, ContractStatus> = {
            CREATED: "created", ACTIVE: "active", DISPUTED: "disputed",
            RESOLVING: "resolving", RESOLVED: "resolved", CANCELLED: "cancelled",
          };
          const resolvedStatus = statusMap[casesData.statusName] || "created";
          // Only show verdict if case is actually resolved
          const showVerdict = resolvedStatus === "resolved" && casesData.verdictName;
          setIsBase(true);
          setContract({
            address: casesData.address,
            partyA: casesData.partyA || "",
            partyB: casesData.partyB || "",
            statement: casesData.statement || "",
            guidelines: casesData.guidelines || "",
            evidenceDefs: {},
            status: resolvedStatus,
            evidenceA: casesData.evidenceA || "",
            evidenceB: casesData.evidenceB || "",
            verdict: showVerdict ? casesData.verdictName : "",
            reasoning: casesData.reasoning || "",
            proposedOutcomeA: "",
            proposedOutcomeB: "",
            escrowAmount: casesData.escrowAmount || "0",
          } as MoltContract);
          return;
        }

        setError("Contract not found");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading contract...</span>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <Link href="/cases">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ArrowLeft size={14} /> Back to cases
          </Button>
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-red-600">
          <AlertCircle size={18} />
          <div>
            <p className="font-medium">Failed to load contract</p>
            <p className="text-sm opacity-80">{error || "Contract not found"}</p>
            <p className="mt-1 font-mono text-xs opacity-60">{address}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasEvidence = contract.evidenceA || contract.evidenceB;
  const hasProposals = contract.proposedOutcomeA || contract.proposedOutcomeB;

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8 pb-20">
      {/* Back */}
      <Link href="/cases">
        <Button variant="ghost" size="sm" className="mb-8 gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to cases
        </Button>
      </Link>

      {/* Top bar: status + address */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`text-[11px] font-bold tracking-wide px-3.5 py-1 rounded-md ${STATUS_COLORS[contract.status] || ""}`}
          >
            {STATUS_LABELS[contract.status] || contract.status.toUpperCase()}
          </Badge>
          {contract.escrowAmount && contract.escrowAmount !== "0" && (
            <span className="text-[11px] font-mono text-muted-foreground">
              Escrow: {(Number(contract.escrowAmount) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
            </span>
          )}
        </div>
        <CopyableAddress address={contract.address} />
      </div>

      {/* Progress bar */}
      <ProgressBar current={contract.status} />

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "text-foreground border-b-2 border-[#dc2626]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("docket")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "docket"
                ? "text-foreground border-b-2 border-[#dc2626]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Docket
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Statement — centered, serif, italic */}
          <div className="mb-8 text-center px-10">
            <h1 className="font-serif text-[28px] sm:text-[32px] font-normal leading-[1.45] tracking-[-0.3px] italic">
              &ldquo;{contract.statement}&rdquo;
            </h1>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {contract.guidelines}
            </p>
          </div>

          {/* Evidence definitions bar */}
          <EvidenceDefsSummary defs={contract.evidenceDefs} />

          {/* Split adversarial: Party A | VS | Party B */}
          <div className="mb-10 grid grid-cols-[1fr_48px_1fr]">
            {/* Party A */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                <span className="text-xs font-bold tracking-wide">Party A — Creator</span>
              </div>
              <div className="mb-3">
                <CopyableAddress address={contract.partyA} />
              </div>
              {contract.proposedOutcomeA && (
                <span className={`mb-5 inline-block rounded-full px-3.5 py-1 text-[11px] font-bold ${
                  contract.proposedOutcomeA === "TRUE"
                    ? "bg-emerald-100 text-emerald-800"
                    : contract.proposedOutcomeA === "FALSE"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}>
                  Proposes {contract.proposedOutcomeA}
                </span>
              )}
              {contract.evidenceA && (
                <div className="mt-3 rounded-[10px] border-l-[3px] border-blue-600 bg-card p-5">
                  <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Evidence
                  </div>
                  <pre className="font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                    {formatEvidence(contract.evidenceA)}
                  </pre>
                </div>
              )}
            </div>

            {/* VS Divider */}
            <div className="flex flex-col items-center pt-3">
              <div className="w-px flex-1 bg-border" />
              <div className="my-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-bold tracking-widest text-white">
                VS
              </div>
              <div className="w-px flex-1 bg-border" />
            </div>

            {/* Party B */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-pink-600" />
                <span className="text-xs font-bold tracking-wide">Party B — Counterparty</span>
              </div>
              <div className="mb-3">
                <CopyableAddress address={contract.partyB} />
              </div>
              {contract.proposedOutcomeB && (
                <span className={`mb-5 inline-block rounded-full px-3.5 py-1 text-[11px] font-bold ${
                  contract.proposedOutcomeB === "TRUE"
                    ? "bg-emerald-100 text-emerald-800"
                    : contract.proposedOutcomeB === "FALSE"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}>
                  Proposes {contract.proposedOutcomeB}
                </span>
              )}
              {contract.evidenceB && (
                <div className="mt-3 rounded-[10px] border-l-[3px] border-pink-600 bg-card p-5">
                  <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Evidence
                  </div>
                  <pre className="font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                    {formatEvidence(contract.evidenceB)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Verdict */}
          {contract.verdict ? (
            <div className="rounded-xl bg-card p-8 text-center">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                Verdict
              </div>
              <div className={`mb-4 font-mono text-3xl font-bold ${VERDICT_COLORS[contract.verdict] || ""}`}>
                {contract.verdict}
              </div>
              {contract.reasoning && (
                <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {contract.reasoning}
                </p>
              )}
            </div>
          ) : (
            contract.status !== "created" && contract.status !== "active" && (
              <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-muted-foreground">
                  Verdict
                </div>
                <p className="text-sm text-muted-foreground">
                  Awaiting AI jury resolution
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* Docket Tab */}
      {activeTab === "docket" && <DocketTab address={address} isBase={isBase} />}
    </div>
  );
}
