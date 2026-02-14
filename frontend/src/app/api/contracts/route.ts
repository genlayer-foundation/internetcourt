import { NextRequest, NextResponse } from "next/server";
import {
  callContractView,
  fetchMultipleContracts,
} from "@/lib/genlayer";
import { apiError, GENLAYER_FACTORY_ADDRESS } from "@/lib/constants";
import type { MoltContract } from "@/lib/types";

const FACTORY_ADDRESS = GENLAYER_FACTORY_ADDRESS;

// --- In-memory response cache (2-minute TTL, max 100 entries) ---
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key: string, data: unknown): void {
  // Evict oldest entries if at capacity
  if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(key)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const cacheKey = "factory-list";
    const cached = cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": "max-age=120" },
      });
    }

    const entries = await callContractView(
      FACTORY_ADDRESS,
      "get_contracts_by_type",
      ["internetcourt"]
    );

    const entryList = Array.isArray(entries) ? entries : [];

    const contracts: MoltContract[] = [];
    const errors: Record<string, string> = {};
    const warnings: string[] = [];
    const genLayerAddresses: string[] = [];
    const genLayerFactoryMeta: Record<string, Record<string, unknown>> = {};

    // Separate Base cases (with chain_id) from GenLayer-native cases
    for (const entry of entryList) {
      const address = entry?.address;
      if (!address) continue;

      let params: Record<string, unknown> = {};
      try {
        params = typeof entry.params === "string" ? JSON.parse(entry.params) : (entry.params || {});
      } catch (parseErr) {
        console.warn(`[contracts] Failed to parse params for ${address}:`, parseErr instanceof Error ? parseErr.message : parseErr);
        params = {};
      }

      if (params.chain_id) {
        // Base case — construct from registry metadata
        contracts.push({
          address,
          partyA: (params.party_a as string) || "",
          partyB: (params.party_b as string) || "",
          statement: (params.statement as string) || "",
          guidelines: "",
          evidenceDefs: {},
          status: "created",
          evidenceA: "",
          evidenceB: "",
          verdict: "",
          reasoning: "",
          proposedOutcomeA: "",
          proposedOutcomeB: "",
          chainId: params.chain_id as number,
          chainName: (params.chain_name as string) || "",
          factoryId: params.factory_id as number,
          baseFactory: (params.base_factory as string) || "",
          escrowAmount: (params.escrow_amount as string) || "",
        });
      } else {
        // GenLayer-native case — fetch details from contract
        genLayerAddresses.push(address);
        // Stash factory metadata so partial contracts can be built on busy errors
        genLayerFactoryMeta[address] = {
          ...params,
          deployer: entry.deployer || "",
        };
      }
    }

    // Fetch GenLayer-native case details in parallel
    // NOTE: GenLayer timestamps not available — GenLayer RPC does not expose block timestamps
    // for individual transactions. This is a known limitation.
    if (genLayerAddresses.length > 0) {
      const { contracts: glContracts, errors: glErrors, warnings: glWarnings } =
        await fetchMultipleContracts(genLayerAddresses, genLayerFactoryMeta);
      contracts.push(...glContracts);
      Object.assign(errors, glErrors);
      warnings.push(...glWarnings);
    }

    const responseData = { contracts, errors, warnings };
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("GET /api/contracts error:", err instanceof Error ? err.message : err);
    return apiError(err instanceof Error ? err.message : "Internal error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addresses: string[] = body.addresses || [];

    if (addresses.length === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const cacheKey = "addrs:" + [...addresses].sort().join(",");
    const cached = cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT", "Cache-Control": "max-age=120" },
      });
    }

    const { contracts, errors, warnings } = await fetchMultipleContracts(addresses);
    const responseData = { contracts, errors, warnings };
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("POST /api/contracts error:", err instanceof Error ? err.message : err);
    return apiError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
