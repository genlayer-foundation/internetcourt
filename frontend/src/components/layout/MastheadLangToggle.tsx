"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
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
 * MastheadLangToggle — the masthead's tiny language control.
 *
 * Visually it reads as a quiet two-letter mono mark (e.g. `EN ▾`) that sits
 * inline in the right-side social cluster, on the same baseline/height as the
 * social icon buttons. Functionally it is a real listbox of every supported
 * locale: selecting one navigates to the SAME route in the chosen locale via
 * next-intl's locale-aware `Link` + `usePathname` (which strips the current
 * prefix and adds the target one, respecting `localePrefix: as-needed`).
 *
 * Click-outside and Escape close the menu; the active locale is marked.
 */
export function MastheadLangToggle() {
  const activeLocale = useLocale();
  // Locale-agnostic pathname (no locale prefix), e.g. `/brand`, `/blog/welcome`.
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Close on outside click / Escape — lightweight, no extra deps.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-0.5 rounded-full px-1.5",
          "font-mono text-[10px] uppercase tracking-[0.22em] text-[#4d4944]",
          "transition-colors duration-200 hover:text-[#dc2626]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]",
          open && "text-[#dc2626]",
        )}
      >
        <span aria-hidden="true">{activeLocale}</span>
        <ChevronDown
          size={11}
          strokeWidth={2}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Change language"
          className={cn(
            "absolute right-0 z-50 mt-2 min-w-[9.5rem] overflow-hidden rounded-[10px]",
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
                    "flex items-center justify-between gap-3 rounded-md px-3 py-1.5",
                    "text-sm transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:bg-[var(--accent-red-soft)] focus-visible:text-[#dc2626]",
                    isActive
                      ? "bg-white font-medium text-foreground"
                      : "text-foreground/80 hover:bg-white hover:text-[#dc2626]",
                  )}
                >
                  <span>{LOCALE_LABELS[locale]}</span>
                  {isActive && (
                    <Check size={14} strokeWidth={2.25} className="text-[#dc2626]" />
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
