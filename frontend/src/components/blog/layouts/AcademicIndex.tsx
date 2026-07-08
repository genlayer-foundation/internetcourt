import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { formatDate, type BlogPost } from "@/lib/blog";

/**
 * Academic — a law-review table of contents. Single column, no cards.
 * Each entry is a ruled row: volume-style index number, title set in the
 * heading face (DM Sans SemiBold), mono dateline + register tag, and the excerpt
 * as an abstract. Thin border-t rules separate entries like a printed journal.
 */
export async function AcademicIndex({
  posts,
  locale,
}: {
  posts: BlogPost[];
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "blog" });

  if (posts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16">
        {t("index.empty")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-t-2 border-[#1c1a16]">
        {posts.map((post, i) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group grid grid-cols-[2.5rem_1fr] gap-x-5 border-b border-border py-8 transition-colors hover:bg-[#efe9da]/60"
          >
            <span className="font-mono text-sm text-muted-foreground tabular-nums pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {post.tag && (
                  <span className="text-[#dc2626]">{t(`tags.${post.tag}`)}</span>
                )}
                <span>{formatDate(post.date, locale)}</span>
              </div>
              <h3 className="font-heading text-2xl md:text-3xl leading-snug text-[#1c1a16] group-hover:text-[#dc2626] transition-colors">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="max-w-prose text-base leading-relaxed text-[#6c665a]">
                  {post.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
