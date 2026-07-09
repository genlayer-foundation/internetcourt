"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RiCheckLine, RiFileCopyLine } from "@/components/icons/remix";
import { cn } from "@/lib/utils";

/**
 * Small click-to-copy control used across the brand book — swatch hex values,
 * asset paths, token names. Copies `value`, shows a transient check, and stays
 * keyboard-accessible with the app's red focus ring.
 */
export function CopyChip({
  value,
  label,
  className,
}: {
  value: string;
  /** Visible text. Defaults to `value`. */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("brand.copyChip");
  const copyAria = t("copyAria", { value });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copyAria}
      aria-label={copyAria}
      className={cn(
        "group/chip inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.08em]",
        "rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors duration-150",
        "hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span>{label ?? value}</span>
      {copied ? (
        <RiCheckLine size={12} className="text-[var(--success-green)]" />
      ) : (
        <RiFileCopyLine
          size={12}
          className="opacity-40 transition-opacity group-hover/chip:opacity-100"
        />
      )}
    </button>
  );
}
