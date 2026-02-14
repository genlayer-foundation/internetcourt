import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import {
  FACTORY_ADDRESS,
  FACTORY_ABI,
  ERC20_ABI,
  USDC_ADDRESS,
} from "@/lib/contracts";

interface CreateAgreementBody {
  partyB: string;
  statement: string;
  guidelines: string;
  evidenceDefs: string;
  escrowAmount: string;
  usdcAddress?: string;
  joinDeadline: string;
  evidenceDeadlineSeconds: string;
  maxEvidenceLength: string;
  constraints: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateAgreementBody = await req.json();

    const {
      partyB,
      statement,
      guidelines,
      evidenceDefs,
      escrowAmount,
      usdcAddress,
      joinDeadline,
      evidenceDeadlineSeconds,
      maxEvidenceLength,
      constraints,
    } = body;

    // Validate required fields
    if (!partyB || !statement) {
      return NextResponse.json(
        { error: "partyB and statement are required" },
        { status: 400 },
      );
    }

    const escrow = BigInt(escrowAmount || "0");
    const tokenAddress = (usdcAddress || USDC_ADDRESS) as `0x${string}`;

    const transactions: Array<{
      step: number;
      description: string;
      to: string;
      data: string;
      value: string;
    }> = [];

    // Step 1: If escrow > 0, prepare USDC approve tx
    if (escrow > BigInt(0)) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [FACTORY_ADDRESS, escrow],
      });

      transactions.push({
        step: 1,
        description: "Approve USDC spending for escrow",
        to: tokenAddress,
        data: approveData,
        value: "0",
      });
    }

    // Step 2: createAgreement tx
    const createData = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "createAgreement",
      args: [
        partyB as `0x${string}`,
        statement,
        guidelines || "",
        evidenceDefs || "",
        BigInt(evidenceDeadlineSeconds || "0"),  // pos 5 - evidenceDeadlineSeconds
        tokenAddress,                             // pos 6 - usdcToken
        escrow,                                   // pos 7 - escrowAmount
        BigInt(joinDeadline || "0"),             // pos 8 - joinDeadline
        BigInt(maxEvidenceLength || "0"),         // pos 9
        constraints || "",                        // pos 10
      ],
    });

    transactions.push({
      step: escrow > BigInt(0) ? 2 : 1,
      description: "Create agreement",
      to: FACTORY_ADDRESS,
      data: createData,
      value: "0",
    });

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error(
      "POST /api/cases/prepare-create error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
