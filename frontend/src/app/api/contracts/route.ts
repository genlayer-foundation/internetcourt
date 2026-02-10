import { NextRequest, NextResponse } from "next/server";
import {
  callContractView,
  fetchMultipleContracts,
} from "@/lib/genlayer";

const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS || "0xAA55c2768855A483b5D8C8926585Cdb940207898";

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    // Factory uses get_contract_count() + get_contract(id) pattern
    const count = await callContractView(
      FACTORY_ADDRESS,
      "get_contract_count",
      []
    );
    const total = Number(count) || 0;

    if (total === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    // Fetch latest 4 registered contracts (newest first)
    const start = Math.max(0, total - 4);
    const entries = await Promise.all(
      Array.from({ length: total - start }, (_, i) =>
        callContractView(FACTORY_ADDRESS, "get_contract", [total - 1 - i])
      )
    );

    const addresses: string[] = entries
      .map((entry) => {
        if (typeof entry === "object" && entry !== null && "address" in entry) {
          return (entry as { address: string }).address;
        }
        return null;
      })
      .filter((a): a is string => a !== null);

    if (addresses.length === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const { contracts, errors } = await fetchMultipleContracts(addresses);
    return NextResponse.json({ contracts, errors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("GET /api/contracts error:", msg);
    return NextResponse.json({ contracts: [], errors: {}, debug: { error: msg, factory: FACTORY_ADDRESS } });
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
