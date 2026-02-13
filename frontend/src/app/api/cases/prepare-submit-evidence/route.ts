import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";

interface SubmitEvidenceBody {
  caseId: number;
  evidence: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SubmitEvidenceBody = await req.json();
    const { caseId, evidence } = body;

    if (caseId === undefined || caseId === null) {
      return NextResponse.json(
        { error: "caseId is required" },
        { status: 400 },
      );
    }

    if (!evidence && evidence !== "") {
      return NextResponse.json(
        { error: "evidence is required" },
        { status: 400 },
      );
    }

    const agreementAddress = await publicClient.readContract({
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

    const data = encodeFunctionData({
      abi: AGREEMENT_ABI,
      functionName: "submitEvidence",
      args: [evidence],
    });

    return NextResponse.json({
      transactions: [
        {
          step: 1,
          description: "Submit evidence to the agreement",
          to: agreementAddress,
          data,
          value: "0",
        },
      ],
    });
  } catch (err) {
    console.error(
      "POST /api/cases/prepare-submit-evidence error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
