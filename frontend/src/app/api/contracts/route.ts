import { NextRequest, NextResponse } from "next/server";
import {
  callContractView,
  fetchMultipleContracts,
} from "@/lib/genlayer";

const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS || "";

export async function GET() {
  try {
    if (!FACTORY_ADDRESS) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const raw = await callContractView(
      FACTORY_ADDRESS,
      "get_all_contracts",
      []
    );
    const addresses: string[] = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? JSON.parse(raw)
        : [];

    if (addresses.length === 0) {
      return NextResponse.json({ contracts: [], errors: {} });
    }

    const latest = addresses.slice(-4).reverse();
    const { contracts, errors } = await fetchMultipleContracts(latest);
    return NextResponse.json({ contracts, errors });
  } catch {
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
