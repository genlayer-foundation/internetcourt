"use client";

import { useId, useRef, useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Native language names, shown in the user's own script. Kept here as a small
 * data constant (NOT in the translation files) so each label always renders in
 * its native form regardless of the active locale.
 */
const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  en: "English",
  es: "Español",
  ko: "한국어",
  zh: "中文",
  ru: "Русский",
};

/**
 * Language switcher. A compact globe/▾ pill that opens a listbox of every
 * supported locale. Selecting one navigates to the SAME route in the chosen
 * locale via next-intl's locale-aware `Link` + `usePathname` (which strips the
 * current prefix and adds the target one, respecting `localePrefix: as-needed`).
 */
export function LocaleSwitcher() {
  const activeLocale = useLocale();
  // Locale-agnostic pathname (no locale prefix), e.g. `/brand`, `/blog/welcome`.
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Close on outside click / Escape — lightweight, no extra deps.
  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(event.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border border-border/80 bg-white px-3",
          "font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80",
          "transition-colors duration-200 hover:border-[var(--accent-red-border)] hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]",
        )}
      >
        <Globe size={15} strokeWidth={1.75} />
        <span aria-hidden="true">{activeLocale}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Change language"
          className={cn(
            "absolute right-0 z-50 mt-2 min-w-[10rem] overflow-hidden rounded-[12px]",
            "border border-border/70 bg-[#f7f7f7] p-1 shadow-lg shadow-black/5",
            "animate-fade-in-up",
          )}
        >
          {routing.locales.map((locale) => {
            const isActive = locale === activeLocale;
            return (
              <li key={locale} role="none">
                <Link
                  href={pathname}
                  locale={locale}
                  role="option"
                  aria-selected={isActive}
                  lang={locale}
                  hrefLang={locale}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
                    "text-sm transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:bg-[var(--accent-red-soft)] focus-visible:text-[#dc2626]",
                    isActive
                      ? "bg-white font-medium text-foreground"
                      : "text-foreground/80 hover:bg-white hover:text-[#dc2626]",
                  )}
                >
                  <span>{LOCALE_LABELS[locale]}</span>
                  {isActive && (
                    <Check size={15} strokeWidth={2.25} className="text-[#dc2626]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
