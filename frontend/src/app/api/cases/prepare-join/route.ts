import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
  ERC20_ABI,
  USDC_ADDRESS,
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

    // Read escrow amount to determine if USDC approval is needed
    const escrowAmount = await publicClient.readContract({
      address: agreementAddress,
      abi: AGREEMENT_ABI,
      functionName: "escrowAmount",
    });

    const transactions: Array<{
      step: number;
      description: string;
      to: string;
      data: string;
      value: string;
    }> = [];

    // Step 1: If escrow > 0, approve USDC for the agreement contract
    if (escrowAmount > BigInt(0)) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [agreementAddress, escrowAmount],
      });

      transactions.push({
        step: 1,
        description: "Approve USDC spending for escrow",
        to: USDC_ADDRESS,
        data: approveData,
        value: "0",
      });
    }

    // Step 2: acceptAgreement
    const joinData = encodeFunctionData({
      abi: AGREEMENT_ABI,
      functionName: "acceptAgreement",
    });

    transactions.push({
      step: escrowAmount > BigInt(0) ? 2 : 1,
      description: "Join the agreement as Party B",
      to: agreementAddress,
      data: joinData,
      value: "0",
    });

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
