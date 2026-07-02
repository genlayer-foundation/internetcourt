import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/site/VideoPlayer";

type VideoProps = {
  src: string;
  poster?: string;
  caption?: string;
};

function Video({ src, poster, caption }: VideoProps) {
  return (
    <div className="my-8 not-prose">
      <VideoPlayer src={src} poster={poster} caption={caption} />
    </div>
  );
}

function Anchor({
  href,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"a">) {
  const isInternal = href?.startsWith("/") || href?.startsWith("#");
  const classes = cn(
    "text-[#dc2626] underline decoration-[#dc2626]/40 underline-offset-2 hover:decoration-[#dc2626] transition-colors",
    className,
  );
  if (isInternal && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={classes}
      {...props}
    >
      {children}
    </a>
  );
}

export const mdxComponents = {
  Video,
  a: Anchor,
  h1: ({ children }: { children?: ReactNode }) => (
    <h1 className="font-display text-[2.1rem] md:text-5xl leading-[1.08] tracking-[-0.02em] text-[#1a1817] mt-12 mb-5">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="font-display text-3xl md:text-[2.5rem] leading-[1.12] tracking-[-0.015em] text-[#1a1817] mt-14 mb-4">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="relative font-display text-2xl md:text-[1.7rem] leading-[1.2] tracking-[-0.01em] text-[#1a1817] mt-11 mb-3 pt-4 before:absolute before:left-0 before:top-0 before:h-[3px] before:w-9 before:rounded-full before:bg-[#dc2626] before:content-['']">
      {children}
    </h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-5 text-base md:text-lg leading-relaxed text-[#4d4944]">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-5 list-disc pl-6 space-y-2 text-base md:text-lg leading-relaxed text-[#4d4944] marker:text-[#dc2626]">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-5 list-decimal pl-6 space-y-2 text-base md:text-lg leading-relaxed text-[#4d4944] marker:text-[#dc2626]">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="pl-1">{children}</li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="relative my-10 border-l-2 border-[#dc2626] pl-7 pr-2 py-1 before:absolute before:-left-[3px] before:-top-4 before:font-quote before:text-[5rem] before:leading-none before:text-[#dc2626]/25 before:content-['\201C'] before:pointer-events-none [&>p]:my-0 [&>p]:font-quote [&>p]:italic [&>p]:font-light [&>p]:text-[1.4rem] [&>p]:md:text-[1.6rem] [&>p]:leading-[1.45] [&>p]:tracking-[0.005em] [&>p]:text-[#1a1817] [&>p+p]:mt-4">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-[#1a1817]">{children}</strong>
  ),
  code: ({ children, className }: ComponentPropsWithoutRef<"code">) => (
    <code
      className={cn(
        "font-mono text-[0.875em] rounded bg-[#f7f7f7] border border-border px-1.5 py-0.5 text-[#1a1817]",
        className,
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-[#f7f7f7] border border-border p-4 font-mono text-sm leading-relaxed [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  img: ({ src, alt }: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : undefined}
      alt={alt ?? ""}
      className="my-8 w-full rounded-xl border border-border"
    />
  ),
};
