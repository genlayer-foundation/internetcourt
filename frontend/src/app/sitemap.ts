import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAllPosts } from "@/lib/blog";
import { localizedUrl } from "@/lib/i18n-metadata";

/**
 * Multilingual sitemap: every static route plus every blog post, emitted once
 * per locale, each entry carrying an `alternates.languages` (hreflang) map for
 * all locales plus a `lastModified` date. URLs respect
 * `localePrefix: "as-needed"` (en is unprefixed).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const buildTime = new Date();

  // Locale-agnostic paths (no prefix). Static routes use build time; blog posts
  // use their `updated` (falling back to `date`) frontmatter.
  const paths: { path: string; lastModified: Date }[] = [
    { path: "/", lastModified: buildTime },
    { path: "/brand", lastModified: buildTime },
    { path: "/blog", lastModified: buildTime },
    ...getAllPosts().map((post) => ({
      path: `/blog/${post.slug}`,
      lastModified: new Date(post.updated ?? post.date),
    })),
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, lastModified } of paths) {
    // hreflang map shared by every locale variant of this path.
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = localizedUrl(path, locale);
    }
    languages["x-default"] = localizedUrl(path, routing.defaultLocale);

    for (const locale of routing.locales) {
      entries.push({
        url: localizedUrl(path, locale),
        lastModified,
        alternates: { languages },
      });
    }
  }

  return entries;
}
