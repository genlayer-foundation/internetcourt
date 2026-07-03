import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { Link } from "@/i18n/routing";
import { getPostSlugs, getPostBySlug, formatDate } from "@/lib/blog";
import { mdxComponents } from "@/components/blog/mdx-components";
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
  setRequestLocale(locale);
  const post = getPostBySlug(slug, locale);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: "blog" });

  return (
    <article className="pb-16 md:pb-24">
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

      <header className="bg-[#f7f7f7]">
        <div className="mx-auto max-w-3xl px-5 pt-12 pb-10 md:px-4 md:pt-16 md:pb-12">
          <Link
            href="/blog"
            className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-[#dc2626] transition-colors"
          >
            {t("post.backToBlog")}
          </Link>

          <div className="relative mt-8 pl-6">
            <span
              aria-hidden
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-[3px] bg-[#dc2626]"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em]">
              {post.tag && (
                <span className="text-[#dc2626]">{t(`tags.${post.tag}`)}</span>
              )}
              {post.tag && (
                <span className="text-border" aria-hidden>
                  &middot;
                </span>
              )}
              <time className="text-muted-foreground">
                {formatDate(post.date, locale)}
              </time>
            </div>
            <h1 className="mt-3 font-heading text-[2.5rem] leading-[1.1] text-[#1a1817] md:text-[3.2rem]">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 max-w-prose text-lg leading-relaxed text-[#4d4944]">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="prose-none mx-auto max-w-3xl px-5 pt-4 md:px-4 md:pt-6">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
        />
      </div>
    </article>
  );
}
