import Link from "next/link";
import { type BlogPost } from "@/lib/blog";

/**
 * Variant 15 — "Comfortable" (max-w-5xl, the roomy end of the narrow band).
 * Lead at left (~60%) with the red vertical rule + 2-line excerpt; secondaries
 * at right (~40%) as rows with a subtle hover background. Still narrower than
 * the full-bleed max-w-6xl. py-12 / md:py-14.
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
    <section className="bg-[#f7f7f7]">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-14">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#dc2626]">
              Dispatches
            </div>
            <h2 className="mt-2 font-heading text-3xl leading-[1.05] text-[#1a1817] md:text-4xl">
              Briefings from the court
            </h2>
          </div>
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-[#1a1817] transition-colors hover:text-[#dc2626]"
          >
            All posts
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
            >
              &rarr;
            </span>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-7 lg:grid-cols-[3fr_2fr]">
          {/* Lead — ~60%, red vertical rule + 2-line excerpt */}
          <Link href={`/blog/${lead.slug}`} className="group relative block pl-6">
            <span
              aria-hidden
              className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-[3px] bg-[#dc2626]"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.16em]">
              {lead.tag && <span className="text-[#dc2626]">{lead.tag}</span>}
              {lead.tag && (
                <span className="text-border" aria-hidden>
                  ·
                </span>
              )}
              <span className="text-muted-foreground">
                {formatShortDate(lead.date)}
              </span>
            </div>
            <h3 className="mt-3 font-heading text-[2.1rem] leading-[1.1] text-[#1a1817] transition-colors duration-300 group-hover:text-[#dc2626] md:text-[2.4rem]">
              {lead.title}
            </h3>
            {lead.excerpt && (
              <p className="mt-3 line-clamp-2 max-w-prose text-base leading-relaxed text-[#4d4944]">
                {lead.excerpt}
              </p>
            )}
          </Link>

          {/* Secondaries — ~40%, rows with subtle hover background */}
          {rest.length > 0 && (
            <div className="flex flex-col justify-center gap-1 lg:border-l lg:border-border lg:pl-8">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group -mx-3 block rounded-lg px-3 py-3 transition-colors hover:bg-black/[0.035]"
                >
                  <div className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {post.tag && <span className="text-[#dc2626]">{post.tag}</span>}
                    {post.tag && <span aria-hidden>·</span>}
                    <span>{formatShortDate(post.date)}</span>
                  </div>
                  <h4 className="mt-1 font-heading text-lg leading-snug text-[#1a1817] transition-colors duration-300 group-hover:text-[#dc2626]">
                    {post.title}
                  </h4>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
