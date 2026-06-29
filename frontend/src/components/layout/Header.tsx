import { getTranslations } from "next-intl/server";
import { Github, Send } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TELEGRAM_URL, X_URL } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { MastheadLangToggle } from "@/components/layout/MastheadLangToggle";

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

/**
 * Quiet uppercase-mono nav link with an animated red underline that wipes in
 * from the left on hover/focus. Shared by the desktop (left column) and the
 * mobile (reflowed below) navigation.
 */
const navLinkClasses =
  "relative font-mono text-[11px] uppercase tracking-[0.2em] text-[#4d4944] transition-colors duration-200 after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-[#dc2626] after:transition-transform after:duration-200 hover:text-[#dc2626] hover:after:scale-x-100 focus-visible:outline-none focus-visible:text-[#dc2626] focus-visible:after:scale-x-100";

const socialLinkClasses =
  "group inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4d4944] transition-colors duration-200 hover:bg-[var(--accent-red-soft)] hover:text-[#dc2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f7f7]";

const socials = [
  {
    key: "telegram",
    href: TELEGRAM_URL,
    icon: <Send size={15} strokeWidth={1.7} />,
  },
  {
    key: "x",
    href: X_URL,
    icon: <XMark className="h-[13px] w-[13px]" />,
  },
  {
    key: "github",
    href: GITHUB_URL,
    icon: <Github size={15} strokeWidth={1.7} />,
  },
] as const;

const nav = [
  { key: "blog" as const, href: "/blog" as const },
  { key: "faq" as const, href: "/faq" as const },
];

/**
 * Header — "Centered masthead".
 *
 * A law-review / journal masthead: the wordmark is centered between two
 * balanced columns (quiet nav links left, social marks right), framed by a thin
 * hairline above and a doubled rule below. Language is a tiny, unobtrusive
 * corner toggle hung in the top rule. On small screens the nav reflows centered
 * beneath the masthead.
 */
export async function Header() {
  const t = await getTranslations();

  return (
    <header className="relative z-50 px-4 pt-5">
      <div className="mx-auto max-w-[1200px] px-1">
        {/* top hairline */}
        <div className="h-px bg-[#1a1817]/15" />

        {/* three-column masthead: nav · wordmark · socials */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-3">
          {/* left — quiet nav */}
          <nav className="hidden items-center gap-7 sm:flex">
            {nav.map((item) => (
              <Link key={item.key} href={item.href} className={navLinkClasses}>
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </nav>
          <span aria-hidden="true" className="sm:hidden" />

          {/* center — wordmark */}
          <Link
            href="/"
            aria-label={t("nav.homeAriaLabel")}
            className="mx-auto flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f7f7]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt={t("nav.logoAlt")}
              className="h-[29px] w-[160px] md:w-[220px]"
            />
          </Link>

          {/* right — socials + language */}
          <div className="flex items-center justify-end gap-1">
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
            {/* thin hairline divider, then the language toggle, inline with socials */}
            <span
              aria-hidden="true"
              className="mx-1.5 h-4 w-px bg-[#1a1817]/15"
            />
            <MastheadLangToggle />
          </div>
        </div>

        {/* bottom hairline — doubled rule for a printed-journal feel */}
        <div className="space-y-[3px]">
          <div className="h-px bg-[#1a1817]/15" />
          <div className="h-px bg-[#1a1817]/10" />
        </div>

        {/* small-screen nav slips below the masthead, centered */}
        <nav className="flex items-center justify-center gap-6 pt-2.5 sm:hidden">
          {nav.map((item) => (
            <Link key={item.key} href={item.href} className={navLinkClasses}>
              {t(`nav.${item.key}`)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
