import { getTranslations } from "next-intl/server";
import { Github, Send } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TELEGRAM_URL, X_URL } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";

const GITHUB_URL = "https://github.com/internet-court";

/** Official X (formerly Twitter) brand mark — lucide ships no clean glyph for it. */
function XMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
    </svg>
  );
}

const socialLinkClasses =
  "group inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]";

const socials = [
  {
    key: "telegram",
    href: TELEGRAM_URL,
    icon: <Send size={17} strokeWidth={1.75} className="transition-transform duration-200 group-hover:-translate-y-px" />,
  },
  {
    key: "x",
    href: X_URL,
    icon: <XMark className="h-[15px] w-[15px]" />,
  },
  {
    key: "github",
    href: GITHUB_URL,
    icon: <Github size={17} strokeWidth={1.75} />,
  },
] as const;

export async function Header() {
  const t = await getTranslations();

  return (
    <header className="relative z-50 px-4 pt-4">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 rounded-[12px] border border-border/70 bg-[#f7f7f7] px-3 py-2 sm:pl-4 sm:pr-3">
        <Link
          href="/"
          aria-label={t("nav.homeAriaLabel")}
          className="flex min-w-0 shrink items-center gap-2 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/tic-logo-red.svg"
            alt={t("nav.logoAlt")}
            className="h-[29px] w-[160px] md:w-[220px]"
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Blog — primary destination, mono uppercase pill that lights up red on hover. */}
          <Link
            href="/blog"
            className={cn(
              "inline-flex h-9 items-center rounded-full border border-border/80 bg-white px-3.5",
              "font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80",
              "transition-colors duration-200 hover:border-[var(--accent-red-border)] hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]",
            )}
          >
            {t("nav.blog")}
          </Link>

          {/* Language switcher — compact globe pill, native to the header. */}
          <LocaleSwitcher />

          {/* Hairline divider between primary nav and the social cluster. */}
          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-border/80 sm:block"
          />

          <div className="flex items-center gap-0.5">
            {socials.map((social) => (
              <a
                key={social.key}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(`social.${social.key}`)}
                className={socialLinkClasses}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
