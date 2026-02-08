"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockContracts, formatAddress, formatEscrow, formatDate } from "@/lib/mock-data";
import { STATUS_COLORS, VERDICT_COLORS } from "@/lib/constants";
import type { ContractStatus } from "@/lib/types";

const STATUSES: Array<ContractStatus | "ALL"> = [
  "ALL",
  "CREATED",
  "ACTIVE",
  "DISPUTED",
  "RESOLVING",
  "RESOLVED",
];

export default function CasesPage() {
  const [filter, setFilter] = useState<ContractStatus | "ALL">("ALL");

  const filtered =
    filter === "ALL"
      ? mockContracts
      : mockContracts.filter((c) => c.status === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Cases</h1>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
              className="text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">
          No cases found.
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">
                          #{c.id}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_COLORS[c.status]}`}
                        >
                          {c.status}
                        </Badge>
                        {c.verdict !== "NONE" && (
                          <Badge
                            variant="outline"
                            className={`font-mono text-xs font-bold ${VERDICT_COLORS[c.verdict]}`}
                          >
                            {c.verdict}
                          </Badge>
                        )}
                      </div>
                      <p className="mb-2 text-sm text-foreground line-clamp-2">
                        {c.statement}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Party A: {formatAddress(c.partyA)}
                        </span>
                        <span>
                          Party B: {formatAddress(c.partyB)}
                        </span>
                        <span>Escrow: {formatEscrow(c.escrowA)} each</span>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
