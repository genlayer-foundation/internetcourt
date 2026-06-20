import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPostSlugs } from "@/lib/blog";
import { localizedUrl } from "@/lib/i18n-metadata";

/**
 * Multilingual sitemap: every static route plus every blog post, emitted once
 * per locale, each entry carrying an `alternates.languages` (hreflang) map for
 * all locales. URLs respect `localePrefix: "as-needed"` (en is unprefixed).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Locale-agnostic paths (no prefix). Blog posts enumerated from the canonical
  // English slug set.
  const paths = [
    "/",
    "/brand",
    "/blog",
    ...getPostSlugs().map((slug) => `/blog/${slug}`),
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    // hreflang map shared by every locale variant of this path.
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = localizedUrl(path, locale);
    }
    languages["x-default"] = localizedUrl(path, routing.defaultLocale);

    for (const locale of routing.locales) {
      entries.push({
        url: localizedUrl(path, locale),
        alternates: { languages },
      });
    }
  }

  return entries;
}
