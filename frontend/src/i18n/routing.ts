import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // All supported locales. English is the default and stays at `/`.
  locales: ["en", "es", "ko", "zh", "ru"],
  defaultLocale: "en",
  // Only non-default locales get a path prefix (`/es`, `/ko`, ...).
  // English is served from `/` with no prefix.
  localePrefix: "as-needed",
});

// Locale-aware navigation helpers — use these instead of `next/link` /
// `next/navigation` so the active locale is preserved automatically.
export const { Link, redirect, usePathname, getPathname } =
  createNavigation(routing);
