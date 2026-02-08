"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_COLORS, VERDICT_COLORS, STATUS_LABELS } from "@/lib/constants";
import { formatAddress } from "@/lib/genlayer";
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

function StatusTimeline({ current }: { current: ContractStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_ORDER.map((s, i) => {
        const isActive = i <= currentIdx;
        const isCurrent = s === current;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isCurrent
                  ? STATUS_COLORS[s] || ""
                  : isActive
                    ? "bg-muted text-foreground"
                    : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {STATUS_LABELS[s] || s.toUpperCase()}
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div
                className={`h-px w-4 ${
                  isActive ? "bg-foreground/30" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CopyableAddress({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="font-mono text-sm break-all">{address || "—"}</p>
        {address && (
          <button
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Copy address"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
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
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link href="/cases">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ArrowLeft size={14} /> Back to cases
          </Button>
        </Link>
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-4 text-red-400">
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

  const evidenceDefs = contract.evidenceDefs || {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/cases">
        <Button variant="ghost" size="sm" className="mb-4 gap-1">
          <ArrowLeft size={14} /> Back to cases
        </Button>
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <Badge
          variant="outline"
          className={`text-xs ${STATUS_COLORS[contract.status] || ""}`}
        >
          {STATUS_LABELS[contract.status] || contract.status.toUpperCase()}
        </Badge>
        {contract.status === "created" && (
          <span className="text-xs text-blue-400">
            Awaiting Party B acceptance
          </span>
        )}
      </div>

      <StatusTimeline current={contract.status} />

      {/* Contract Address */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <CopyableAddress address={contract.address} label="Contract Address" />
        </CardContent>
      </Card>

      {/* Statement */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{contract.statement}</p>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {contract.guidelines}
          </p>
        </CardContent>
      </Card>

      {/* Parties */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party A — Creator</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyableAddress address={contract.partyA} label="Address" />
            {contract.proposedOutcomeA && (
              <p className="mt-3 text-xs text-muted-foreground">
                Proposed outcome:{" "}
                <span className="font-semibold text-foreground">
                  {contract.proposedOutcomeA}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party B — Counterparty</CardTitle>
          </CardHeader>
          <CardContent>
            <CopyableAddress address={contract.partyB} label="Address" />
            {contract.proposedOutcomeB && (
              <p className="mt-3 text-xs text-muted-foreground">
                Proposed outcome:{" "}
                <span className="font-semibold text-foreground">
                  {contract.proposedOutcomeB}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evidence Definitions */}
      {(evidenceDefs.party_a || evidenceDefs.party_b) && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Evidence Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {evidenceDefs.party_a && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Party A
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {evidenceDefs.party_a.allowed_types && (
                      <p>
                        Types:{" "}
                        {evidenceDefs.party_a.allowed_types.join(", ")}
                      </p>
                    )}
                    {evidenceDefs.party_a.max_chars && (
                      <p>
                        Max chars:{" "}
                        {evidenceDefs.party_a.max_chars.toLocaleString()}
                      </p>
                    )}
                    {evidenceDefs.party_a.constraints && (
                      <p>Constraints: {evidenceDefs.party_a.constraints}</p>
                    )}
                  </div>
                </div>
              )}
              {evidenceDefs.party_b && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Party B
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {evidenceDefs.party_b.allowed_types && (
                      <p>
                        Types:{" "}
                        {evidenceDefs.party_b.allowed_types.join(", ")}
                      </p>
                    )}
                    {evidenceDefs.party_b.max_chars && (
                      <p>
                        Max chars:{" "}
                        {evidenceDefs.party_b.max_chars.toLocaleString()}
                      </p>
                    )}
                    {evidenceDefs.party_b.constraints && (
                      <p>Constraints: {evidenceDefs.party_b.constraints}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence */}
      {(contract.evidenceA || contract.evidenceB) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {contract.evidenceA && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Party A&apos;s Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contract.evidenceA}
                </p>
              </CardContent>
            </Card>
          )}
          {contract.evidenceB && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Party B&apos;s Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contract.evidenceB}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Proposed Outcomes (when active, before dispute) */}
      {contract.status === "active" &&
        (contract.proposedOutcomeA || contract.proposedOutcomeB) && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Proposed Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Party A</p>
                  <p className="font-mono text-sm font-bold">
                    {contract.proposedOutcomeA || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Party B</p>
                  <p className="font-mono text-sm font-bold">
                    {contract.proposedOutcomeB || "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Verdict */}
      {contract.verdict && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Verdict</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Badge
                variant="outline"
                className={`font-mono text-sm font-bold ${VERDICT_COLORS[contract.verdict] || ""}`}
              >
                {contract.verdict}
              </Badge>
            </div>
            {contract.reasoning && (
              <p className="text-sm text-muted-foreground">
                {contract.reasoning}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
