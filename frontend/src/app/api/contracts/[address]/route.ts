import { NextRequest, NextResponse } from "next/server";
import { fetchContractDetails } from "@/lib/genlayer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const contract = await fetchContractDetails(address);
    return NextResponse.json(contract);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch contract" },
      { status: 500 }
    );
  }
}
