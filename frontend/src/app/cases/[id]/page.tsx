import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getContract, formatAddress, formatEscrow, formatDate } from "@/lib/mock-data";
import { STATUS_COLORS, VERDICT_COLORS } from "@/lib/constants";
import type { ContractStatus } from "@/lib/types";

const STATUS_ORDER: ContractStatus[] = [
  "CREATED",
  "ACTIVE",
  "DISPUTED",
  "RESOLVING",
  "RESOLVED",
];

function StatusTimeline({ current }: { current: ContractStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {STATUS_ORDER.map((s, i) => {
        const isActive = i <= currentIdx;
        const isCurrent = s === current;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                isCurrent
                  ? STATUS_COLORS[s]
                  : isActive
                    ? "bg-muted text-foreground"
                    : "bg-muted/50 text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div
                className={`h-px w-4 ${
                  isActive ? "bg-foreground/30" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = getContract(id);

  if (!contract) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="font-mono text-lg text-muted-foreground">
          Case #{contract.id}
        </span>
        <Badge
          variant="outline"
          className={`text-xs ${STATUS_COLORS[contract.status]}`}
        >
          {contract.status}
        </Badge>
      </div>

      <StatusTimeline current={contract.status} />

      {/* Statement */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{contract.statement}</p>
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{contract.guidelines}</p>
        </CardContent>
      </Card>

      {/* Parties & Escrow */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party A</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-sm">{formatAddress(contract.partyA)}</p>
            <p className="text-xs text-muted-foreground">
              Escrow: {formatEscrow(contract.escrowA)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party B</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-sm">{formatAddress(contract.partyB)}</p>
            <p className="text-xs text-muted-foreground">
              Escrow: {formatEscrow(contract.escrowB)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Evidence Definitions */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Evidence Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Party A
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Types: {contract.evidenceDefA.allowedTypes.join(", ")}</p>
                <p>Max chars: {contract.evidenceDefA.maxChars.toLocaleString()}</p>
                <p>Constraints: {contract.evidenceDefA.constraints}</p>
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Party B
              </h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Types: {contract.evidenceDefB.allowedTypes.join(", ")}</p>
                <p>Max chars: {contract.evidenceDefB.maxChars.toLocaleString()}</p>
                <p>Constraints: {contract.evidenceDefB.constraints}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      {(contract.evidenceA || contract.evidenceB) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {contract.evidenceA && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Party A&apos;s Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contract.evidenceA}
                </p>
              </CardContent>
            </Card>
          )}
          {contract.evidenceB && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Party B&apos;s Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {contract.evidenceB}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Verdict */}
      {contract.verdict !== "NONE" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Verdict</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <Badge
                variant="outline"
                className={`font-mono text-sm font-bold ${VERDICT_COLORS[contract.verdict]}`}
              >
                {contract.verdict}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {contract.reasoning}
            </p>
            {contract.resolvedAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                Resolved: {formatDate(contract.resolvedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <p className="mt-6 text-xs text-muted-foreground">
        Created: {formatDate(contract.createdAt)}
      </p>
    </div>
  );
}
