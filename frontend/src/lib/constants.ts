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
  created: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  disputed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  resolving: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  resolved: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const VERDICT_COLORS: Record<string, string> = {
  TRUE: "text-emerald-400",
  FALSE: "text-red-400",
  UNDETERMINED: "text-amber-400",
};

export const STATUS_LABELS: Record<string, string> = {
  created: "CREATED",
  active: "ACTIVE",
  disputed: "DISPUTED",
  resolving: "RESOLVING",
  resolved: "RESOLVED",
  cancelled: "CANCELLED",
};
