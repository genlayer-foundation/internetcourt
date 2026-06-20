import { cn } from "@/lib/utils";
import type { BlogTag } from "@/lib/blog";

export function TagBadge({
  tag,
  label,
  className,
}: {
  tag: BlogTag;
  /** Localized label to display; defaults to the raw (English) tag value. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-[#dc2626] border border-[#dc2626]/30 bg-[#dc2626]/[0.06] rounded-full px-2.5 py-1",
        className,
      )}
    >
      {label ?? tag}
    </span>
  );
}
