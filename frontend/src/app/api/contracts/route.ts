import { NextRequest, NextResponse } from "next/server";
import {
  callContractView,
  fetchMultipleContracts,
} from "@/lib/genlayer";

const FACTORY_ADDRESS = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    // Use get_contracts_by_type for reliable discovery
    const entries = await callContractView(
      FACTORY_ADDRESS,
      "get_contracts_by_type",
      ["internetcourt"]
    );

    const entryList = Array.isArray(entries) ? entries : [];

    const addresses: string[] = entryList
      .map((entry: Record<string, string>) => entry?.address || null)
      .filter((a: string | null): a is string => a !== null);

    if (addresses.length === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const { contracts, errors } = await fetchMultipleContracts(addresses);
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
