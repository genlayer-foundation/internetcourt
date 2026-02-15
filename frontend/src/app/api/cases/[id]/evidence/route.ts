import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let agreementAddress: `0x${string}`;

    if (id.startsWith("0x") && id.length === 42) {
      // Hex address provided directly
      agreementAddress = id as `0x${string}`;
    } else {
      const caseId = parseInt(id, 10);

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

    const results = await publicClient.multicall({
      contracts: [
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
      ],
    });

    return NextResponse.json({
      evidenceA:
        results[0].status === "success" ? results[0].result : "",
      evidenceB:
        results[1].status === "success" ? results[1].result : "",
      evidenceASubmitted:
        results[2].status === "success" ? results[2].result : false,
      evidenceBSubmitted:
        results[3].status === "success" ? results[3].result : false,
    });
  } catch (err) {
    console.error(
      "GET /api/cases/[id]/evidence error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
