import { NextRequest, NextResponse } from "next/server";
import { fetchMultipleContracts } from "@/lib/genlayer";

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
