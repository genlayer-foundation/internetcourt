import { NextRequest, NextResponse } from "next/server";
import { parseAbi } from "viem";
import {
  publicClient,
  FACTORY_ABI,
  AGREEMENT_ABI,
  STATUS_NAMES,
  VERDICT_NAMES,
} from "@/lib/contracts";
import { FACTORY_REGISTRY } from "@/lib/constants";

const TRADEFX_ABI = parseAbi([
  "function exporter() view returns (address)",
  "function importer() view returns (address)",
  "function shipmentStatement() view returns (string)",
  "function fundedAmount() view returns (uint256)",
  "function shipmentStatus() view returns (uint8)",
  "function icCaseId() view returns (uint256)",
  "function status() view returns (uint8)",
]);

// TradeFx status: 0=DRAFT,1=RATE_PENDING,2=RATE_LOCKED,3=FUNDED,4=ROLL_PENDING,5=ROLLED,6=SETTLED,7=CANCELLED
// TradeFx shipmentStatus: 0=NONE,1=ACCEPTED,2=CONTESTED,3=TIMELY,4=LATE,5=UNDETERMINED
// Map to IC status: 0=CREATED,1=ACTIVE,2=DISPUTED,3=RESOLVING,4=RESOLVED,5=CANCELLED
function tradeFxStatusToIc(tfStatus: number, shipStatus: number): number {
  if (tfStatus === 7) return 5; // CANCELLED
  if (tfStatus === 6) return 4; // SETTLED → RESOLVED
  if (shipStatus === 2) return 3; // CONTESTED → RESOLVING
  if (tfStatus >= 3) return 2;   // FUNDED/ROLLED → DISPUTED (funded, in flight)
  return 1;                       // anything else → ACTIVE
}

// Map TradeFx shipmentStatus to verdict name
function shipStatusToVerdict(shipStatus: number): string {
  if (shipStatus === 3) return "PARTY A"; // TIMELY → exporter wins
  if (shipStatus === 4) return "PARTY B"; // LATE → importer wins
  if (shipStatus === 5) return "UNDETERMINED";
  return "";
}

/**
 * Find the factory that registered a given contract address.
 * Searches all registered factories in parallel; returns { factoryAddress, factoryLabel, caseId }.
 */
