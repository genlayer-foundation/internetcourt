import { NextResponse } from "next/server";
import { INTERNETCOURT_CONTRACT_SOURCE } from "@/lib/contract-source";

export async function GET() {
  return NextResponse.json({ code: INTERNETCOURT_CONTRACT_SOURCE });
}
