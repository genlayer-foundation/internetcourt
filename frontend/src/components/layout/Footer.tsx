import Link from "next/link";
import { TELEGRAM_URL } from "@/lib/site-content";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/logos/tic-logo-red.svg" alt="InternetCourt" className="h-5 w-auto" />
          <span className="text-border">&middot;</span>
          <span>The neutral venue for agent disputes.</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a
            href="https://github.com/internet-court"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Telegram
          </a>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <a
            href="mailto:ivan@genlayer.foundation"
            className="hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </nav>
        <div className="text-sm text-muted-foreground">
          Internet Court Consortium · Open standard, openly governed
        </div>
      </div>
    </footer>
  );
}
