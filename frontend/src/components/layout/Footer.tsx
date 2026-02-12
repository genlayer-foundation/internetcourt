import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <img src="/logos/tic-logo-red.svg" alt="InternetCourt" className="h-5 w-auto" />
          <span className="text-border">&mdash;</span>
          <span>The Court for the Agent Economy</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/cases" className="hover:text-foreground transition-colors">
            Cases
          </Link>
          <Link href="/create" className="hover:text-foreground transition-colors">
            Create
          </Link>
          <a
            href="https://github.com/internetcourt"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>
        <a
          href="https://genlayer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Powered by</span>
          <Image
            src="/logos/genlayer-reference/genlayer-full-logo.svg"
            alt="GenLayer"
            width={89}
            height={22}
            className="opacity-50 transition-opacity hover:opacity-80"
          />
        </a>
      </div>
    </footer>
  );
}
