import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/routing";
import { getPostSlugs, getPostBySlug, formatDate } from "@/lib/blog";
import { mdxComponents } from "@/components/blog/mdx-components";
import { TagBadge } from "@/components/blog/TagBadge";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildAlternates, localizedUrl } from "@/lib/i18n-metadata";
import { articleSchema, breadcrumbListSchema } from "@/lib/structured-data";

type Params = { locale: string; slug: string };

export function generateStaticParams(): { slug: string }[] {
  // Enumerate slugs from the canonical English set. Each locale resolves the
  // same slug at render time, falling back to the English file when missing.
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);
  if (!post) return {};

  const t = await getTranslations({ locale, namespace: "blog.metadata" });
  const title = t("postTitleTemplate", { title: post.title });

  return {
    title,
    description: post.excerpt,
    alternates: buildAlternates(`/blog/${post.slug}`, locale),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: localizedUrl(`/blog/${post.slug}`, locale),
      type: "article",
      // Image intentionally omitted so the file-based `opengraph-image.tsx`
      // in this route auto-wires og:image (and twitter:image) and wins.
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      // Image intentionally omitted — the file-based opengraph-image provides
      // the twitter:image automatically; we don't fight it here.
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "blog" });

  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-4 md:py-24">
      <JsonLd
        data={[
          articleSchema(post, locale),
          breadcrumbListSchema(
            [
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ],
            locale,
          ),
        ]}
      />
      <Link
        href="/blog"
        className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-[#dc2626] transition-colors"
      >
        {t("post.backToBlog")}
      </Link>

      <header className="mt-8 mb-10 flex flex-col gap-4 border-b border-border pb-10">
        <div className="flex items-center gap-3">
          {post.tag && <TagBadge tag={post.tag} label={t(`tags.${post.tag}`)} />}
          <time className="font-mono text-xs text-muted-foreground">
            {formatDate(post.date, locale)}
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
