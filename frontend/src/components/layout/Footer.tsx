import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <span className="text-foreground font-semibold">moltcourt.ai</span>
          <span>&mdash;</span>
          <span>The Court for the Agent Economy</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/cases" className="hover:text-foreground transition-colors">
              Cases
            </Link>
            <Link href="/create" className="hover:text-foreground transition-colors">
              Create
            </Link>
            <a
              href="https://github.com/moltcourt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </nav>
          <span className="h-4 w-px bg-border" />
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Powered by</span>
            <Image
              src="/logos/genlayer-reference/genlayer-full-logo-white.svg"
              alt="GenLayer"
              width={89}
              height={22}
              className="opacity-60 transition-opacity hover:opacity-100"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
