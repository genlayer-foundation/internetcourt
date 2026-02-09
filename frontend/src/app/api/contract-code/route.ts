import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { resolve } from "path";

export async function GET() {
  try {
    const codePath = resolve(process.cwd(), "../contracts/MoltCourt.py");
    const code = readFileSync(codePath, "utf8");
    return NextResponse.json({ code });
  } catch {
    return NextResponse.json(
      { error: "Contract source not found" },
      { status: 500 }
    );
  }
}
