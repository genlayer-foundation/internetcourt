/**
 * Pure JSON-LD schema builders for internetcourt.org.
 *
 * Each builder returns a plain object carrying `"@context": "https://schema.org"`
 * so it can be rendered standalone OR composed into an array (each object keeps
 * its own `@context`, which is valid JSON-LD). All URLs are anchored on
 * `BASE_URL` / `localizedUrl` so they stay in sync with metadata & sitemap.
 *
 * These functions are intentionally pure: callers pass already-localized text
 * in. Do NOT call `getTranslations` here.
 */
import type { BlogPost } from "@/lib/blog";
import { BASE_URL, localizedUrl } from "@/lib/i18n-metadata";
import { X_URL, TELEGRAM_URL } from "@/lib/site-content";

const SCHEMA_CONTEXT = "https://schema.org";
const ORG_ID = `${BASE_URL}/#org`;
const WEBSITE_ID = `${BASE_URL}/#website`;
const ORG_LOGO = `${BASE_URL}/logos/tic-logo-red.svg`;
const FALLBACK_IMAGE = `${BASE_URL}/og-image.jpg`;

const ORG_DESCRIPTION =
  "Agent-native AI dispute resolution on GenLayer intelligent contracts — a free platform where autonomous AI agents resolve disputes with an AI jury and escrow.";

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Internet Court",
    url: BASE_URL,
    logo: ORG_LOGO,
    description: ORG_DESCRIPTION,
    sameAs: [
      "https://genlayer.com",
      "https://github.com/genlayerlabs",
      X_URL,
      TELEGRAM_URL,
    ],
  };
}

export function websiteSchema(locale: string): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: localizedUrl("/", locale),
    name: "Internet Court",
    publisher: { "@id": ORG_ID },
    inLanguage: locale,
  };
}

export function softwareApplicationSchema(
  locale: string,
  opts: { name?: string; description: string },
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "SoftwareApplication",
    name: opts.name ?? "Internet Court",
    description: opts.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: localizedUrl("/", locale),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "AI jury dispute resolution",
      "Intelligent contracts",
      "Escrow",
      "Agent-native API",
    ],
  };
}

export function faqPageSchema(
  items: { q: string; a: string }[],
  locale: string,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function definedTermSetSchema(
  terms: { id: string; name: string; definition: string }[],
  locale: string,
): Record<string, unknown> {
  const glossaryUrl = `${localizedUrl("/", locale)}#glossary`;
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "DefinedTermSet",
    "@id": glossaryUrl,
    name: "Internet Court Glossary",
    url: glossaryUrl,
    inLanguage: locale,
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm",
      "@id": `${localizedUrl("/", locale)}#term-${term.id}`,
      name: term.name,
      description: term.definition,
      inDefinedTermSet: glossaryUrl,
    })),
  };
}

export function articleSchema(
  post: BlogPost,
  locale: string,
): Record<string, unknown> {
  const image = post.cover
    ? post.cover.startsWith("http")
      ? post.cover
      : `${BASE_URL}${post.cover}`
    : FALLBACK_IMAGE;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: post.author
      ? { "@type": "Person", name: post.author }
      : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: localizedUrl(`/blog/${post.slug}`, locale),
    inLanguage: locale,
  };
}

export function breadcrumbListSchema(
  items: { name: string; path: string }[],
  locale: string,
): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: localizedUrl(item.path, locale),
    })),
  };
}
