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
  content: string;
};

const POSTS_DIR = path.join(process.cwd(), "src", "content", "blog");

export function getPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"))
    .map((file) => file.replace(/\.mdx?$/, ""));
}

export function getPostBySlug(slug: string): BlogPost | null {
  const cleanSlug = slug.replace(/\.mdx?$/, "");
  const mdxPath = path.join(POSTS_DIR, `${cleanSlug}.mdx`);
  const mdPath = path.join(POSTS_DIR, `${cleanSlug}.md`);
  const filePath = fs.existsSync(mdxPath)
    ? mdxPath
    : fs.existsSync(mdPath)
      ? mdPath
      : null;

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
    content,
  };
}

export function getAllPosts(): BlogPost[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
