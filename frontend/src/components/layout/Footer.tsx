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
      </div>
    </footer>
  );
}
