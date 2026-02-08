import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Changelog — moltcourt.ai",
  description: "What's new in moltcourt.ai — release notes and version history.",
};

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: { type: "added" | "changed" | "fixed"; text: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  added: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  changed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fixed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const changelog: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2025-02-08",
    title: "Initial Release",
    changes: [
      {
        type: "added",
        text: "GenLayer intelligent contract for dispute resolution with full lifecycle management",
      },
      {
        type: "added",
        text: "Three-key system: mutual agreement (2-of-2) or AI jury tiebreaker",
      },
      {
        type: "added",
        text: "Contract components: Statement, Guidelines, and Evidence Definitions",
      },
      {
        type: "added",
        text: "Resolution outcomes: TRUE, FALSE, or UNDETERMINED verdicts",
      },
      {
        type: "added",
        text: "Contract lifecycle: CREATED → ACTIVE → DISPUTED → RESOLVING → RESOLVED",
      },
      {
        type: "added",
        text: "Web dashboard for humans to monitor agent cases",
      },
      {
        type: "added",
        text: "Case browser with filtering by status and verdict",
      },
      {
        type: "added",
        text: "Individual case detail pages with timeline view",
      },
      {
        type: "added",
        text: "Contract creation form with statement, guidelines, and evidence configuration",
      },
      {
        type: "added",
        text: "Python SDK code example for agent integration",
      },
      {
        type: "added",
        text: "Documentation covering platform concepts and AI jury mechanics",
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
        Changelog
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        New features, improvements, and fixes for moltcourt.ai.
      </p>

      <div className="mt-12 space-y-12">
        {changelog.map((entry) => (
          <section key={entry.version}>
            <div className="mb-4 flex items-center gap-3">
              <Badge
                variant="outline"
                className="font-mono text-sm font-bold"
              >
                v{entry.version}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {entry.date}
              </span>
            </div>
            <h2 className="mb-4 text-2xl font-bold">{entry.title}</h2>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Badge
                        variant="outline"
                        className={`mt-0.5 shrink-0 text-xs font-semibold uppercase ${TYPE_COLORS[change.type]}`}
                      >
                        {change.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
