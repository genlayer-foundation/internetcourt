"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_COLORS, VERDICT_COLORS, STATUS_LABELS } from "@/lib/constants";
import { formatAddress } from "@/lib/genlayer";
import {
  getTrackedAddresses,
  addTrackedAddress,
  removeTrackedAddress,
} from "@/lib/contract-store";
import type { MoltContract, ContractStatus } from "@/lib/types";
import { Plus, Trash2, RefreshCw, Loader2, AlertCircle } from "lucide-react";

const STATUSES: Array<ContractStatus | "ALL"> = [
  "ALL",
  "created",
  "active",
  "disputed",
  "resolving",
  "resolved",
];

export default function CasesPage() {
  const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");
  const [contracts, setContracts] = useState<MoltContract[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAddress, setNewAddress] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchContracts = useCallback(async (addrs: string[]) => {
    if (addrs.length === 0) {
      setContracts([]);
      setErrors({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: addrs }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (data.error) {
        setErrors({ _global: data.error });
        setContracts([]);
      } else {
        setContracts(data.contracts || []);
        setErrors(data.errors || {});
      }
    } catch (err) {
      const message = err instanceof DOMException && err.name === "AbortError"
        ? "Request timed out. The GenLayer RPC may be slow — try again."
        : err instanceof Error ? err.message : "Fetch failed";
      setErrors({ _global: message });
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const addrs = getTrackedAddresses();
    setAddresses(addrs);
    fetchContracts(addrs);
  }, [fetchContracts]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.trim()) return;
    const updated = addTrackedAddress(newAddress);
    setAddresses(updated);
    setNewAddress("");
    setShowAdd(false);
    fetchContracts(updated);
  }

  function handleRemove(addr: string) {
    const updated = removeTrackedAddress(addr);
    setAddresses(updated);
    setContracts((prev) => prev.filter((c) => c.address.toLowerCase() !== addr.toLowerCase()));
  }

  const filtered =
    filter === "ALL"
      ? contracts
      : contracts.filter((c) => c.status === filter);

  const pending = contracts.filter((c) => c.status === "created");
  const hasPending = pending.length > 0 && filter === "ALL";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Cases</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
            className="gap-1 text-xs"
          >
            <Plus size={14} /> Track Contract
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchContracts(addresses)}
            disabled={loading}
            className="gap-1 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                placeholder="Contract address (0x...)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <Button type="submit" size="sm">
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
            </form>
            {addresses.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Tracked contracts:
                </p>
                {addresses.map((addr) => (
                  <div
                    key={addr}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs font-mono text-muted-foreground hover:bg-accent/50"
                  >
                    <span>{addr}</span>
                    <button
                      onClick={() => handleRemove(addr)}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
            className="text-xs"
          >
            {s === "ALL" ? "ALL" : STATUS_LABELS[s] || s.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 space-y-2">
          {Object.entries(errors).map(([addr, msg]) => (
            <div
              key={addr}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
            >
              <AlertCircle size={14} />
              <span className="font-mono text-xs">{addr === "_global" ? "" : `${formatAddress(addr)}: `}</span>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading contracts...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && contracts.length === 0 && addresses.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">No cases yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Track a contract address to see its case here, or create a new
            contract.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAdd(true)}
              className="gap-1"
            >
              <Plus size={14} /> Track Contract
            </Button>
            <Link href="/create">
              <Button>Create Contract</Button>
            </Link>
          </div>
        </div>
      )}

      {!loading && contracts.length === 0 && addresses.length > 0 && (
        <p className="py-20 text-center text-muted-foreground">
          Could not load any contracts. Check the addresses and try again.
        </p>
      )}

      {/* Pending Acceptance Banner */}
      {!loading && hasPending && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-600">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Pending Acceptance ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((c) => (
              <ContractCard key={c.address} contract={c} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Main list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {(hasPending ? filtered.filter((c) => c.status !== "created") : filtered).map((c) => (
            <ContractCard key={c.address} contract={c} />
          ))}
        </div>
      )}

      {!loading && contracts.length > 0 && filtered.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          No cases matching &quot;{STATUS_LABELS[filter] || filter}&quot;.
        </p>
      )}
    </div>
  );
}

function ContractCard({
  contract: c,
  highlight,
}: {
  contract: MoltContract;
  highlight?: boolean;
}) {
  return (
    <Link href={`/cases/${c.address}`}>
      <Card
        className={`transition-colors hover:bg-accent/50 ${
          highlight ? "border-blue-200" : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-xs ${STATUS_COLORS[c.status] || ""}`}
                >
                  {STATUS_LABELS[c.status] || c.status.toUpperCase()}
                </Badge>
                {c.verdict && (
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs font-bold ${VERDICT_COLORS[c.verdict] || ""}`}
                  >
                    {c.verdict}
                  </Badge>
                )}
                {c.status === "created" && (
                  <span className="text-xs text-blue-600">
                    Awaiting Party B
                  </span>
                )}
              </div>
              <p className="mb-2 text-sm text-foreground line-clamp-2">
                {c.statement}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Creator: <span className="font-mono">{formatAddress(c.partyA)}</span>
                </span>
                <span>
                  Counterparty: <span className="font-mono">{formatAddress(c.partyB)}</span>
                </span>
                <span className="font-mono text-xs opacity-60">
                  {formatAddress(c.address)}
                </span>
              </div>
              {(c.proposedOutcomeA || c.proposedOutcomeB) && (
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  {c.proposedOutcomeA && (
                    <span>
                      Party A proposes: <span className="font-semibold text-foreground">{c.proposedOutcomeA}</span>
                    </span>
                  )}
                  {c.proposedOutcomeB && (
                    <span>
                      Party B proposes: <span className="font-semibold text-foreground">{c.proposedOutcomeB}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
