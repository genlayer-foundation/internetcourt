"use client";

import { useState, useEffect, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS, VERDICT_COLORS, STATUS_LABELS } from "@/lib/constants";
import type { MoltContract, ContractStatus } from "@/lib/types";
import { Loader2, AlertCircle, Copy, Check, ArrowLeft } from "lucide-react";
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
    if (def.allowed_types) parts.push(def.allowed_types.join(", "));
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

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: address } = use(params);
  const [contract, setContract] = useState<MoltContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/${encodeURIComponent(address)}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setContract(data);
        }
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
        <Badge
          variant="outline"
          className={`text-[11px] font-bold tracking-wide px-3.5 py-1 rounded-md ${STATUS_COLORS[contract.status] || ""}`}
        >
          {STATUS_LABELS[contract.status] || contract.status.toUpperCase()}
        </Badge>
        <CopyableAddress address={contract.address} />
      </div>

      {/* Progress bar */}
      <ProgressBar current={contract.status} />

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
    </div>
  );
}
