"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function hexToRgb(hex: string): string | null {
  const m = hex.replace("#", "");
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export type SwatchProps = {
  name: string;
  /** CSS color used for the chip fill (hex, rgb, oklch…). */
  value: string;
  /** Token / role note shown under the name. */
  role?: string;
  /** Force light/dark foreground for the chip label; auto-derived for hex. */
  ink?: "light" | "dark";
  /** Render a hairline border around the chip (for near-white fills). */
  bordered?: boolean;
};

/**
 * A single color card: large fill chip on top, name + role + click-to-copy
 * value strip below. Clicking the chip copies the raw value. The whole card is
 * the editorial unit of section 03.
 */
export function Swatch({ name, value, role, ink, bordered }: SwatchProps) {
  const [copied, setCopied] = useState<"hex" | "rgb" | null>(null);
  const t = useTranslations("brand.swatch");
  const rgb = value.startsWith("#") ? hexToRgb(value) : null;

  // Auto-pick a legible label color for hex fills when not told explicitly.
  const derivedInk =
    ink ??
    (() => {
      if (!value.startsWith("#") || value.length !== 7) return "light";
      const r = parseInt(value.slice(1, 3), 16);
      const g = parseInt(value.slice(3, 5), 16);
      const b = parseInt(value.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? "dark" : "light";
    })();

  const copy = async (kind: "hex" | "rgb", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="group flex flex-col">
      <button
        type="button"
        onClick={() => copy("hex", value)}
        aria-label={t("copyAria", { name, value })}
        className={cn(
          "relative flex h-28 w-full items-end justify-start overflow-hidden rounded-xl p-3 transition-transform duration-200 active:scale-[0.99]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          bordered && "ring-1 ring-inset ring-border",
        )}
        style={{ backgroundColor: value }}
      >
        <span
          className={cn(
            "font-mono text-[11px] uppercase tracking-[0.12em] opacity-0 transition-opacity duration-200 group-hover:opacity-100",
            derivedInk === "dark" ? "text-[#1a1817]/70" : "text-white/80",
          )}
        >
          {copied === "hex" ? (
            <span className="inline-flex items-center gap-1">
              <Check size={11} /> {t("copied")}
            </span>
          ) : (
            t("clickToCopy")
          )}
        </span>
      </button>

      <div className="mt-3 flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{name}</span>
        {role && (
          <span className="text-[12px] leading-snug text-muted-foreground">
            {role}
          </span>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => copy("hex", value)}
            className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-[#dc2626] focus-visible:outline-none focus-visible:text-[#dc2626]"
            title={t("copyHexAria", { value })}
          >
            {value}
          </button>
          {rgb && (
            <button
              type="button"
              onClick={() => copy("rgb", rgb)}
              className="font-mono text-[11px] tracking-[0.02em] text-muted-foreground/70 transition-colors hover:text-[#dc2626] focus-visible:outline-none focus-visible:text-[#dc2626]"
              title={t("copyRgbAria", { value: rgb })}
            >
              {copied === "rgb" ? t("copiedLower") : rgb}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
