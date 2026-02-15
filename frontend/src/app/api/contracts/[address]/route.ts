import { NextRequest, NextResponse } from "next/server";
import { fetchContractDetails, callContractView } from "@/lib/genlayer";
import { GENLAYER_FACTORY_ADDRESS } from "@/lib/constants";
import type { MoltContract, Verdict } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  // Try direct contract read first
  try {
    const contract = await fetchContractDetails(address);
    return NextResponse.json(contract);
  } catch (directErr) {
    // Direct read failed — try factory fallback
    try {
      const allContracts = (await callContractView(
        GENLAYER_FACTORY_ADDRESS,
        "get_contracts_by_type",
        ["internetcourt"]
      )) as Array<Record<string, string>>;

      const meta = allContracts.find(
        (c) => (c.address || "").toLowerCase() === address.toLowerCase()
      );

      if (meta) {
        const partial: MoltContract = {
          address,
          partyA: meta.party_a || meta.deployer || "",
          partyB: meta.party_b || "",
          statement: meta.statement || "",
          guidelines: "",
          evidenceDefs: {},
          status: "created",
          evidenceA: "",
          evidenceB: "",
          verdict: "" as Verdict,
          reasoning: "",
          proposedOutcomeA: "",
          proposedOutcomeB: "",
          incomplete: true,
          incompleteReason: "Contract data temporarily unavailable",
        };
        return NextResponse.json(partial);
      }
    } catch {
      // Factory lookup also failed — fall through to error
    }

    return NextResponse.json(
      { error: directErr instanceof Error ? directErr.message : "Failed to fetch contract" },
      { status: 500 }
    );
  }
}
