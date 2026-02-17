"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_COLORS, VERDICT_COLORS, STATUS_LABELS, VERDICT_NAMES, BASE_FACTORY_ADDRESS } from "@/lib/constants";
import { formatAddress } from "@/lib/utils";
import {
  getTrackedAddresses,
  addTrackedAddress,
  removeTrackedAddress,
} from "@/lib/contract-store";
import type { MoltContract, ContractStatus } from "@/lib/types";
import { Plus, Trash2, RefreshCw, Loader2, AlertCircle, Copy, Check, X } from "lucide-react";

const STATUSES: Array<ContractStatus | "ALL"> = [
  "ALL",
  "created",
  "active",
  "disputed",
  "resolving",
  "resolved",
  "cancelled",
];

const CACHE_KEY = "internetcourt:cases:cache";
const CACHE_MAX_AGE_MS = 2 * 60 * 1000; // 2 minutes

interface CachedCases {
  contracts: MoltContract[];
  timestamp: number;
}

function loadCache(): CachedCases | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedCases = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(contracts: MoltContract[]) {
  try {
    const data: CachedCases = { contracts, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Format a date in legal/court docket style.
 * Returns "Feb 14, 2026" for creation dates,
 * or relative time ("2h ago") for recent updates.
 */
function formatCourtDate(isoString: string, relative = false): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  if (relative) {
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    // Older than a week: show absolute with time
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // Absolute date only (for filing date)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert Base Sepolia API case to MoltContract format */
const STATUS_MAP: Record<string, ContractStatus> = {
  CREATED: "created",
  ACTIVE: "active",
  DISPUTED: "disputed",
  RESOLVING: "resolving",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
};

function baseToMoltContract(c: Record<string, unknown>): MoltContract {
  return {
    address: c.address as string,
    partyA: (c.partyA as string) || "",
    partyB: (c.partyB as string) || "",
    statement: (c.statement as string) || "",
    guidelines: "",
    evidenceDefs: {},
    status: STATUS_MAP[(c.statusName as string) || ""] || "created",
    evidenceA: "",
    evidenceB: "",
    verdict: (VERDICT_NAMES[Number(c.verdict)] || "") as MoltContract["verdict"],
    reasoning: "",
    proposedOutcomeA: "",
    proposedOutcomeB: "",
    chainId: 84532, // Base Sepolia
    chainName: "Base Sepolia",
    escrowAmount: (c.escrowAmount as string) || "0",
    createdAt: (c.createdAt as string) || undefined,
    updatedAt: (c.updatedAt as string) || undefined,
  };
}

/** Deduplicate contracts by address (case-insensitive) */
function deduplicateContracts(allContracts: MoltContract[]): MoltContract[] {
  const seen = new Set<string>();
  return allContracts.filter((c) => {
    const key = c.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function CasesPage() {
  const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");
  const [contracts, setContracts] = useState<MoltContract[]>([]);
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showingCache, setShowingCache] = useState(false);
  const [cacheAge, setCacheAge] = useState("");

  // Track the current fetch generation to avoid stale updates
  const fetchGenRef = useRef(0);

  const fetchContracts = useCallback(async (addrs: string[]) => {
    const gen = ++fetchGenRef.current;

    // Phase 0: Show cached data immediately (stale-while-revalidate)
    const cached = loadCache();
    if (cached) {
      setContracts(cached.contracts);
      setShowingCache(true);
      const ageMin = Math.round((Date.now() - cached.timestamp) / 60000);
      setCacheAge(ageMin < 1 ? "less than a minute" : `${ageMin} min`);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    // Helper: fetch JSON with proper error handling (check r.ok)
    const fetchJson = async (url: string, opts?: RequestInit) => {
      const r = await fetch(url, { ...opts, signal: controller.signal });
      if (!r.ok) {
        let detail = r.statusText;
        try {
          const errBody = await r.json();
          detail = errBody.error || detail;
        } catch {
          // Response wasn't JSON — use status text
        }
        throw new Error(`HTTP ${r.status}: ${detail}`);
      }
      return r.json();
    };

    const allErrors: Record<string, string> = {};
    const allWarnings: string[] = [];

    // Launch Base + tracked fetches in parallel
    const basePromise: Promise<{ cases: MoltContract[]; _aborted?: boolean; _error?: string }> =
      fetchJson("/api/cases?limit=100")
        .then((data) => {
          if (gen !== fetchGenRef.current) return { cases: [] as MoltContract[] };
          const baseCases: MoltContract[] = (data.cases || []).map(baseToMoltContract);
          // Show Base cases as soon as they arrive (intermediate update)
          setContracts(baseCases);
          setShowingCache(false);
          setLoading(false);
          return { cases: baseCases };
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            return { cases: [] as MoltContract[], _aborted: true };
          }
          const msg = err instanceof Error ? err.message : "Base fetch failed";
          console.warn("[cases] Base Sepolia fetch failed:", msg);
          return { cases: [] as MoltContract[], _error: msg };
        });

    const trackedPromise =
      addrs.length > 0
        ? Promise.all(
            addrs.map((addr) =>
              fetchJson(`/api/cases/${encodeURIComponent(addr)}`)
                .then((data: Record<string, unknown>) =>
                  data.error ? null : data
                )
                .catch(() => null)
            )
          ).then((results) => ({
            cases: results.filter(Boolean) as Record<string, unknown>[],
            errors: {} as Record<string, string>,
          }))
        : Promise.resolve({ cases: [] as Record<string, unknown>[], errors: {} as Record<string, string> });

    // Wait for both to settle
    const [baseResult, trackedData] = await Promise.all([
      basePromise,
      trackedPromise,
    ]);

    if (gen !== fetchGenRef.current) return;
    clearTimeout(timeout);

    const baseCases: MoltContract[] = baseResult.cases || [];

    // Handle Base errors
    if (baseResult._aborted) {
      if (!cached) {
        setErrors({ _global: "Request timed out -- try again." });
        setContracts([]);
        setLoading(false);
        return;
      }
    }
    if (baseResult._error) {
      allErrors._base = `Base Sepolia: ${baseResult._error}`;
      // If no cache and no base data, stop loading spinner
      if (!cached) setLoading(false);
    }

    // Merge tracked errors
    Object.assign(allErrors, trackedData.errors || {});

    // Merge Base cases + tracked and deduplicate
    const trackedCases: MoltContract[] = (trackedData.cases || []).map(baseToMoltContract);
    const merged = deduplicateContracts([
      ...baseCases,
      ...trackedCases,
    ]);

    setContracts(merged);
    setShowingCache(false);
    setLoading(false);
    setErrors(allErrors);
    setWarnings(allWarnings);

    // Update localStorage cache with fresh data
    if (merged.length > 0) {
      saveCache(merged);
    } else if (baseCases.length > 0) {
      saveCache(baseCases);
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

  function handleRefresh() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // localStorage unavailable — ignore
    }
    setLoading(true);
    setErrors({});
    setWarnings([]);
    fetchContracts(addresses);
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
        <h1 className="font-heading text-4xl md:text-5xl tracking-[-0.96px] leading-[1.2]">Cases</h1>
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
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1 text-xs"
            title="Refresh cases"
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

      {/* Stale cache indicator */}
      {showingCache && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <Loader2 size={14} className="shrink-0 animate-spin text-blue-500" />
          <span>Showing cached data from {cacheAge} ago. Updating...</span>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-4">
          {warnings.map((msg, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              <AlertCircle size={14} className="shrink-0 text-amber-500" />
              <span className="flex-1">{msg}</span>
              <button
                onClick={() => setWarnings((prev) => prev.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded p-0.5 hover:bg-amber-100"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errors (genuine failures, not transient busy errors) */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 space-y-2">
          {Object.entries(errors).map(([addr, msg]) => (
            <div
              key={addr}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span className="font-mono text-xs">{addr.startsWith("_") ? "" : `${formatAddress(addr)}: `}</span>
              <span className="flex-1">{msg}</span>
              <button
                onClick={() => setErrors((prev) => {
                  const next = { ...prev };
                  delete next[addr];
                  return next;
                })}
                className="shrink-0 rounded p-0.5 hover:bg-red-100"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Loading (only shows when no cache and no Base results yet) */}
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

      {/* Case list */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-6">
          {hasPending && (
            <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Pending Acceptance ({pending.length})
            </h2>
          )}
          {[...filtered]
            .sort((a, b) => {
              // "created" cases float to top
              if (a.status === "created" && b.status !== "created") return -1;
              if (a.status !== "created" && b.status === "created") return 1;
              // Within same group, most recently updated first
              const aTime = a.updatedAt || a.createdAt || "";
              const bTime = b.updatedAt || b.createdAt || "";
              if (aTime > bTime) return -1;
              if (aTime < bTime) return 1;
              return 0;
            })
            .map((c, idx) => (
              <ContractCard
                key={c.address}
                contract={c}
                highlight={hasPending && c.status === "created"}
                index={idx}
              />
            ))}
        </div>
      )}

      {!loading && contracts.length > 0 && filtered.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">
          No cases matching &quot;{STATUS_LABELS[filter] || filter}&quot;.
        </p>
      )}

      {/* Factory contract address */}
      <div className="mt-12 border-t border-border/40 pt-4 text-center flex flex-col items-center gap-1">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(BASE_FACTORY_ADDRESS);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title={BASE_FACTORY_ADDRESS}
        >
          <span>Base Factory: <span className="font-mono">{formatAddress(BASE_FACTORY_ADDRESS)}</span></span>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
}

function ContractCard({
  contract: c,
  highlight,
  index = 0,
}: {
  contract: MoltContract;
  highlight?: boolean;
  index?: number;
}) {
  // Verdict is already available from the list API response (via baseToMoltContract),
  // so no per-card detail fetch is needed — eliminates N+1 requests.
  const displayVerdict = c.verdict || "";

  // Fix #5: Only show date section when dates exist AND are valid
  const createdAtValid = c.createdAt && !isNaN(new Date(c.createdAt).getTime());
  const updatedAtValid = c.updatedAt && !isNaN(new Date(c.updatedAt).getTime());
  const hasDates = createdAtValid || updatedAtValid;
  const showUpdated =
    updatedAtValid && createdAtValid && c.updatedAt !== c.createdAt;

  return (
    <Link href={`/cases/${c.address}`}>
      <Card
        className={`animate-fade-in-up opacity-0 bg-[#f7f7f7] border hover:shadow-lg transition-all duration-300 ${
          highlight ? "border-blue-200" : ""
        } ${c.incomplete ? "border-dashed border-amber-300" : ""}`}
        style={{ animationDelay: `${index * 60}ms` }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-3">
                {/* Chain badge */}
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200"
                >
                  Base
                </Badge>
                {c.incomplete && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-amber-50 text-amber-600 border-amber-200"
                  >
                    Partial
                  </Badge>
                )}
                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={`text-sm ${STATUS_COLORS[c.status] || ""}`}
                >
                  {STATUS_LABELS[c.status] || c.status.toUpperCase()}
                </Badge>
                {displayVerdict && (
                  <Badge
                    variant="outline"
                    className={`font-mono text-sm font-bold ${VERDICT_COLORS[displayVerdict] || ""}`}
                  >
                    {displayVerdict}
                  </Badge>
                )}
                {c.status === "created" && (
                  <span className="text-xs text-blue-600">
                    Awaiting Party B
                  </span>
                )}
              </div>
              <p className="mb-2 text-base text-foreground line-clamp-2">
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
                {c.escrowAmount && c.escrowAmount !== "0" && (
                  <span className="text-xs text-muted-foreground">
                    Escrow: {(Number(c.escrowAmount) / 1e6).toFixed(2)} USDC
                  </span>
                )}
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

          {/* Court docket timestamps */}
          {hasDates && (
            <div className="mt-4 flex items-center gap-6 border-t border-border/40 pt-3">
              {createdAtValid && (
                <span className="text-[12px] leading-none text-muted-foreground/70">
                  <span className="font-serif italic tracking-wide">Filed</span>
                  <span className="mx-1.5 text-border">|</span>
                  <span>{formatCourtDate(c.createdAt!)}</span>
                </span>
              )}
              {showUpdated && (
                <span className="text-[12px] leading-none text-muted-foreground/70">
                  <span className="font-serif italic tracking-wide">Updated</span>
                  <span className="mx-1.5 text-border">|</span>
                  <span>{formatCourtDate(c.updatedAt!, true)}</span>
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
