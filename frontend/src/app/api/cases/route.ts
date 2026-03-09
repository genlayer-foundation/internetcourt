import { NextRequest, NextResponse } from "next/server";
import { parseAbi, parseAbiItem } from "viem";
import {
  publicClient,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";
import { apiError, STATUS_NAMES, VERDICT_NAMES, FACTORY_REGISTRY } from "@/lib/constants";

// Base Sepolia limits eth_getLogs to 10,000 blocks per query.
async function getLogsChunked(params: {
  address: `0x${string}`;
  event: ReturnType<typeof parseAbiItem>;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const CHUNK_SIZE = BigInt(9999);
  const { fromBlock, toBlock, ...rest } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logs: any[] = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += CHUNK_SIZE + BigInt(1)
  ) {
    const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
    const chunk = await publicClient.getLogs({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(rest as any),
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
  }

  return logs;
}

/**
 * Fetch all cases from a single factory. Returns raw case objects tagged with
 * factoryAddress and factoryLabel — no pagination applied yet (caller merges).
 */
async function fetchCasesFromFactory(
  factoryAddress: `0x${string}`,
  factoryLabel: string,
  factoryDeploymentBlock: number,
  partyFilter: string | null,
  statusFilter: number | null,
): Promise<Array<Record<string, unknown>>> {
  let totalContracts: number;
  try {
    const nextId = await publicClient.readContract({
      address: factoryAddress,
      abi: FACTORY_ABI,
      functionName: "nextAgreementId",
    });
    totalContracts = Number(nextId);
  } catch {
    // Factory may not exist or may have a different ABI — skip gracefully
    console.warn(`[cases] Could not read nextAgreementId from factory ${factoryAddress}`);
    return [];
  }

  if (totalContracts === 0) return [];

  const BATCH_SIZE = 10;
  const cases: Array<Record<string, unknown>> = [];

  for (let batchStart = totalContracts - 1; batchStart >= 0; batchStart -= BATCH_SIZE) {
    const batchIds: number[] = [];
    for (let i = batchStart; i >= 0 && i > batchStart - BATCH_SIZE; i--) {
      batchIds.push(i);
    }

    const addresses = await Promise.all(
      batchIds.map((i) =>
        publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: "agreements",
          args: [BigInt(i)],
        })
      )
    );

    for (let idx = 0; idx < batchIds.length; idx++) {
      const i = batchIds[idx];
      const agreementAddress = addresses[idx] as string;

      if (agreementAddress === "0x0000000000000000000000000000000000000000") continue;

      const results = await publicClient.multicall({
        contracts: [
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "status" },
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "partyA" },
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "partyB" },
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "statement" },
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "escrowAmount" },
          { address: agreementAddress as `0x${string}`, abi: AGREEMENT_ABI, functionName: "verdict" },
          // TradeFxSettlement fallbacks
          { address: agreementAddress as `0x${string}`, abi: parseAbi(["function exporter() view returns (address)"]), functionName: "exporter" },
          { address: agreementAddress as `0x${string}`, abi: parseAbi(["function importer() view returns (address)"]), functionName: "importer" },
          { address: agreementAddress as `0x${string}`, abi: parseAbi(["function shipmentStatement() view returns (string)"]), functionName: "shipmentStatement" },
          { address: agreementAddress as `0x${string}`, abi: parseAbi(["function fundedAmount() view returns (uint256)"]), functionName: "fundedAmount" },
          { address: agreementAddress as `0x${string}`, abi: parseAbi(["function shipmentStatus() view returns (uint8)"]), functionName: "shipmentStatus" },
        ],
      });

      const statusRaw = results[0].status === "success" ? Number(results[0].result) : null;
      const partyA = results[1].status === "success" ? (results[1].result as string) : (results[6].status === "success" ? (results[6].result as string) : "");
      const partyB = results[2].status === "success" ? (results[2].result as string) : (results[7].status === "success" ? (results[7].result as string) : "");
      const statement = results[3].status === "success" ? (results[3].result as string) : (results[8].status === "success" ? (results[8].result as string) : "");
      const escrowAmount = results[4].status === "success"
        ? (results[4].result as bigint).toString()
        : (results[9].status === "success" ? (results[9].result as bigint).toString() : "0");

      // Map TradeFx status → IC status
      const isTradeFx = results[10].status === "success";
      const shipStat = isTradeFx ? Number(results[10].result) : null;
      // Also need trade-level status to detect CONTESTED+SETTLED (graduated penalty)
      const tfStatusRaw = isTradeFx && results[0].status === "success" ? Number(results[0].result) : 0;
      let status = statusRaw !== null ? statusRaw : 0;
      if (isTradeFx && shipStat !== null) {
        if (shipStat === 3 || shipStat === 4) status = 4; // TIMELY/LATE → RESOLVED
        else if (shipStat === 6) status = 4; // RETURN_REQUIRED → RESOLVED
        else if (shipStat === 2 && tfStatusRaw === 6) status = 4; // CONTESTED+SETTLED (graduated penalty) → RESOLVED
        else if (shipStat === 5 || shipStat === 2) status = 3; // UNDETERMINED/CONTESTED → RESOLVING
      }

      // For TradeFx: derive verdict from shipmentStatus, not Agreement verdict()
      let rawVerdict: number;
      if (isTradeFx && shipStat !== null) {
        // PARTY A (1) = TIMELY; PARTY B (2) = any LATE variant or RETURN_REQUIRED
        if (shipStat === 3) rawVerdict = 1; // TIMELY → PARTY A
        else if (shipStat === 4 || shipStat === 6) rawVerdict = 2; // LATE or RETURN_REQUIRED → PARTY B
        else if (shipStat === 2 && tfStatusRaw === 6) rawVerdict = 2; // CONTESTED+SETTLED → PARTY B
        else rawVerdict = 0; // UNDETERMINED
      } else {
        rawVerdict = results[5].status === "success" ? Number(results[5].result) : 0;
      }
      const hasVerdict = status === 4 || (isTradeFx && shipStat !== null && (shipStat >= 3 || (shipStat === 2 && tfStatusRaw === 6)));
      const verdict = hasVerdict ? rawVerdict : -1;

      if (statusFilter !== null && status !== statusFilter) continue;
      if (partyFilter && partyA.toLowerCase() !== partyFilter && partyB.toLowerCase() !== partyFilter) continue;

      cases.push({
        id: i,
        address: agreementAddress,
        factoryAddress,
        factoryLabel,
        factoryDeploymentBlock,
        status,
        statusName: STATUS_NAMES[status] || "UNKNOWN",
        partyA,
        partyB,
        statement,
        escrowAmount,
        verdict,
        verdictName: status === 4 ? (VERDICT_NAMES[verdict] || "UNDETERMINED") : "",
      });
    }
  }

  return cases;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
    const partyFilter = url.searchParams.get("party")?.toLowerCase() || null;
    const statusFilter = url.searchParams.has("status")
      ? parseInt(url.searchParams.get("status")!, 10)
      : null;

    // Query all registered factories in parallel
    const factoryResults = await Promise.all(
      FACTORY_REGISTRY.map((f) =>
        fetchCasesFromFactory(f.address, f.label, f.deploymentBlock, partyFilter, statusFilter)
      )
    );

    // Merge, deduplicate by contract address (address is globally unique)
    const seen = new Set<string>();
    const allCases: Array<Record<string, unknown>> = [];
    for (const factoryCases of factoryResults) {
      for (const c of factoryCases) {
        const key = (c.address as string).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          allCases.push(c);
        }
      }
    }

    // Sort: newest-first by factory registry order (v2 before v1), then by local id desc
    // This preserves temporal order within each factory; v2 cases float above v1 cases of same id
    const factoryOrder = new Map(FACTORY_REGISTRY.map((f, i) => [f.address.toLowerCase(), i]));
    allCases.sort((a, b) => {
      const fo = (factoryOrder.get((a.factoryAddress as string).toLowerCase()) ?? 99)
               - (factoryOrder.get((b.factoryAddress as string).toLowerCase()) ?? 99);
      if (fo !== 0) return fo;
      return (b.id as number) - (a.id as number);
    });

    const total = allCases.length;
    const skip = (page - 1) * limit;
    const pageCases = allCases.slice(skip, skip + limit);

    // --- Fetch timestamps for paged cases ---
    const currentBlock = await publicClient.getBlockNumber();

    const timestampPromises = pageCases.map(async (c) => {
      const caseId = c.id as number;
      const agreementAddress = c.address as `0x${string}`;
      const factoryAddr = c.factoryAddress as `0x${string}`;
      const deployBlock = BigInt(c.factoryDeploymentBlock as number);

      try {
        const creationLogs = await getLogsChunked({
          address: factoryAddr,
          event: parseAbiItem("event AgreementCreated(uint256 indexed id, address agreementAddress, address partyA, address partyB)"),
          args: { id: BigInt(caseId) },
          fromBlock: deployBlock,
          toBlock: currentBlock,
        });

        let creationBlock: bigint | null = creationLogs[0]?.blockNumber ?? null;
        let latestBlock: bigint | null = creationBlock;

        const eventSearchStart = creationBlock || deployBlock;
        const logFetch = (event: ReturnType<typeof parseAbiItem>) =>
          getLogsChunked({ address: agreementAddress, event, fromBlock: eventSearchStart, toBlock: currentBlock })
            .catch(() => []);

        const latestEventLogs = await Promise.all([
          logFetch(parseAbiItem("event AgreementAccepted(address indexed partyB, uint256 escrowAmount)")),
          logFetch(parseAbiItem("event OutcomeProposed(address indexed proposer, bool statementIsTrue)")),
          logFetch(parseAbiItem("event DisputeRaised(address indexed raisedBy, uint256 evidenceDeadline)")),
          logFetch(parseAbiItem("event EvidenceSubmitted(address indexed submitter)")),
          logFetch(parseAbiItem("event Resolved(uint8 verdict, string reasoning)")),
          logFetch(parseAbiItem("event Cancelled(address indexed cancelledBy)")),
        ]);

        for (const logs of latestEventLogs) {
          for (const log of logs) {
            if (log.blockNumber && (!latestBlock || log.blockNumber > latestBlock)) {
              latestBlock = log.blockNumber;
            }
          }
        }

        const blocksToFetch = new Set<bigint>();
        if (creationBlock) blocksToFetch.add(creationBlock);
        if (latestBlock && latestBlock !== creationBlock) blocksToFetch.add(latestBlock);

        const blockData = await Promise.all([...blocksToFetch].map((bn) => publicClient.getBlock({ blockNumber: bn })));
        const blockTimestamps = new Map(blockData.map((b) => [b.number, Number(b.timestamp)]));

        return {
          address: agreementAddress,
          createdAt: creationBlock ? new Date((blockTimestamps.get(creationBlock) ?? 0) * 1000).toISOString() : undefined,
          updatedAt: latestBlock ? new Date((blockTimestamps.get(latestBlock) ?? 0) * 1000).toISOString() : undefined,
        };
      } catch {
        return { address: agreementAddress };
      }
    });

    const timestamps = await Promise.all(timestampPromises);
    const tsMap = new Map(timestamps.map((t) => [(t.address as string).toLowerCase(), t]));

    for (const c of pageCases) {
      const ts = tsMap.get((c.address as string).toLowerCase());
      if (ts?.createdAt) c.createdAt = ts.createdAt;
      if (ts?.updatedAt) c.updatedAt = ts.updatedAt;
    }

    return NextResponse.json({ cases: pageCases, total, page, limit }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/cases error:", err instanceof Error ? err.message : err);
    return apiError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
