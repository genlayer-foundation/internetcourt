import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
  STATUS_NAMES,
  VERDICT_NAMES,
} from "@/lib/contracts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let agreementAddress: `0x${string}`;
    let caseId: number;

    // Support both numeric IDs and contract addresses
    if (id.startsWith("0x") && id.length === 42) {
      // Lookup by address — find the ID by scanning factory
      agreementAddress = id as `0x${string}`;
      caseId = -1;

      const total = Number(
        await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "nextAgreementId",
        }),
      );

      for (let i = 0; i < total; i++) {
        const addr = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "agreements",
          args: [BigInt(i)],
        });
        if (addr.toLowerCase() === agreementAddress.toLowerCase()) {
          caseId = i;
          break;
        }
      }

      if (caseId === -1) {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 },
        );
      }
    } else {
      caseId = parseInt(id, 10);

      if (isNaN(caseId) || caseId < 0) {
        return NextResponse.json(
          { error: "Invalid case ID" },
          { status: 400 },
        );
      }

      agreementAddress = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "agreements",
        args: [BigInt(caseId)],
      });

      if (
        agreementAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 },
        );
      }
    }

    // Read all fields via multicall
    const results = await publicClient.multicall({
      contracts: [
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "status",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "partyA",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "partyB",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "statement",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "guidelines",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceDefs",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceA",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceB",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceASubmitted",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceBSubmitted",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "verdict",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "reasoning",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "escrowAmount",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "joinDeadline",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "evidenceDeadlineSeconds",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "disputeTimestamp",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "maxEvidenceLength",
        },
        {
          address: agreementAddress,
          abi: AGREEMENT_ABI,
          functionName: "constraints",
        },
      ],
    });

    function getResult(index: number) {
      const r = results[index];
      if (r.status === "success") return r.result;
      return null;
    }

    const statusNum = Number(getResult(0) ?? 0);
    const verdictNum = Number(getResult(10) ?? 0);

    const caseData = {
      id: caseId,
      address: agreementAddress,
      status: statusNum,
      statusName: STATUS_NAMES[statusNum] || "UNKNOWN",
      partyA: getResult(1) ?? "",
      partyB: getResult(2) ?? "",
      statement: getResult(3) ?? "",
      guidelines: getResult(4) ?? "",
      evidenceDefs: getResult(5) ?? "",
      evidenceA: getResult(6) ?? "",
      evidenceB: getResult(7) ?? "",
      evidenceASubmitted: getResult(8) ?? false,
      evidenceBSubmitted: getResult(9) ?? false,
      verdict: verdictNum,
      verdictName: VERDICT_NAMES[verdictNum] || "UNDETERMINED",
      reasoning: getResult(11) ?? "",
      escrowAmount: ((getResult(12) as bigint) ?? BigInt(0)).toString(),
      joinDeadline: ((getResult(13) as bigint) ?? BigInt(0)).toString(),
      evidenceDeadlineSeconds: (
        (getResult(14) as bigint) ?? BigInt(0)
      ).toString(),
      disputeTimestamp: (
        (getResult(15) as bigint) ?? BigInt(0)
      ).toString(),
      maxEvidenceLength: (
        (getResult(16) as bigint) ?? BigInt(0)
      ).toString(),
      constraints: getResult(17) ?? "",
    };

    return NextResponse.json(caseData);
  } catch (err) {
    console.error(
      "GET /api/cases/[id] error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
