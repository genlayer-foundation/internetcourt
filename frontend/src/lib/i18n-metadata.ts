import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * Production base URL. Mirrors the `metadataBase` set in `app/[locale]/layout.tsx`.
 * Kept as a single source so hreflang/canonical/sitemap all agree.
 */
export const BASE_URL = "https://internetcourt.org";

/** Maps each supported locale to its `og:locale` value. */
export const OG_LOCALES: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
  ko: "ko_KR",
  zh: "zh_CN",
  ru: "ru_RU",
};

/**
 * Build the absolute URL for `pathname` (without locale prefix, e.g. `/brand`
 * or `/blog/welcome`) in `locale`, respecting `localePrefix: "as-needed"`:
 * the default locale (en) has NO prefix, others are prefixed (`/es/brand`).
 */
export function localizedUrl(pathname: string, locale: string): string {
  const clean = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const full = `${prefix}${clean}` || "/";
  return `${BASE_URL}${full}`;
}

/**
 * Returns the `alternates` block for a page: a `canonical` for the active
 * locale plus an `alternates.languages` map covering every locale (hreflang),
 * including `x-default` pointing at the unprefixed English URL.
 *
 * @param pathname Route without locale prefix, e.g. `/`, `/brand`, `/blog/x`.
 * @param locale   The currently rendered locale.
 */
export function buildAlternates(
  pathname: string,
  locale: string,
): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = localizedUrl(pathname, l);
  }
  // x-default points at the unprefixed (English) URL.
  languages["x-default"] = localizedUrl(pathname, routing.defaultLocale);

  return {
    canonical: localizedUrl(pathname, locale),
    languages,
  };
}

/**
 * The `og:locale` (active) + `og:locale:alternate` (every other locale) values
 * to spread into an OpenGraph metadata object.
 */
export function buildOpenGraphLocale(locale: string): {
  locale: string;
  alternateLocale: string[];
} {
  return {
    locale: OG_LOCALES[locale] ?? OG_LOCALES[routing.defaultLocale],
    alternateLocale: routing.locales
      .filter((l) => l !== locale)
      .map((l) => OG_LOCALES[l]),
  };
}
