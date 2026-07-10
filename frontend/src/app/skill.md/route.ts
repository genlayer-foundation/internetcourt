import { NextResponse } from "next/server";

/**
 * `/skill.md` proxies the canonical Internet Court skill straight from its
 * source repo, so the published skill is ALWAYS the latest instead of a
 * hand-synced static copy that silently drifts (which is what it used to be).
 *
 * Source of truth: github.com/internet-court/internet-court-skill (SKILL.md on
 * main), also linked from the homepage skill card.
 *
 * Caching (no external store needed):
 *  - The upstream fetch is cached in Next's data cache and revalidated every 5
 *    minutes, so a `curl` almost never hits GitHub on the hot path.
 *  - The HTTP response is cached at the CDN (`s-maxage`) with a long
 *    stale-while-revalidate window, so a brief GitHub blip never takes
 *    `/skill.md` down and repeat reads are served from the edge.
 *
 * Read analytics: Vercel Observability logs every request to this route (path,
 * user-agent, country, status) at the edge, even when served from the CDN
 * cache, so read counts and breakdowns are available with no database. A durable
 * custom counter (e.g. Upstash Redis) can be layered on later if exact,
 * permanent totals are wanted.
 */

const CANONICAL_SKILL_URL =
  "https://raw.githubusercontent.com/internet-court/internet-court-skill/main/SKILL.md";
const CANONICAL_SKILL_HTML =
  "https://github.com/internet-court/internet-court-skill/blob/main/SKILL.md";

const REVALIDATE_SECONDS = 300;

export async function GET() {
  let upstream: Response;
  try {
    upstream = await fetch(CANONICAL_SKILL_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "text/plain, text/markdown, */*" },
    });
  } catch {
    return new NextResponse(
      `Could not reach the canonical skill source. See ${CANONICAL_SKILL_HTML}\n`,
      { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (!upstream.ok) {
    return new NextResponse(
      `Canonical skill source returned ${upstream.status}. See ${CANONICAL_SKILL_HTML}\n`,
      { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}
