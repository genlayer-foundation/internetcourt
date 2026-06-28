import { ImageResponse } from "next/og";
import { getPostSlugs, getPostBySlug } from "@/lib/blog";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams(): { slug: string }[] {
  return getPostSlugs().map((slug) => ({ slug }));
}

const INK = "#1a1817";
const RED = "#dc2626";
const PAPER = "#f5f3ef";
const MUTED = "#a8a29e";

type Params = { locale: string; slug: string };

export default async function OpengraphImage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);

  const title = post?.title ?? "Internet Court";
  const tag = post?.tag;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          backgroundColor: INK,
          padding: "80px",
          color: PAPER,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {tag ? (
            <div
              style={{
                display: "flex",
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: RED,
              }}
            >
              {tag}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 60 ? "64px" : "80px",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "30px",
            fontWeight: 600,
            color: MUTED,
          }}
        >
          internetcourt.org
        </div>
      </div>
    ),
    { ...size },
  );
}
