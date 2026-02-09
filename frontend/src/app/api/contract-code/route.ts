import { NextResponse } from "next/server";
import { MOLTCOURT_CONTRACT_SOURCE } from "@/lib/contract-source";

export async function GET() {
  return NextResponse.json({ code: MOLTCOURT_CONTRACT_SOURCE });
}