async function findInFactories(
  agreementAddress: string,
): Promise<{ factoryAddress: `0x${string}`; factoryLabel: string; caseId: number } | null> {
  const results = await Promise.all(
    FACTORY_REGISTRY.map(async (f) => {
      try {
        const nextId = Number(
          await publicClient.readContract({ address: f.address, abi: FACTORY_ABI, functionName: "nextAgreementId" })
        );
        const BATCH = 20;
        for (let start = 0; start < nextId; start += BATCH) {
          const ids = Array.from({ length: Math.min(BATCH, nextId - start) }, (_, i) => start + i);
          const addrs = await Promise.all(
            ids.map((i) => publicClient.readContract({ address: f.address, abi: FACTORY_ABI, functionName: "agreements", args: [BigInt(i)] }))
          );
          for (let i = 0; i < ids.length; i++) {
            if ((addrs[i] as string).toLowerCase() === agreementAddress.toLowerCase()) {
              return { factoryAddress: f.address, factoryLabel: f.label, caseId: ids[i] };
            }
          }
        }
      } catch { /* factory unreachable — skip */ }
      return null;
    })
  );
  return results.find((r) => r !== null) ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let agreementAddress: `0x${string}`;
    let caseId: number = -1;
    let factoryAddress: `0x${string}` = FACTORY_REGISTRY[0].address;
    let factoryLabel: string = FACTORY_REGISTRY[0].label;

    if (id.startsWith("0x") && id.length === 42) {
      agreementAddress = id as `0x${string}`;

      // Search all factories for this address
      const found = await findInFactories(agreementAddress);
      if (found) {
        caseId = found.caseId;
        factoryAddress = found.factoryAddress;
        factoryLabel = found.factoryLabel;
      }
      // caseId stays -1 if not found in any factory — still return contract data
    } else {
      caseId = parseInt(id, 10);
      if (isNaN(caseId) || caseId < 0) {
        return NextResponse.json({ error: "Invalid case ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }

      // Search factories in order for this numeric ID
      for (const f of FACTORY_REGISTRY) {
        try {
          const addr = await publicClient.readContract({
            address: f.address, abi: FACTORY_ABI, functionName: "agreements", args: [BigInt(caseId)],
          }) as string;
          if (addr && addr !== "0x0000000000000000000000000000000000000000") {
            agreementAddress = addr as `0x${string}`;
            factoryAddress = f.address;
            factoryLabel = f.label;
            break;
          }
        } catch { /* skip */ }
      }

      if (!agreementAddress!) {
        return NextResponse.json({ error: "Case not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      }
    }

    // Guard: contract must have code
    try {
      const bytecode = await publicClient.getBytecode({ address: agreementAddress });
      if (!bytecode || bytecode === "0x") {
        return NextResponse.json({ error: "Case not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      }
    } catch { /* proceed */ }

    // Multicall: try Agreement.sol fields + TradeFx fallbacks in one shot
    const addr = agreementAddress;
    const results = await publicClient.multicall({
      contracts: [
        // Agreement.sol fields [0–17]
        { address: addr, abi: AGREEMENT_ABI, functionName: "status" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "partyA" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "partyB" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "statement" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "guidelines" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceDefs" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceA" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceB" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceASubmitted" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceBSubmitted" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "verdict" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "reasoning" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "escrowAmount" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "joinDeadline" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "disputeTimestamp" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "maxEvidenceLength" },
        { address: addr, abi: AGREEMENT_ABI, functionName: "constraints" },
        // TradeFxSettlement fallbacks [18–24]
        { address: addr, abi: TRADEFX_ABI, functionName: "exporter" },
        { address: addr, abi: TRADEFX_ABI, functionName: "importer" },
        { address: addr, abi: TRADEFX_ABI, functionName: "shipmentStatement" },
        { address: addr, abi: TRADEFX_ABI, functionName: "fundedAmount" },
        { address: addr, abi: TRADEFX_ABI, functionName: "shipmentStatus" },
        { address: addr, abi: TRADEFX_ABI, functionName: "icCaseId" },
        { address: addr, abi: TRADEFX_ABI, functionName: "status" },
      ],
    });

    function get(i: number) {
      const r = results[i];
      return r.status === "success" ? r.result : null;
    }

    const isTradeFx = results[18].status === "success"; // exporter() succeeded

    let statusNum: number;
    let partyA: string;
    let partyB: string;
    let statement: string;
    let guidelines: string;
    let evidenceDefs: unknown;
    let evidenceA: string;
    let evidenceB: string;
    let evidenceASubmitted: boolean;
    let evidenceBSubmitted: boolean;
    let verdictNum: number;
    let verdictName: string;
    let reasoning: string;
    let escrowAmount: string;

    if (isTradeFx) {
      const tfStatus = Number(get(24) ?? 0);
      const shipStatus = Number(get(22) ?? 0);
      statusNum = tradeFxStatusToIc(tfStatus, shipStatus);
      partyA = (get(18) as string) ?? "";
      partyB = (get(19) as string) ?? "";
      statement = (get(20) as string) ?? "";
      guidelines =
        "Evaluate whether the shipment crossed Bolivian export customs at Desaguadero on or before the stated deadline. " +
        "Primary customs exit records take precedence over secondary gate records. " +
        "Return TIMELY (Party A wins), LATE (Party B wins), or UNDETERMINED.";
      evidenceDefs = {
        party_a: { description: "Customs exit receipt or equivalent crossing document" },
        party_b: { description: "Border gate event record" },
      };
      evidenceA = "";
      evidenceB = "";
      evidenceASubmitted = false;
      evidenceBSubmitted = false;
      const isResolved = statusNum === 4;
      verdictName = isResolved ? shipStatusToVerdict(shipStatus) : "";
      verdictNum = isResolved
        ? (verdictName === "PARTY A" ? 1 : verdictName === "PARTY B" ? 2 : 0)
        : -1;
      reasoning = isResolved
        ? `Shipment verdict: ${shipStatus === 3 ? "TIMELY" : shipStatus === 4 ? "LATE" : "UNDETERMINED"}. See docket for full AI jury reasoning.`
        : "";
      escrowAmount = ((get(21) as bigint) ?? BigInt(0)).toString();
    } else {
      // Standard Agreement.sol contract
      const rawStatus = Number(get(0) ?? 0);
      statusNum = rawStatus;
      partyA = (get(1) as string) ?? "";
      partyB = (get(2) as string) ?? "";
      statement = (get(3) as string) ?? "";
      guidelines = (get(4) as string) ?? "";
      evidenceDefs = get(5) ?? "";
      evidenceA = (get(6) as string) ?? "";
      evidenceB = (get(7) as string) ?? "";
      evidenceASubmitted = (get(8) as boolean) ?? false;
      evidenceBSubmitted = (get(9) as boolean) ?? false;
      const rawVerdict = Number(get(10) ?? 0);
      verdictNum = statusNum === 4 ? rawVerdict : -1;
      verdictName = statusNum === 4 ? (VERDICT_NAMES[verdictNum] || "UNDETERMINED") : "";
      reasoning = (get(11) as string) ?? "";
      escrowAmount = ((get(12) as bigint) ?? BigInt(0)).toString();
    }

    return NextResponse.json({
      id: caseId,
      address: agreementAddress,
      factoryAddress,
      factoryLabel,
      contractType: isTradeFx ? "TradeFxSettlement" : "Agreement",
      status: statusNum,
      statusName: STATUS_NAMES[statusNum] || "UNKNOWN",
      partyA,
      partyB,
      statement,
      guidelines,
      evidenceDefs,
      evidenceA,
      evidenceB,
      evidenceASubmitted,
      evidenceBSubmitted,
      verdict: verdictNum,
      verdictName,
      reasoning,
      escrowAmount,
      // Agreement.sol-only fields (null for TradeFx)
      joinDeadline: isTradeFx ? null : ((get(13) as bigint) ?? BigInt(0)).toString(),
      evidenceDeadlineSeconds: isTradeFx ? null : ((get(14) as bigint) ?? BigInt(0)).toString(),
      disputeTimestamp: isTradeFx ? null : ((get(15) as bigint) ?? BigInt(0)).toString(),
      maxEvidenceLength: isTradeFx ? null : ((get(16) as bigint) ?? BigInt(0)).toString(),
      constraints: isTradeFx ? null : (get(17) as string) ?? "",
    }, { headers: { "Cache-Control": "no-store" } });

  } catch (err) {
    console.error("GET /api/cases/[id] error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
