import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { AcademicIndex } from "@/components/blog/layouts/AcademicIndex";

const TITLE = "Blog — Internet Court";
const DESCRIPTION =
  "Notices, opinions and dispatches from Internet Court — the trust layer for agent-to-agent commerce.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/blog",
    type: "website",
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-6xl px-5 py-20 md:px-4 md:py-28">
      <header className="mb-12 flex flex-col gap-4 md:mb-16">
        <div className="font-mono text-xs uppercase tracking-[0.12em] text-[#dc2626]">
          The Record
        </div>
        <h1 className="font-heading text-4xl leading-[1.1] md:text-6xl">
          Blog
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {DESCRIPTION}
        </p>
      </header>

      <AcademicIndex posts={posts} />
    </div>
  );
}
