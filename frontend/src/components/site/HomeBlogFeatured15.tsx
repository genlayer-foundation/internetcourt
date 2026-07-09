import Link from "next/link";
import { RiArrowRightLine } from "@/components/icons/remix";
import { type BlogPost } from "@/lib/blog";

/**
 * "Briefings from the court" (Pablo's Figma card layout): tinted section band
 * with a header row (eyebrow + H2 left, "All posts" pill right) over a card
 * row: one large featured card (flex-1) and a 378px column of three small
 * cards. Cards sit on near-white `#fafafa` surfaces with a subtle hover shift;
 * dates live in small tinted chips. No red rules or hairline dividers.
 */

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function HomeBlogFeatured15({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  const lead = posts[0];
  const rest = posts.slice(1);

  return (
    <section className="bg-[#f4f3ee]">
      <div className="mx-auto max-w-[1024px] px-4 py-14">
        {/* Header row: eyebrow + H2 left, "All posts" pill right */}
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#dc2626]">
              Dispatches
            </div>
            <h2 className="pt-2 font-sans text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-[#1c1a16] md:text-4xl">
              Briefings from the court
            </h2>
          </div>
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 rounded-full bg-[#ebe9e0] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.16em] text-[#1c1a16] transition-colors hover:text-[#dc2626]"
          >
            All posts
            <RiArrowRightLine
              size={12}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* Card row: featured card + 378px column of small cards */}
        <div className="flex flex-col gap-3 pt-8 lg:flex-row">
          {/* Featured card */}
          <Link
            href={`/blog/${lead.slug}`}
            className="flex-1 self-stretch rounded-xl bg-[#fafafa] p-6 transition-colors duration-200 hover:bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              {lead.tag ? (
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#dc2626]">
                  {lead.tag}
                </span>
              ) : (
                <span aria-hidden />
              )}
              <span className="rounded bg-[#f4f3ee] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#6c665a]">
                {formatShortDate(lead.date)}
              </span>
            </div>
            <h3 className="pt-3 font-sans text-2xl font-semibold leading-[1.32] tracking-[-0.03em] text-[#1c1a16] md:text-[2rem]">
              {lead.title}
            </h3>
            {lead.excerpt && (
              <p className="pt-3 text-base leading-[26px] text-[#6c665a]">
                {lead.excerpt}
              </p>
            )}
          </Link>

          {/* Small cards column */}
          {rest.length > 0 && (
            <div className="flex w-full flex-col justify-center gap-3 lg:w-[378px] lg:shrink-0">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-xl bg-[#fafafa] p-3 transition-colors duration-200 hover:bg-white"
                >
                  <div className="p-3">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                      {post.tag && (
                        <span className="text-[#dc2626]">{post.tag}</span>
                      )}
                      {post.tag && (
                        <span aria-hidden className="text-[#6c665a]">
                          ·
                        </span>
                      )}
                      <span className="text-[#6c665a]">
                        {formatShortDate(post.date)}
                      </span>
                    </div>
                    <h4 className="pt-1 font-sans text-lg font-semibold leading-[1.375] tracking-[-0.03em] text-[#1c1a16]">
                      {post.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
