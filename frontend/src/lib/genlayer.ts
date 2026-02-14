import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";
import type { MoltContract, ContractStatus, Verdict, EvidenceDefinitions } from "./types";

// Server-side GenLayer client (no account needed for read-only calls)
const glClient = createClient({ chain: studionet });

export async function callContractView(
  contractAddress: string,
  functionName: string,
  args: CalldataEncodable[] = []
): Promise<unknown> {
  const raw = await glClient.readContract({
    address: contractAddress as `0x${string}`,
    functionName,
    args,
  });
  // readContract returns decoded calldata; for our contracts it's typically a JSON string
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function parseEvidenceDefs(raw: string): EvidenceDefinitions {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeStatus(status: string): ContractStatus {
  const lower = status.toLowerCase() as ContractStatus;
  const valid: ContractStatus[] = [
    "created",
    "active",
    "disputed",
    "resolving",
    "resolved",
    "cancelled",
  ];
  return valid.includes(lower) ? lower : "created";
}

export async function fetchContractDetails(
  address: string
): Promise<MoltContract> {
  const data = (await callContractView(address, "get_contract_details", [])) as Record<string, string>;

  return {
    address,
    partyA: data.party_a || "",
    partyB: data.party_b || "",
    statement: data.statement || "",
    guidelines: data.guidelines || "",
    evidenceDefs: parseEvidenceDefs(data.evidence_defs),
    status: normalizeStatus(data.status || "created"),
    evidenceA: data.evidence_a || "",
    evidenceB: data.evidence_b || "",
    verdict: (data.verdict || "") as Verdict,
    reasoning: data.reasoning || "",
    proposedOutcomeA: data.proposed_outcome_a || "",
    proposedOutcomeB: data.proposed_outcome_b || "",
  };
}

/** Check if an error message indicates a transient GenLayer "server busy" condition. */
function isServerBusyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("server busy") ||
    lower.includes("execution slots occupied") ||
    lower.includes("execution slots") ||
    lower.includes("all 8 execution")
  );
}

/** Simple concurrency limiter (pLimit-style, no external deps). */
function pLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (queue.length > 0 && active < concurrency) {
      active++;
      queue.shift()!();
    }
  }

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn().then(resolve, reject).finally(() => {
          active--;
          next();
        });
      });
      next();
    });
}

const RETRY_DELAYS = [1000, 3000, 5000];

/** Fetch contract details with retry on transient "server busy" errors. */
async function fetchWithRetry(address: string): Promise<MoltContract> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fetchContractDetails(address);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (
        attempt < RETRY_DELAYS.length &&
        isServerBusyError(lastError.message)
      ) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        continue;
      }
      throw lastError;
    }
  }
  throw lastError;
}

/**
 * Fetch contract details for multiple addresses.
 *
 * @param addresses - Contract addresses to fetch
 * @param factoryMetadata - Optional map of address -> factory registry metadata.
 *   When a contract fetch fails with a transient "server busy" error and factory
 *   metadata is available, a partial contract is returned instead of an error.
 */
export async function fetchMultipleContracts(
  addresses: string[],
  factoryMetadata?: Record<string, Record<string, unknown>>
): Promise<{
  contracts: MoltContract[];
  errors: Record<string, string>;
  warnings: string[];
}> {
  const contracts: MoltContract[] = [];
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  let busyCount = 0;

  const limit = pLimit(3);
  const results = await Promise.allSettled(
    addresses.map((addr) => limit(() => fetchWithRetry(addr)))
  );

  results.forEach((result, i) => {
    const addr = addresses[i];
    if (result.status === "fulfilled") {
      contracts.push(result.value);
    } else {
      const msg = result.reason?.message || "Unknown error";
      if (isServerBusyError(msg)) {
        busyCount++;
        // Return a partial contract from factory metadata if available
        const meta = factoryMetadata?.[addr];
        contracts.push({
          address: addr,
          partyA: (meta?.party_a as string) || (meta?.deployer as string) || "",
          partyB: (meta?.party_b as string) || "",
          statement: (meta?.statement as string) || "",
          guidelines: "",
          evidenceDefs: {},
          status: "created", // default; actual status unknown
          evidenceA: "",
          evidenceB: "",
          verdict: "" as Verdict,
          reasoning: "",
          proposedOutcomeA: "",
          proposedOutcomeB: "",
        });
      } else {
        errors[addr] = msg;
      }
    }
  });

  if (busyCount > 0) {
    warnings.push(
      `GenLayer studionet is busy (${busyCount} contract${busyCount > 1 ? "s" : ""} affected). Some case details may be incomplete.`
    );
  }

  return { contracts, errors, warnings };
}

export function formatAddress(address: string): string {
  if (!address) return "—";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
