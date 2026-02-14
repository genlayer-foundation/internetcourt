import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  FACTORY_ADDRESS,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";
import { parseAbiItem, formatUnits } from "viem";

interface DocketLink {
  label: string;
  url: string;
}

interface DocketEntry {
  action: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  actor: string | null;
  details: string | null;
  evidence: string | null;
  source: string;
  links: DocketLink[];
}

// Base Sepolia limits eth_getLogs to 10,000 blocks per query.
// This helper chunks a log query into 10k-block windows and combines results.
async function getLogsChunked(params: {
  address: `0x${string}`;
  event: ReturnType<typeof parseAbiItem>;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const CHUNK_SIZE = 9_999n;
  const { fromBlock, toBlock, ...rest } = params;
  const logs: any[] = [];

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE + 1n) {
    const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
    const chunk = await publicClient.getLogs({
      ...rest,
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
  }

  return logs;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let agreementAddress: `0x${string}`;
    let caseId: number;

    // Support both numeric IDs and contract addresses
    if (id.startsWith("0x") && id.length === 42) {
      agreementAddress = id as `0x${string}`;
      caseId = -1;

      const total = Number(
        await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "nextAgreementId",
        }),
      );

      for (let i = 0; i < total; i++) {
        const addr = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: "agreements",
          args: [BigInt(i)],
        });
        if (addr.toLowerCase() === agreementAddress.toLowerCase()) {
          caseId = i;
          break;
        }
      }

      if (caseId === -1) {
        // Case exists but isn't on Base Sepolia factory — return empty docket
        return NextResponse.json({ docket: [], note: "This case is not on Base Sepolia. Docket events are only available for cases deployed through the Base Sepolia factory." });
      }
    } else {
      caseId = parseInt(id, 10);

      if (isNaN(caseId) || caseId < 0) {
        return NextResponse.json(
          { error: "Invalid case ID" },
          { status: 400 },
        );
      }

      agreementAddress = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "agreements",
        args: [BigInt(caseId)],
      });

      if (
        agreementAddress === "0x0000000000000000000000000000000000000000"
      ) {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 },
        );
      }
    }

    // Find the creation block by querying AgreementCreated from factory
    const currentBlock = await publicClient.getBlockNumber();
    // Start with a 50k block lookback (~28 hours on Base Sepolia at 2s/block)
    let fromBlock = currentBlock > 50_000n ? currentBlock - 50_000n : 0n;

    // Search for creation event to narrow subsequent queries
    const creationLogs = await getLogsChunked({
      address: FACTORY_ADDRESS,
      event: parseAbiItem(
        "event AgreementCreated(uint256 indexed id, address agreementAddress, address partyA, address partyB)",
      ),
      args: { id: BigInt(caseId) },
      fromBlock,
      toBlock: currentBlock,
    });

    // If found, narrow subsequent queries to start from the creation block
    if (creationLogs.length > 0) {
      fromBlock = creationLogs[0].blockNumber;
    }

    // Fetch all Agreement events
    const [
      agreementAcceptedLogs,
      outcomeProposedLogs,
      outcomeConfirmedLogs,
      disputeRaisedLogs,
      evidenceSubmittedLogs,
      resolutionTriggeredLogs,
      resolvedLogs,
      fundsClaimedLogs,
      cancelledLogs,
    ] = await Promise.all([
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event AgreementAccepted(address indexed partyB, uint256 escrowAmount)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event OutcomeProposed(address indexed proposer, bool statementIsTrue)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem("event OutcomeConfirmed(uint8 verdict)"),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event DisputeRaised(address indexed raisedBy, uint256 evidenceDeadline)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event EvidenceSubmitted(address indexed submitter)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem("event ResolutionTriggered(uint256 timestamp)"),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event Resolved(uint8 verdict, string reasoning)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event FundsClaimed(address indexed claimant, uint256 amount)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: agreementAddress,
        event: parseAbiItem(
          "event Cancelled(address indexed cancelledBy)",
        ),
        fromBlock,
        toBlock: currentBlock,
      }),
    ]);

    // Fetch Factory events filtered by this agreement (reuse creationLogs from above)
    const agreementCreatedLogs = creationLogs;
    const [
      disputeRequestedLogs,
      verdictReceivedLogs,
    ] = await Promise.all([
      getLogsChunked({
        address: FACTORY_ADDRESS,
        event: parseAbiItem(
          "event DisputeRequested(address indexed agreementAddress, uint256 timestamp)",
        ),
        args: {
          agreementAddress: agreementAddress,
        },
        fromBlock,
        toBlock: currentBlock,
      }),
      getLogsChunked({
        address: FACTORY_ADDRESS,
        event: parseAbiItem(
          "event VerdictReceived(address indexed agreementAddress, uint8 verdict)",
        ),
        args: {
          agreementAddress: agreementAddress,
        },
        fromBlock,
        toBlock: currentBlock,
      }),
    ]);

    // Collect all unique block numbers
    const allLogs = [
      ...agreementAcceptedLogs,
      ...outcomeProposedLogs,
      ...outcomeConfirmedLogs,
      ...disputeRaisedLogs,
      ...evidenceSubmittedLogs,
      ...resolutionTriggeredLogs,
      ...resolvedLogs,
      ...fundsClaimedLogs,
      ...cancelledLogs,
      ...agreementCreatedLogs,
      ...disputeRequestedLogs,
      ...verdictReceivedLogs,
    ];

    const uniqueBlocks = [
      ...new Set(allLogs.map((log) => log.blockNumber)),
    ];

    // Fetch all block timestamps in parallel
    const blockData = await Promise.all(
      uniqueBlocks.map((blockNumber) =>
        publicClient.getBlock({ blockNumber }),
      ),
    );

    const blockTimestamps = new Map<bigint, number>();
    blockData.forEach((block) => {
      blockTimestamps.set(block.number, Number(block.timestamp));
    });

    // Helper to get verdict name
    const getVerdictName = (verdict: number): string => {
      const names = ["UNDETERMINED", "TRUE", "FALSE"];
      return names[verdict] || "UNKNOWN";
    };

    const basescanLink = (txHash: string): DocketLink => ({
      label: "Basescan",
      url: `https://sepolia.basescan.org/tx/${txHash}`,
    });

    const lzLink = (txHash: string): DocketLink => ({
      label: "LayerZero Scan",
      url: `https://testnet.layerzeroscan.com/tx/${txHash}`,
    });

    // Read contract state for enrichment (statement, evidence, parties, escrow)
    const [
      statement,
      partyA,
      partyB,
      escrowAmount,
      evidenceA,
      evidenceB,
      evidenceDeadlineSeconds,
    ] = await Promise.all([
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "statement" }).catch(() => ""),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyA" }).catch(() => ""),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyB" }).catch(() => ""),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "escrowAmount" }).catch(() => 0n),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceA" }).catch(() => ""),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceB" }).catch(() => ""),
      publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" }).catch(() => 0n),
    ]);

    const escrowFormatted = formatUnits(escrowAmount as bigint, 6);

    // Process all events into docket entries
    const docket: DocketEntry[] = [];

    // AgreementCreated
    agreementCreatedLogs.forEach((log) => {
      docket.push({
        action: "Agreement created",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.partyA || null,
        details: `Statement: "${statement}"\nParty A: ${partyA}\nParty B: ${partyB}\nEscrow: ${escrowFormatted} USDC`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // AgreementAccepted
    agreementAcceptedLogs.forEach((log) => {
      const amt = log.args.escrowAmount
        ? formatUnits(log.args.escrowAmount, 6)
        : "0";
      docket.push({
        action: "Party B accepted the agreement",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.partyB || null,
        details: `Escrow deposited: ${amt} USDC`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // OutcomeProposed
    outcomeProposedLogs.forEach((log) => {
      const outcome = log.args.statementIsTrue ? "TRUE" : "FALSE";
      docket.push({
        action: `Outcome proposed: ${outcome}`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.proposer || null,
        details: null,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // OutcomeConfirmed
    outcomeConfirmedLogs.forEach((log) => {
      const verdict = log.args.verdict !== undefined ? log.args.verdict : 0;
      docket.push({
        action: "Outcome confirmed by mutual agreement",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: null,
        details: `Verdict: ${getVerdictName(verdict)}`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // DisputeRaised
    disputeRaisedLogs.forEach((log) => {
      const deadlineSec = Number(evidenceDeadlineSeconds || 0);
      const deadlineStr = deadlineSec > 0 ? `${Math.round(deadlineSec / 60)} minutes` : "none";
      docket.push({
        action: "Dispute raised — evidence window opened",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.raisedBy || null,
        details: `Evidence deadline: ${deadlineStr}`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // EvidenceSubmitted — include evidence text
    evidenceSubmittedLogs.forEach((log) => {
      const submitter = (log.args.submitter || "").toLowerCase();
      const isPartyA = submitter === (partyA as string).toLowerCase();
      const evidenceText = isPartyA ? (evidenceA as string) : (evidenceB as string);
      const partyLabel = isPartyA ? "Party A" : "Party B";
      docket.push({
        action: `Evidence submitted by ${partyLabel}`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.submitter || null,
        details: null,
        evidence: evidenceText || null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // ResolutionTriggered
    resolutionTriggeredLogs.forEach((log) => {
      docket.push({
        action: "Resolution triggered — sent to AI jury",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: null,
        details: "Both parties submitted evidence. Case forwarded to GenLayer validators for judgment.",
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // DisputeRequested (bridge outbound)
    disputeRequestedLogs.forEach((log) => {
      docket.push({
        action: "Dispute forwarded via LayerZero bridge",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: null,
        details: "Cross-chain message dispatched from Base to GenLayer for AI jury evaluation.",
        evidence: null,
        source: "LayerZero",
        links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)],
      });
    });

    // Resolved (verdict from GenLayer via bridge)
    resolvedLogs.forEach((log) => {
      const verdict = log.args.verdict !== undefined ? log.args.verdict : 0;
      docket.push({
        action: `Verdict delivered: ${getVerdictName(verdict)}`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: null,
        details: log.args.reasoning || null,
        evidence: null,
        source: "GenLayer",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // VerdictReceived (bridge inbound)
    verdictReceivedLogs.forEach((log) => {
      const verdict = log.args.verdict !== undefined ? log.args.verdict : 0;
      docket.push({
        action: `Verdict received from bridge: ${getVerdictName(verdict)}`,
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: null,
        details: "Verdict relayed from GenLayer via LayerZero V2 to Base Sepolia.",
        evidence: null,
        source: "LayerZero",
        links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)],
      });
    });

    // FundsClaimed
    fundsClaimedLogs.forEach((log) => {
      const amount = log.args.amount
        ? formatUnits(log.args.amount, 6)
        : "0";
      docket.push({
        action: "Funds claimed",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.claimant || null,
        details: `${amount} USDC withdrawn from escrow`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // Cancelled
    cancelledLogs.forEach((log) => {
      docket.push({
        action: "Agreement cancelled",
        txHash: log.transactionHash!,
        blockNumber: Number(log.blockNumber),
        timestamp: blockTimestamps.get(log.blockNumber) || 0,
        actor: log.args.cancelledBy || null,
        details: `Escrow of ${escrowFormatted} USDC returned to creator`,
        evidence: null,
        source: "Base",
        links: [basescanLink(log.transactionHash!)],
      });
    });

    // Sort by block number (ascending = chronological)
    docket.sort((a, b) => a.blockNumber - b.blockNumber);

    return NextResponse.json({ docket });
  } catch (err) {
    console.error(
      "GET /api/cases/[id]/docket error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
