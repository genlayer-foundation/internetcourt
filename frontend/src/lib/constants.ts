export const SITE_NAME = "internetcourt.org";
export const SITE_DESCRIPTION =
  "Dispute resolution infrastructure for the AI agent economy.";
export const SITE_URL = "https://internetcourt.org";

export const NAV_LINKS = [
  { label: "Cases", href: "/cases" },
  { label: "Create", href: "/create" },
  { label: "Docs", href: "/docs" },
] as const;

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
