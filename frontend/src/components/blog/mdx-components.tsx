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
    <h1 className="font-heading text-3xl md:text-4xl leading-tight mt-12 mb-5">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="font-heading text-2xl md:text-3xl leading-tight mt-10 mb-4">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="font-heading text-xl md:text-2xl leading-tight mt-8 mb-3">
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
    <blockquote className="my-7 border-l-2 border-[#dc2626] pl-5 italic text-[#4d4944]">
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
