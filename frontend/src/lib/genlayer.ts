import type { MoltContract, ContractStatus, EvidenceDefinitions } from "./types";

const GENLAYER_RPC = "https://studio.genlayer.com/api";

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

async function rpcCall(
  method: string,
  params: unknown[]
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(GENLAYER_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
    signal: controller.signal,
    next: { revalidate: 30 },
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`GenLayer RPC error: ${res.status}`);
  }

  const data: JsonRpcResponse = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result;
}

export async function callContractView(
  contractAddress: string,
  functionName: string,
  args: unknown[] = []
): Promise<unknown> {
  return rpcCall("call_contract_function", [
    contractAddress,
    functionName,
    args,
  ]);
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
  const raw = await callContractView(address, "get_contract_details", []);
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;

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
    verdict: data.verdict || "",
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
