import { getTranslations } from "next-intl/server";
import { Github, Send } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TELEGRAM_URL, X_URL } from "@/lib/site-content";
import { HeaderNavChips } from "@/components/layout/HeaderNavChips";
import { MastheadLangToggle } from "@/components/layout/MastheadLangToggle";

const GITHUB_URL = "https://github.com/internet-court";

/** Official X (formerly Twitter) brand mark: lucide ships no clean glyph for it. */
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
 * Square icon chip for the social links: 36x36, warm chip fill, rounded 12px,
 * ink icon that warms to brand red on hover.
 */
const socialChipClasses =
  "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ebe9e0] text-[#1c1a16] transition-colors duration-200 hover:text-[#dc2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ec]";

const socials = [
  {
    key: "telegram",
    href: TELEGRAM_URL,
    icon: <Send size={20} strokeWidth={1.7} />,
  },
  {
    key: "github",
    href: GITHUB_URL,
    icon: <Github size={20} strokeWidth={1.7} />,
  },
  {
    key: "x",
    href: X_URL,
    icon: <XMark className="h-[18px] w-[18px]" />,
  },
] as const;

/**
 * Header: chip bar (Pablo's Figma frame).
 *
 * A single 1200px row directly on the paper background (no hairline rules):
 * BLOG/FAQ nav chips on the left, the red TIC logotype centered (32px tall),
 * and on the right the three social icon chips (Telegram, GitHub, X) plus the
 * language-toggle chip. Chips share the 12px radius and warm `#ebe9e0` fill
 * (transparent-until-hover for the text chips, always filled for the icon
 * squares). On small screens the logo centers on its own row and the chips
 * reflow centered beneath it.
 */
export async function Header() {
  const t = await getTranslations();

  const navLabels = { blog: t("nav.blog"), faq: t("nav.faq") };

  const socialChips = socials.map((social) => (
    <a
      key={social.key}
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(`social.${social.key}`)}
      className={socialChipClasses}
    >
      {social.icon}
    </a>
  ));

  return (
    <header className="relative z-50 px-4 py-5 md:py-6">
      <div className="mx-auto max-w-[1200px]">
        {/* Bar: three zones on md+ (nav / logo / socials+language); on small
            screens only the centered logo remains here. */}
        <div className="flex items-center justify-center md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <HeaderNavChips
            labels={navLabels}
            className="hidden items-center justify-start gap-2 md:flex"
          />

          {/* center: logotype */}
          <Link
            href="/"
            aria-label={t("nav.homeAriaLabel")}
            className="mx-auto flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f4ec]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/tic-logo-red.svg"
              alt={t("nav.logoAlt")}
              className="h-7 w-auto md:h-8"
            />
          </Link>

          <div className="hidden items-center justify-end gap-2 md:flex">
            {socialChips}
            <MastheadLangToggle />
          </div>
        </div>

        {/* small-screen chip row: nav + socials + language, centered */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:hidden">
          <HeaderNavChips labels={navLabels} className="flex items-center gap-2" />
          {socialChips}
          <MastheadLangToggle />
        </div>
      </div>
    </header>
  );
}
