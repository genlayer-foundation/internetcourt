import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";

interface JoinBody {
  caseId: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: JoinBody = await req.json();
    const { caseId } = body;

    if (caseId === undefined || caseId === null) {
      return NextResponse.json(
        { error: "caseId is required" },
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

    // Party B does NOT pay escrow - only acceptAgreement() is needed
    const joinData = encodeFunctionData({
      abi: AGREEMENT_ABI,
      functionName: "acceptAgreement",
    });

    const transactions = [
      {
        step: 1,
        description: "Join the agreement as Party B",
        to: agreementAddress,
        data: joinData,
        value: "0",
      },
    ];

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error(
      "POST /api/cases/prepare-join error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
