import { NextResponse } from "next/server";
import deployments from "../../../bridge/deployments.json";

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

// --- Contract addresses (centralized, sourced from bridge/deployments.json) ---

export const BASE_FACTORY_ADDRESS =
  (process.env.NEXT_PUBLIC_BASE_FACTORY_ADDRESS || deployments.baseSepolia.factory) as `0x${string}`;

export const GENLAYER_FACTORY_ADDRESS =
  (deployments.genlayer.factory) as `0x${string}`;

export const MOCK_USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || deployments.baseSepolia.mockUSDC) as `0x${string}`;

export const DEPLOYMENT_BLOCK = deployments.baseSepolia.deploymentBlock;

export const BASE_CHAIN_ID = 84532;
export const GENLAYER_CHAIN_ID = 61999;

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
  TRUE: "text-emerald-600",
  FALSE: "text-red-600",
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

export const VERDICT_NAMES = ["UNDETERMINED", "TRUE", "FALSE"] as const;

// --- Utilities ---

/** Validate an Ethereum-style hex address (0x + 40 hex chars). */
export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Return a standardized JSON error NextResponse. */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
