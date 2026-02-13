import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
  STATUS_NAMES,
} from "@/lib/contracts";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)),
    );
    const partyFilter = url.searchParams.get("party")?.toLowerCase() || null;
    const statusFilter = url.searchParams.has("status")
      ? parseInt(url.searchParams.get("status")!, 10)
      : null;

    const nextId = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "nextAgreementId",
    });

    const totalContracts = Number(nextId);

    if (totalContracts === 0) {
      return NextResponse.json({ cases: [], total: 0, page, limit });
    }

    // Iterate from newest to oldest, collecting matching cases
    const cases: Array<Record<string, unknown>> = [];
    let scanned = 0;
    let matched = 0;
    const skip = (page - 1) * limit;

    for (let i = totalContracts - 1; i >= 0 && cases.length < limit; i--) {
      const agreementAddress = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "agreements",
        args: [BigInt(i)],
      });

      if (
        agreementAddress === "0x0000000000000000000000000000000000000000"
      ) {
        continue;
      }

      // Read basic fields via multicall
      const results = await publicClient.multicall({
        contracts: [
          {
            address: agreementAddress,
            abi: AGREEMENT_ABI,
            functionName: "status",
          },
          {
            address: agreementAddress,
            abi: AGREEMENT_ABI,
            functionName: "partyA",
          },
          {
            address: agreementAddress,
            abi: AGREEMENT_ABI,
            functionName: "partyB",
          },
          {
            address: agreementAddress,
            abi: AGREEMENT_ABI,
            functionName: "statement",
          },
          {
            address: agreementAddress,
            abi: AGREEMENT_ABI,
            functionName: "escrowAmount",
          },
        ],
      });

      const status = results[0].status === "success" ? Number(results[0].result) : 0;
      const partyA =
        results[1].status === "success" ? (results[1].result as string) : "";
      const partyB =
        results[2].status === "success" ? (results[2].result as string) : "";
      const statement =
        results[3].status === "success" ? (results[3].result as string) : "";
      const escrowAmount =
        results[4].status === "success"
          ? (results[4].result as bigint).toString()
          : "0";

      // Apply filters
      if (statusFilter !== null && status !== statusFilter) {
        continue;
      }
      if (
        partyFilter &&
        partyA.toLowerCase() !== partyFilter &&
        partyB.toLowerCase() !== partyFilter
      ) {
        continue;
      }

      scanned++;
      matched++;

      // Skip for pagination
      if (matched <= skip) {
        continue;
      }

      cases.push({
        id: i,
        address: agreementAddress,
        status,
        statusName: STATUS_NAMES[status] || "UNKNOWN",
        partyA,
        partyB,
        statement,
        escrowAmount,
      });
    }

    // For total count with filters, we need to know how many matched.
    // Since we iterate from newest, the total is at least matched + remaining unchecked.
    // For simplicity when filtering, we report what we've counted so far.
    const total =
      partyFilter || statusFilter !== null
        ? matched
        : totalContracts;

    return NextResponse.json({ cases, total, page, limit });
  } catch (err) {
    console.error(
      "GET /api/cases error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
