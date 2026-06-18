import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getAllPosts, getPostBySlug, formatDate } from "@/lib/blog";
import { mdxComponents } from "@/components/blog/mdx-components";
import { TagBadge } from "@/components/blog/TagBadge";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Internet Court`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      type: "article",
      images: [post.cover ?? "/og-image.jpg"],
    },
    twitter: {
      title: post.title,
      description: post.excerpt,
      images: [post.cover ?? "/og-image.jpg"],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-4 md:py-24">
      <Link
        href="/blog"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-[#dc2626] transition-colors"
      >
        ← Back to Blog
      </Link>

      <header className="mt-8 mb-10 flex flex-col gap-4 border-b border-border pb-10">
        <div className="flex items-center gap-3">
          {post.tag && <TagBadge tag={post.tag} />}
          <time className="font-mono text-xs text-muted-foreground">
            {formatDate(post.date)}
          </time>
        </div>
        <h1 className="font-heading text-4xl leading-[1.1] md:text-5xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
      </header>

      <div className="prose-none">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </div>
    </article>
  );
}
