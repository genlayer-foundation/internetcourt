import { NextResponse } from "next/server";

export const SITE_NAME = "internetcourt.org";
export const SITE_DESCRIPTION =
  "Dispute resolution infrastructure for the AI agent economy.";
export const SITE_URL = "https://internetcourt.org";

export const NAV_LINKS = [
  { label: "Cases", href: "/cases" },
  { label: "Create", href: "/create" },
  { label: "Join", href: "/join" },
  { label: "Docs", href: "/docs" },
] as const;

// --- Contract addresses (Base Sepolia) ---

/** Active factory — used for new case creation */
export const BASE_FACTORY_ADDRESS =
  "0xd533cB0B52E85b3F506b6f0c28b8f6bc4E449Dda" as `0x${string}`;

export const MOCK_USDC_ADDRESS =
  "0x58C27C7C1Ff5DBF480c956acf6b119508b6FBa4f" as `0x${string}`;

/**
 * Multi-factory registry — all factories whose cases appear in the /cases index.
 * Add new entries here as factories are deployed; order is display order (newest first).
 * `deploymentBlock` bounds event log queries — use the factory's on-chain deploymentBlock()
 * return value, not a guess. Wrong values here cause the timestamp fetch to scan millions of
 * extra blocks and time out.
 */
export const FACTORY_REGISTRY: Array<{
  address: `0x${string}`;
  label: string;
  deploymentBlock: number;
}> = [
  {
    address: "0xd533cB0B52E85b3F506b6f0c28b8f6bc4E449Dda",
    label: "v2",
    deploymentBlock: 38576182, // cast call 0xd533... "deploymentBlock()(uint256)"
  },
  {
    address: "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a",
    label: "v1",
    deploymentBlock: 37657150, // cast call 0xb981... "deploymentBlock()(uint256)"
  },
];

export const BASE_CHAIN_ID = 84532;

// --- Status / Verdict mappings ---

export const ALL_STATUSES = [
  "CREATED",
  "ACTIVE",
  "DISPUTED",
  "RESOLVING",
  "RESOLVED",
  "CANCELLED",
] as const;

export const STATUS_NAMES: Record<number, string> = {
  0: "CREATED",
  1: "ACTIVE",
  2: "DISPUTED",
  3: "RESOLVING",
  4: "RESOLVED",
  5: "CANCELLED",
};

export const STATUS_COLORS: Record<string, string> = {
  created: "bg-transparent text-[#0a0a0a] border-[#0a0a0a]",
  active: "bg-[#f5bebe] text-[#dc2626] border-[#dc2626]",
  disputed: "bg-black/20 text-white border-black",
  resolving: "bg-transparent text-[#dc2626] border-[#dc2626]",
  resolved: "bg-transparent text-[#f5bebe] border-[#f5bebe]",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export const VERDICT_COLORS: Record<string, string> = {
  "PARTY A": "text-blue-600",
  "PARTY B": "text-pink-600",
  UNDETERMINED: "text-amber-600",
};

export const STATUS_LABELS: Record<string, string> = {
  created: "CREATED",
  active: "ACTIVE",
  disputed: "DISPUTED",
  resolving: "RESOLVING",
  resolved: "RESOLVED",
  cancelled: "CANCELLED",
};

export const VERDICT_NAMES = ["UNDETERMINED", "PARTY A", "PARTY B"] as const;

// --- Utilities ---

/** Validate an Ethereum-style hex address (0x + 40 hex chars). */
export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Return a standardized JSON error NextResponse. */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
