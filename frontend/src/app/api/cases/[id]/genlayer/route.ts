import { NextRequest, NextResponse } from "next/server";
import { publicClient, FACTORY_ADDRESS, FACTORY_ABI } from "@/lib/contracts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let agreementAddress: `0x${string}`;
    if (id.startsWith("0x") && id.length === 42) {
      agreementAddress = id as `0x${string}`;
    } else {
      const caseId = parseInt(id, 10);
      if (isNaN(caseId) || caseId < 0) {
        return NextResponse.json(
          { error: "Invalid case ID" },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      agreementAddress = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "agreements",
        args: [BigInt(caseId)],
      });
      if (agreementAddress === "0x0000000000000000000000000000000000000000") {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const relayBaseUrl = process.env.RELAY_BASE_URL?.trim();
    if (!relayBaseUrl) {
      return NextResponse.json({ oracleAddress: null, oracleTxHash: null }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const r = await fetch(
        `${relayBaseUrl.replace(/\/$/, "")}/cases/${agreementAddress}/gl`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!r.ok) {
        return NextResponse.json({ oracleAddress: null, oracleTxHash: null }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
      const data = await r.json();
      const meta = data?.meta || {};
      return NextResponse.json({
        oracleAddress: meta.oracleAddress || null,
        oracleTxHash: meta.oracleTxHash || null,
      }, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json({ oracleAddress: null, oracleTxHash: null }, {
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

