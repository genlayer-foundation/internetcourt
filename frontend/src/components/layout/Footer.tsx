import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { TELEGRAM_URL } from "@/lib/site-content";

export async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/logos/tic-logo-red.svg" alt={t("logoAlt")} className="h-5 w-auto" />
          <span className="text-border">&middot;</span>
          <span>{t("tagline")}</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com/internet-court"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("github")}
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            {t("telegram")}
          </a>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            {t("blog")}
          </Link>
          <Link href="/faq" className="hover:text-foreground transition-colors">
            {t("faq")}
          </Link>
          <a
            href="mailto:ivan@genlayer.foundation"
            className="hover:text-foreground transition-colors"
          >
            {t("contact")}
          </a>
        </nav>
        <div className="text-sm text-muted-foreground">
          {t("consortium")}
        </div>
      </div>
    </footer>
  );
}
