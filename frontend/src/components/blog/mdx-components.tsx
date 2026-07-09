import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { RiDoubleQuotesL } from "@/components/icons/remix";
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
      <Link href={href} className={classes} {...props}>
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
    <h1 className="relative mt-14 mb-5 pl-6 font-heading text-[2.1rem] leading-[1.1] text-[#1c1a16] md:text-[2.5rem]">
      <span
        aria-hidden
        className="absolute left-0 top-1 h-[calc(100%-0.4rem)] w-[3px] bg-[#dc2626]"
      />
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="relative mt-14 mb-4 pl-6 font-heading text-[1.75rem] leading-[1.12] text-[#1c1a16] md:text-[2rem]">
      <span
        aria-hidden
        className="absolute left-0 top-1 h-[calc(100%-0.4rem)] w-[3px] bg-[#dc2626]"
      />
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="relative mt-14 mb-4 pl-6 font-heading text-[1.45rem] leading-[1.18] text-[#1c1a16] md:text-[1.65rem]">
      <span
        aria-hidden
        className="absolute left-0 top-1 h-[calc(100%-0.4rem)] w-[3px] bg-[#dc2626]"
      />
      {children}
    </h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="my-5 text-base md:text-lg leading-relaxed text-[#6c665a]">
      {children}
    </p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-5 list-disc pl-6 space-y-2 text-base md:text-lg leading-relaxed text-[#6c665a] marker:text-[#dc2626]">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-5 list-decimal pl-6 space-y-2 text-base md:text-lg leading-relaxed text-[#6c665a] marker:text-[#dc2626]">
      {children}
    </ol>
  ),
  li: ({ children, ...props }: ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="relative my-10 rounded-lg bg-black/[0.035] py-5 pr-6 pl-[3.9rem] md:pl-[4.2rem] [&>p]:my-0 [&>p]:italic [&>p]:text-[1.3rem] [&>p]:md:text-[1.45rem] [&>p]:leading-[1.35] [&>p]:text-[#1c1a16] [&>p+p]:mt-4">
      <RiDoubleQuotesL className="absolute left-4 top-[1.15rem] h-7 w-7 text-[#dc2626] md:left-5 md:h-8 md:w-8" />
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-[#1c1a16]">{children}</strong>
  ),
  code: ({ children, className }: ComponentPropsWithoutRef<"code">) => (
    <code
      className={cn(
        "font-mono text-[0.875em] rounded bg-[#efe9da] border border-border px-1.5 py-0.5 text-[#1c1a16]",
        className,
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-[#efe9da] border border-border p-4 font-mono text-sm leading-relaxed [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">
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
