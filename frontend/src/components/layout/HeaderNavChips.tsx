"use client";

import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAV = [
  { key: "blog", href: "/blog" },
  { key: "faq", href: "/faq" },
] as const;

/**
 * Header nav chips (BLOG / FAQ): mono uppercase pills that are transparent by
 * default and fill with the warm chip tint on hover and for the ACTIVE route
 * (client component so it can read the locale-agnostic pathname). Labels are
 * translated server-side and passed in.
 */
export function HeaderNavChips({
  labels,
  className,
}: {
  labels: Record<(typeof NAV)[number]["key"], string>;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-xl px-5 py-2 font-mono text-base leading-5 uppercase text-[#1c1a16]",
              "transition-colors duration-200 hover:bg-[#ebe9e0]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ec]",
              active && "bg-[#ebe9e0]",
            )}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
