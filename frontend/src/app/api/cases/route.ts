import { NextRequest, NextResponse } from "next/server";
import { parseAbiItem } from "viem";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";
import { apiError, STATUS_NAMES, VERDICT_NAMES } from "@/lib/constants";

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
      return NextResponse.json({ cases: [], total: 0, page, limit }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    // Iterate from newest to oldest, collecting matching cases
    // Batch address lookups in groups of 10 for performance
    const BATCH_SIZE = 10;
    const cases: Array<Record<string, unknown>> = [];
    let matched = 0;
    const skip = (page - 1) * limit;

    for (let batchStart = totalContracts - 1; batchStart >= 0 && cases.length < limit; batchStart -= BATCH_SIZE) {
      // Build batch of IDs (newest first, descending)
      const batchIds: number[] = [];
      for (let i = batchStart; i >= 0 && i > batchStart - BATCH_SIZE; i--) {
        batchIds.push(i);
      }

      // Fetch addresses in parallel
      const addresses = await Promise.all(
        batchIds.map((i) =>
          publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: "agreements",
            args: [BigInt(i)],
          })
        )
      );

      // Process each result in order (newest first within the batch)
      for (let idx = 0; idx < batchIds.length && cases.length < limit; idx++) {
        const i = batchIds[idx];
        const agreementAddress = addresses[idx];

        if (
          agreementAddress === "0x0000000000000000000000000000000000000000"
        ) {
          continue;
        }

        // Read basic fields via multicall
        // Try to read standard Agreement fields first, fall back to TradeFx names if failure
        const results = await publicClient.multicall({
          contracts: [
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "status" },
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyA" },
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyB" },
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "statement" },
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "escrowAmount" },
            { address: agreementAddress, abi: AGREEMENT_ABI, functionName: "verdict" },
            // Fallbacks for TradeFxSettlement
            { address: agreementAddress, abi: parseAbi(["function exporter() view returns (address)"]), functionName: "exporter" },
            { address: agreementAddress, abi: parseAbi(["function importer() view returns (address)"]), functionName: "importer" },
            { address: agreementAddress, abi: parseAbi(["function shipmentStatement() view returns (string)"]), functionName: "shipmentStatement" },
            { address: agreementAddress, abi: parseAbi(["function fundedAmount() view returns (uint256)"]), functionName: "fundedAmount" },
            { address: agreementAddress, abi: parseAbi(["function shipmentStatus() view returns (uint8)"]), functionName: "shipmentStatus" },
          ],
        });

        const statusRaw = results[0].status === "success" ? Number(results[0].result) : null;
        const partyA = results[1].status === "success" ? (results[1].result as string) : (results[6].status === "success" ? (results[6].result as string) : "");
        const partyB = results[2].status === "success" ? (results[2].result as string) : (results[7].status === "success" ? (results[7].result as string) : "");
        const statement = results[3].status === "success" ? (results[3].result as string) : (results[8].status === "success" ? (results[8].result as string) : "");
        const escrowAmount = results[4].status === "success" 
          ? (results[4].result as bigint).toString() 
          : (results[9].status === "success" ? (results[9].result as bigint).toString() : "0");
        
        // Map TradeFx status to IC status for listing
        // TradeFx: 0=DRAFT, 6=SETTLED, 7=CANCELLED
        // IC: 0=CREATED, 4=RESOLVED, 5=CANCELLED
        let status = statusRaw !== null ? statusRaw : 0;
        if (results[10].status === "success") {
           // If we have shipmentStatus, this is a TradeFx contract
           const shipStat = Number(results[10].result);
           if (shipStat >= 3) status = 4; // Resolved
        }

        const rawVerdict = results[5].status === "success" ? Number(results[5].result) : 0;
        const verdict = status === 4 ? rawVerdict : -1; // hide until RESOLVED

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
          verdict,
          verdictName: status === 4 ? (VERDICT_NAMES[verdict] || "UNDETERMINED") : "",
        });
      }
    }

    // --- Fetch timestamps for collected cases ---
    // Get the factory's deploymentBlock for efficient event scanning
    let deployBlock: bigint;
    try {
      deployBlock = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "deploymentBlock",
      })) as bigint;
    } catch {
      deployBlock = BigInt(0);
    }

    const currentBlock = await publicClient.getBlockNumber();

    // For each case, fetch AgreementCreated event and latest agreement events
    const timestampPromises = cases.map(async (c) => {
      const caseId = c.id as number;
      const agreementAddress = c.address as `0x${string}`;

      try {
        // Fetch creation event from factory
        const creationLogs = await getLogsChunked({
          address: FACTORY_ADDRESS,
          event: parseAbiItem(
            "event AgreementCreated(uint256 indexed id, address agreementAddress, address partyA, address partyB)",
          ),
          args: { id: BigInt(caseId) },
          fromBlock: deployBlock,
          toBlock: currentBlock,
        });

        let creationBlock: bigint | null = null;
        let latestBlock: bigint | null = null;

        if (creationLogs.length > 0) {
          creationBlock = creationLogs[0].blockNumber;
          latestBlock = creationBlock;
        }

        // Fetch the most recent event on the agreement contract itself
        // Check a few key events to find the latest activity
        const eventSearchStart = creationBlock || deployBlock;
        const logFetch = (event: ReturnType<typeof parseAbiItem>) =>
          getLogsChunked({
            address: agreementAddress,
            event,
            fromBlock: eventSearchStart,
            toBlock: currentBlock,
          }).catch((err) => {
            console.warn(`[cases] Failed to fetch logs for ${agreementAddress}:`, err instanceof Error ? err.message : err);
            return [];
          });

        const latestEventLogs = await Promise.all([
          logFetch(parseAbiItem("event AgreementAccepted(address indexed partyB, uint256 escrowAmount)")),
          logFetch(parseAbiItem("event OutcomeProposed(address indexed proposer, bool statementIsTrue)")),
          logFetch(parseAbiItem("event DisputeRaised(address indexed raisedBy, uint256 evidenceDeadline)")),
          logFetch(parseAbiItem("event EvidenceSubmitted(address indexed submitter)")),
          logFetch(parseAbiItem("event Resolved(uint8 verdict, string reasoning)")),
          logFetch(parseAbiItem("event Cancelled(address indexed cancelledBy)")),
        ]);

        // Find the highest block number among all events
        for (const logs of latestEventLogs) {
          for (const log of logs) {
            if (
              log.blockNumber &&
              (!latestBlock || log.blockNumber > latestBlock)
            ) {
              latestBlock = log.blockNumber;
            }
          }
        }

        // Fetch block timestamps for creation and latest blocks
        const blocksToFetch = new Set<bigint>();
        if (creationBlock) blocksToFetch.add(creationBlock);
        if (latestBlock && latestBlock !== creationBlock)
          blocksToFetch.add(latestBlock);

        const blockData = await Promise.all(
          [...blocksToFetch].map((bn) => publicClient.getBlock({ blockNumber: bn })),
        );

        const blockTimestamps = new Map<bigint, number>();
        for (const block of blockData) {
          blockTimestamps.set(block.number, Number(block.timestamp));
        }

        const createdAtTs = creationBlock
          ? blockTimestamps.get(creationBlock)
          : undefined;
        const updatedAtTs = latestBlock
          ? blockTimestamps.get(latestBlock)
          : undefined;

        return {
          address: agreementAddress,
          createdAt: createdAtTs
            ? new Date(createdAtTs * 1000).toISOString()
            : undefined,
          updatedAt: updatedAtTs
            ? new Date(updatedAtTs * 1000).toISOString()
            : undefined,
        };
      } catch {
        return { address: agreementAddress };
      }
    });

    const timestamps = await Promise.all(timestampPromises);
    const tsMap = new Map(
      timestamps.map((t) => [
        (t.address as string).toLowerCase(),
        t,
      ]),
    );

    // Merge timestamps into cases
    for (const c of cases) {
      const ts = tsMap.get((c.address as string).toLowerCase());
      if (ts) {
        if (ts.createdAt) c.createdAt = ts.createdAt;
        if (ts.updatedAt) c.updatedAt = ts.updatedAt;
      }
    }

    const total =
      partyFilter || statusFilter !== null
        ? matched
        : totalContracts;

    return NextResponse.json({ cases, total, page, limit }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/cases error:", err instanceof Error ? err.message : err);
    return apiError(err instanceof Error ? err.message : "Internal error", 500);
  }
}
