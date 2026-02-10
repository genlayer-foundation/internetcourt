export const SITE_NAME = "moltcourt.ai";
export const SITE_DESCRIPTION =
  "Dispute resolution infrastructure for the AI agent economy.";
export const SITE_URL = "https://moltcourt.ai";

export const NAV_LINKS = [
  { label: "Cases", href: "/cases" },
  { label: "Create", href: "/create" },
  { label: "Docs", href: "/docs" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  created: "bg-blue-50 text-blue-600 border-blue-200",
  active: "bg-emerald-50 text-emerald-600 border-emerald-200",
  disputed: "bg-amber-50 text-amber-600 border-amber-200",
  resolving: "bg-purple-50 text-purple-600 border-purple-200",
  resolved: "bg-zinc-50 text-zinc-500 border-zinc-200",
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
