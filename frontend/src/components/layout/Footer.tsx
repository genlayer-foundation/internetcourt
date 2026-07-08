import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { TELEGRAM_URL } from "@/lib/site-content";

/**
 * Footer (Pablo's Figma frame): four flat columns on the paper background, no
 * top hairline. Col 1: red wordmark over the tagline. Col 2: site links
 * (Blog, FAQ, Contact). Col 3: external links (GitHub, Telegram; X lives in
 * the header only). Col 4: the consortium line. Columns stack on mobile.
 */
export async function Footer() {
  const t = await getTranslations("footer");

  const linkClasses = "transition-colors hover:text-foreground";

  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:flex-row md:items-start md:justify-between md:gap-6">
        {/* Col 1: wordmark + tagline */}
        <div className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/tic-logo-red.svg"
            alt={t("logoAlt")}
            className="h-5 w-auto self-start"
          />
          <p className="text-sm text-[#6c665a]">{t("tagline")}</p>
        </div>

        {/* Col 2: site links */}
        <nav className="flex flex-col gap-6 text-sm text-[#6c665a]">
          <Link href="/blog" className={linkClasses}>
            {t("blog")}
          </Link>
          <Link href="/faq" className={linkClasses}>
            {t("faq")}
          </Link>
          <a href="mailto:ivan@genlayer.foundation" className={linkClasses}>
            {t("contact")}
          </a>
        </nav>

        {/* Col 3: external links */}
        <nav className="flex flex-col gap-6 text-sm text-[#6c665a]">
          <a
            href="https://github.com/internet-court"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {t("github")}
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClasses}
          >
            {t("telegram")}
          </a>
        </nav>

        {/* Col 4: consortium line */}
        <p className="text-sm text-[#6c665a] md:w-[382px]">{t("consortium")}</p>
      </div>
    </footer>
  );
}
