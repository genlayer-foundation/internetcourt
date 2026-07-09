import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type BlogTag = "Notice" | "Opinion" | "Order" | "Dispatch" | "Exhibit";

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tag?: BlogTag;
  updated?: string;
  author?: string;
  draft?: boolean;
  content: string;
};

const DEFAULT_LOCALE = "en";
const POSTS_ROOT = path.join(process.cwd(), "src", "content", "blog");

function localeDir(locale: string): string {
  return path.join(POSTS_ROOT, locale);
}

/** Read the English frontmatter for a slug (drafts are flagged there). */
function readFrontmatter(cleanSlug: string): Record<string, unknown> {
  const filePath = resolveFile(DEFAULT_LOCALE, cleanSlug);
  if (!filePath) return {};
  return matter(fs.readFileSync(filePath, "utf8")).data;
}

/** A post with `draft: true` in its frontmatter is unpublished. */
function isDraft(cleanSlug: string): boolean {
  return readFrontmatter(cleanSlug).draft === true;
}

/**
 * Canonical slug set of PUBLISHED posts. Enumerated from the English directory
 * — `en` is the source of truth for which posts exist. Drafts (`draft: true`)
 * are excluded so they are never statically generated, listed, or indexed.
 * Translated locales may be missing individual files; those fall back to the
 * English version at read time.
 */
export function getPostSlugs(): string[] {
  const dir = localeDir(DEFAULT_LOCALE);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.mdx?$/, ""))
    .filter((slug) => !isDraft(slug));
}

/** Resolve the on-disk path for a slug in a locale, or null if absent. */
function resolveFile(locale: string, cleanSlug: string): string | null {
  const dir = localeDir(locale);
  const mdxPath = path.join(dir, `${cleanSlug}.mdx`);
  const mdPath = path.join(dir, `${cleanSlug}.md`);
  if (fs.existsSync(mdxPath)) return mdxPath;
  if (fs.existsSync(mdPath)) return mdPath;
  return null;
}

/**
 * Load a post for `locale`, falling back to the English version when the
 * translated file is missing — so the blog never 404s in a locale that has
 * not been fully translated yet.
 */
export function getPostBySlug(
  slug: string,
  locale: string = DEFAULT_LOCALE,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
): BlogPost | null {
  const cleanSlug = slug.replace(/\.mdx?$/, "");

  // Drafts are unpublished: treat them as absent unless explicitly requested,
  // so a direct URL 404s even when rendered on demand (not just at build time).
  if (!includeDrafts && isDraft(cleanSlug)) return null;

  const filePath =
    resolveFile(locale, cleanSlug) ??
    (locale !== DEFAULT_LOCALE
      ? resolveFile(DEFAULT_LOCALE, cleanSlug)
      : null);

  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug: cleanSlug,
    title: typeof data.title === "string" ? data.title : cleanSlug,
    date: typeof data.date === "string" ? data.date : new Date().toISOString(),
    excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
    cover: typeof data.cover === "string" ? data.cover : undefined,
    tag: data.tag as BlogTag | undefined,
    updated: typeof data.updated === "string" ? data.updated : undefined,
    author: typeof data.author === "string" ? data.author : undefined,
    draft: data.draft === true,
    content,
  };
}

// Curated, hand-ordered list of posts to feature on the homepage. Order here = display order.
export const HOMEPAGE_POSTS: string[] = [
  "internet-court-agentic-commerce",
  "press-release",
  "internet-court-use-cases",
  "launch-video",
];

export function getHomepagePosts(locale: string = DEFAULT_LOCALE): BlogPost[] {
  return HOMEPAGE_POSTS.map((slug) => getPostBySlug(slug, locale)).filter(
    (post): post is BlogPost => post !== null,
  );
}

export function getAllPosts(locale: string = DEFAULT_LOCALE): BlogPost[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug, locale))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function formatDate(
  iso: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
