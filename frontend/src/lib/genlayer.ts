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

export async function fetchMultipleContracts(
  addresses: string[]
): Promise<{ contracts: MoltContract[]; errors: Record<string, string> }> {
  const contracts: MoltContract[] = [];
  const errors: Record<string, string> = {};

  const results = await Promise.allSettled(
    addresses.map((addr) => fetchContractDetails(addr))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      contracts.push(result.value);
    } else {
      errors[addresses[i]] = result.reason?.message || "Unknown error";
    }
  });

  return { contracts, errors };
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
