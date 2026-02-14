import { NextRequest, NextResponse } from "next/server";
import {
  callContractView,
  fetchMultipleContracts,
  fetchContractDetails,
} from "@/lib/genlayer";
import type { MoltContract } from "@/lib/types";

const FACTORY_ADDRESS = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const entries = await callContractView(
      FACTORY_ADDRESS,
      "get_contracts_by_type",
      ["internetcourt"]
    );

    const entryList = Array.isArray(entries) ? entries : [];

    const contracts: MoltContract[] = [];
    const errors: Record<string, string> = {};
    const genLayerAddresses: string[] = [];

    // Separate Base cases (with chain_id) from GenLayer-native cases
    for (const entry of entryList) {
      const address = entry?.address;
      if (!address) continue;

      let params: Record<string, unknown> = {};
      try {
        params = typeof entry.params === "string" ? JSON.parse(entry.params) : (entry.params || {});
      } catch {
        params = {};
      }

      if (params.chain_id) {
        // Base case — construct from registry metadata
        contracts.push({
          address,
          partyA: (params.party_a as string) || "",
          partyB: (params.party_b as string) || "",
          statement: (params.statement as string) || "",
          guidelines: "",
          evidenceDefs: {},
          status: "created",
          evidenceA: "",
          evidenceB: "",
          verdict: "",
          reasoning: "",
          proposedOutcomeA: "",
          proposedOutcomeB: "",
          chainId: params.chain_id as number,
          chainName: (params.chain_name as string) || "",
          factoryId: params.factory_id as number,
          baseFactory: (params.base_factory as string) || "",
          escrowAmount: (params.escrow_amount as string) || "",
        });
      } else {
        // GenLayer-native case — fetch details from contract
        genLayerAddresses.push(address);
      }
    }

    // Fetch GenLayer-native case details in parallel
    if (genLayerAddresses.length > 0) {
      const { contracts: glContracts, errors: glErrors } = await fetchMultipleContracts(genLayerAddresses);
      contracts.push(...glContracts);
      Object.assign(errors, glErrors);
    }

    return NextResponse.json({ contracts, errors });
  } catch (err) {
    console.error("GET /api/contracts error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ contracts: [], errors: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addresses: string[] = body.addresses || [];

    if (addresses.length === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const { contracts, errors } = await fetchMultipleContracts(addresses);
    return NextResponse.json({ contracts, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
