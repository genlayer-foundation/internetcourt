import { NextRequest, NextResponse } from "next/server";
import {
  publicClient,
  FACTORY_ABI,
  AGREEMENT_ABI,
} from "@/lib/contracts";
import { parseAbi, parseAbiItem, formatUnits } from "viem";
import { FACTORY_REGISTRY } from "@/lib/constants";
import { getGlOracleMeta } from "@/lib/gl-oracle-meta";

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

async function getLogsChunked(params: {
  address: `0x${string}`;
  event: any;
  args?: Record<string, unknown>;
  fromBlock: bigint;
  toBlock: bigint;
}) {
  const CHUNK_SIZE = BigInt(9999);
  const { fromBlock, toBlock, ...rest } = params;
  const logs: any[] = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE + BigInt(1)) {
    const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
    const chunk = await publicClient.getLogs({ ...(rest as any), fromBlock: start, toBlock: end });
    logs.push(...chunk);
  }
  return logs;
}

const basescanLink = (txHash: string): DocketLink => ({
  label: "Basescan",
  url: `https://sepolia.basescan.org/tx/${txHash}`,
});

const lzLink = (txHash: string): DocketLink => ({
  label: "LayerZero Scan",
  url: `https://testnet.layerzeroscan.com/tx/${txHash}`,
});

const getVerdictName = (verdict: number): string =>
  (["UNDETERMINED", "PARTY A", "PARTY B"])[verdict] || "UNKNOWN";

// ShipmentVerdictReceived.verdict uses factory/IC numbering: 0=UNDETERMINED, 1=PARTY_A (TIMELY), 2=PARTY_B (LATE)
const shipmentVerdictLabel = (v: number): string =>
  v === 1 ? "TIMELY — exporter wins" : v === 2 ? "LATE — importer wins" : "UNDETERMINED";

// Decode bytes32 to human-readable ASCII, stripping null bytes
const bytes32ToAscii = (hex: string): string => {
  try {
    const clean = hex.replace(/^0x/, "").replace(/00+$/, "");
    let result = "";
    for (let i = 0; i < clean.length; i += 2) {
      const code = parseInt(clean.slice(i, i + 2), 16);
      if (code > 31 && code < 127) result += String.fromCharCode(code);
    }
    return result || hex;
  } catch {
    return hex;
  }
};

// TradeFx ABI for log decoding
const TFX_ABI = parseAbi([
  "event TradeCreated(address indexed exporter, address indexed importer, uint256 invoiceAmount, uint256 dueDate, string invoiceRef)",
  "event RateLockRequested(address indexed requester, uint256 timestamp)",
  "event RateLocked(uint256 rate, bytes32 benchmarkType, bytes32 benchmarkId, uint256 asOfTimestamp, uint256 settlementAmount)",
  "event RateRolled(uint256 priorRate, uint256 rolledRate, uint256 rollCost, uint256 oldDueDate, uint256 newDueDate, bytes32 benchmarkId, uint256 asOfTimestamp)",
  "event Funded(address indexed funder, uint256 amount, uint256 timestamp)",
  "event Settled(address indexed exporter, uint256 amount, uint256 timestamp)",
  "event Cancelled(uint8 reasonCode, address indexed by, uint256 refundAmount, address indexed refundTo)",
  "event ShipmentAccepted(address indexed by, bool afterDeadline, uint256 timestamp)",
  "event ShipmentContested(address indexed contestant, string manifestCid, string statement, uint256 contestDeadline, uint256 timestamp)",
  "event ShipmentVerdictReceived(uint8 verdict, string caseId, string reasonSummary, address indexed deliveredBy, bool fromCourtContract, uint256 timestamp)",
  "event SettlementCancelledByVerdict(address indexed importer, uint256 refundAmount)",
  "event SettlementManualReview(string caseId, uint256 reviewDeadline, uint256 timestamp)",
  "event ManualReviewResolved(address indexed arbitrator, bool timeliness, string reason, uint256 timestamp)",
  "event ManualReviewTimedOut(address indexed caller, uint256 timestamp)",
  "event ExceptionFlagged(uint8 reasonCode, bytes32 evidenceRef, address indexed flagger)",
]);

/**
 * Find which factory registered this contract address.
 * Returns { factoryAddress, deploymentBlock } or null.
 */
async function findFactory(agreementAddress: string) {
  for (const f of FACTORY_REGISTRY) {
    try {
      const nextId = Number(await publicClient.readContract({ address: f.address, abi: FACTORY_ABI, functionName: "nextAgreementId" }));
      const BATCH = 20;
      for (let start = 0; start < nextId; start += BATCH) {
        const ids = Array.from({ length: Math.min(BATCH, nextId - start) }, (_, i) => start + i);
        const addrs = await Promise.all(ids.map((i) => publicClient.readContract({ address: f.address, abi: FACTORY_ABI, functionName: "agreements", args: [BigInt(i)] })));
        for (let i = 0; i < ids.length; i++) {
          if ((addrs[i] as string).toLowerCase() === agreementAddress.toLowerCase()) {
            return { factoryAddress: f.address, caseId: ids[i], deploymentBlock: BigInt(f.deploymentBlock) };
          }
        }
      }
    } catch { /* skip */ }
  }
  return null;
}

/**
 * Detect if address is a TradeFxSettlement contract by checking for exporter().
 */
async function isTradeFx(address: `0x${string}`): Promise<boolean> {
  try {
    await publicClient.readContract({ address, abi: parseAbi(["function exporter() view returns (address)"]), functionName: "exporter" });
    return true;
  } catch {
    return false;
  }
}

// ─── TradeFx docket builder ───────────────────────────────────────────────────

async function buildTradeFxDocket(
  agreementAddress: `0x${string}`,
  fromBlock: bigint,
  currentBlock: bigint,
  glEntriesPromise: Promise<DocketEntry[]>,
  factoryAddress: `0x${string}`,
  caseId: number,
  deployBlock: bigint,
): Promise<DocketEntry[]> {
  // Fetch TradeFx-specific events in parallel
  const fetch = (eventSig: string) =>
    getLogsChunked({ address: agreementAddress, event: parseAbiItem(eventSig), fromBlock, toBlock: currentBlock }).catch(() => []);

  const [
    tradeCreatedLogs,
    rateLockRequestedLogs,
    rateLockedLogs,
    rateRolledLogs,
    fundedLogs,
    settledLogs,
    cancelledLogs,
    shipmentAcceptedLogs,
    shipmentContestedLogs,
    shipmentVerdictLogs,
    settlementCancelledLogs,
    manualReviewLogs,
    manualReviewResolvedLogs,
    manualReviewTimedOutLogs,
    exceptionFlaggedLogs,
  ] = await Promise.all([
    fetch("event TradeCreated(address indexed exporter, address indexed importer, uint256 invoiceAmount, uint256 dueDate, string invoiceRef)"),
    fetch("event RateLockRequested(address indexed requester, uint256 timestamp)"),
    fetch("event RateLocked(uint256 rate, bytes32 benchmarkType, bytes32 benchmarkId, uint256 asOfTimestamp, uint256 settlementAmount)"),
    fetch("event RateRolled(uint256 priorRate, uint256 rolledRate, uint256 rollCost, uint256 oldDueDate, uint256 newDueDate, bytes32 benchmarkId, uint256 asOfTimestamp)"),
    fetch("event Funded(address indexed funder, uint256 amount, uint256 timestamp)"),
    fetch("event Settled(address indexed exporter, uint256 amount, uint256 timestamp)"),
    fetch("event Cancelled(uint8 reasonCode, address indexed by, uint256 refundAmount, address indexed refundTo)"),
    fetch("event ShipmentAccepted(address indexed by, bool afterDeadline, uint256 timestamp)"),
    fetch("event ShipmentContested(address indexed contestant, string manifestCid, string statement, uint256 contestDeadline, uint256 timestamp)"),
    fetch("event ShipmentVerdictReceived(uint8 verdict, string caseId, string reasonSummary, address indexed deliveredBy, bool fromCourtContract, uint256 timestamp)"),
    fetch("event SettlementCancelledByVerdict(address indexed importer, uint256 refundAmount)"),
    fetch("event SettlementManualReview(string caseId, uint256 reviewDeadline, uint256 timestamp)"),
    fetch("event ManualReviewResolved(address indexed arbitrator, bool timeliness, string reason, uint256 timestamp)"),
    fetch("event ManualReviewTimedOut(address indexed caller, uint256 timestamp)"),
    fetch("event ExceptionFlagged(uint8 reasonCode, bytes32 evidenceRef, address indexed flagger)"),
  ]);

  // Factory events for this case (bridge crossings)
  const [disputeRequestedLogs, verdictReceivedLogs] = await Promise.all([
    getLogsChunked({
      address: factoryAddress,
      event: parseAbiItem("event DisputeRequested(address indexed agreementAddress, uint256 timestamp)"),
      args: { agreementAddress },
      fromBlock: deployBlock,
      toBlock: currentBlock,
    }).catch(() => []),
    getLogsChunked({
      address: factoryAddress,
      event: parseAbiItem("event VerdictReceived(address indexed agreementAddress, uint8 verdict)"),
      args: { agreementAddress },
      fromBlock: deployBlock,
      toBlock: currentBlock,
    }).catch(() => []),
  ]);

  // Collect all unique block numbers for timestamp lookup
  const allLogs = [
    ...tradeCreatedLogs, ...rateLockRequestedLogs, ...rateLockedLogs, ...rateRolledLogs,
    ...fundedLogs, ...settledLogs, ...cancelledLogs, ...shipmentAcceptedLogs,
    ...shipmentContestedLogs, ...shipmentVerdictLogs, ...settlementCancelledLogs,
    ...manualReviewLogs, ...manualReviewResolvedLogs, ...manualReviewTimedOutLogs,
    ...exceptionFlaggedLogs, ...disputeRequestedLogs, ...verdictReceivedLogs,
  ];

  const uniqueBlocks = [...new Set(allLogs.map((l) => l.blockNumber))];
  const blockData = await Promise.all(uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn })));
  const ts = new Map<bigint, number>(blockData.map((b) => [b.number, Number(b.timestamp)]));

  const docket: DocketEntry[] = [];
  const t = (log: any) => ts.get(log.blockNumber) || 0;

  // TradeCreated — contract deployed / trade initiated
  tradeCreatedLogs.forEach((log) => {
    const due = log.args.dueDate ? new Date(Number(log.args.dueDate) * 1000).toISOString().split("T")[0] : "—";
    const notional = log.args.invoiceAmount ? (Number(log.args.invoiceAmount) / 1e18).toLocaleString() : "—";
    docket.push({
      action: "Trade created",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.exporter || null,
      details: `Invoice: ${notional} BOB · Due: ${due} · Ref: ${log.args.invoiceRef || "—"}\nExporter: ${log.args.exporter}\nImporter: ${log.args.importer}`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // RateLockRequested
  rateLockRequestedLogs.forEach((log) => {
    docket.push({
      action: "Rate lock requested",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.requester || null,
      details: "Exporter requested FX benchmark from GenLayer oracle.",
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // RateLocked — GenLayer oracle delivered rate via LayerZero bridge → BridgeReceiver → receiveRate()
  rateLockedLogs.forEach((log) => {
    const rate = log.args.rate ? (Number(log.args.rate) / 1e6).toFixed(6) : "—";
    const settlement = log.args.settlementAmount ? (Number(log.args.settlementAmount) / 1e18).toLocaleString() : "—";
    const benchmarkId = log.args.benchmarkId ? bytes32ToAscii(log.args.benchmarkId as string) : "—";
    docket.push({
      action: "FX benchmark locked",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: null,
      details: `Rate: ${rate} PEN/BOB · Settlement: ${settlement} PEN · Benchmark: ${benchmarkId}\nRate fetched by GenLayer oracle, delivered to Base via LayerZero bridge.`,
      evidence: null,
      source: "LayerZero",
      links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)],
    });
  });

  // RateRolled
  rateRolledLogs.forEach((log) => {
    const prior = log.args.priorRate ? (Number(log.args.priorRate) / 1e6).toFixed(6) : "—";
    const rolled = log.args.rolledRate ? (Number(log.args.rolledRate) / 1e6).toFixed(6) : "—";
    const newDue = log.args.newDueDate ? new Date(Number(log.args.newDueDate) * 1000).toISOString().split("T")[0] : "—";
    docket.push({
      action: "Rate rolled to new due date",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: null,
      details: `Prior rate: ${prior} → Rolled rate: ${rolled} PEN/BOB · New due date: ${newDue}`,
      evidence: null,
      source: "LayerZero",
      links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)],
    });
  });

  // Funded — importer escrowed settlement amount
  fundedLogs.forEach((log) => {
    const amount = log.args.amount ? (Number(log.args.amount) / 1e18).toLocaleString() : "—";
    docket.push({
      action: "Settlement amount escrowed",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.funder || null,
      details: `${amount} MockPEN locked in contract. 7-day contest window opened.`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // ShipmentAccepted
  shipmentAcceptedLogs.forEach((log) => {
    const late = log.args.afterDeadline ? " (after deadline — no contest raised)" : "";
    docket.push({
      action: "Shipment accepted" + late,
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.by || null,
      details: "No contest raised. Settlement proceeds to release.",
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // ShipmentContested + DisputeRequested — same tx in practice.
  // Merge into one entry: "Shipment disputed — forwarded to AI jury via bridge"
  // If the txHashes differ, fall back to separate entries.
  const disputeHashSet = new Set(disputeRequestedLogs.map((l) => l.transactionHash));

  shipmentContestedLogs.forEach((log) => {
    const deadline = log.args.contestDeadline ? new Date(Number(log.args.contestDeadline) * 1000).toUTCString() : "—";
    const sameAsBridge = disputeHashSet.has(log.transactionHash!);
    docket.push({
      action: sameAsBridge
        ? "Shipment disputed — case registered and forwarded to AI jury via bridge"
        : "Shipment timing contested — dispute opened",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.contestant || null,
      details: `Statement: "${log.args.statement || "—"}"\nEvidence deadline: ${deadline}`,
      evidence: null,
      source: sameAsBridge ? "LayerZero" : "Base",
      links: sameAsBridge
        ? [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)]
        : [basescanLink(log.transactionHash!)],
    });
  });

  // DisputeRequested — only emit if NOT already merged with ShipmentContested above
  const contestedHashSet = new Set(shipmentContestedLogs.map((l) => l.transactionHash));
  disputeRequestedLogs.forEach((log) => {
    if (contestedHashSet.has(log.transactionHash!)) return; // merged above
    docket.push({
      action: "Dispute forwarded via LayerZero bridge",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: null,
      details: "Cross-chain message dispatched from Base Sepolia to GenLayer for AI jury evaluation.",
      evidence: null,
      source: "LayerZero",
      links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)],
    });
  });

  // VerdictReceived (LZ inbound) + ShipmentVerdictReceived (Base) + SettlementCancelledByVerdict
  // are typically all in the same tx. Merge into one entry per unique txHash.
  // Build index: txHash → merged info
  const verdictTxSet = new Set([
    ...verdictReceivedLogs.map((l) => l.transactionHash),
    ...shipmentVerdictLogs.map((l) => l.transactionHash),
    ...settlementCancelledLogs.map((l) => l.transactionHash),
  ]);

  for (const txHash of verdictTxSet) {
    const lzLog    = verdictReceivedLogs.find((l) => l.transactionHash === txHash);
    const baseLog  = shipmentVerdictLogs.find((l) => l.transactionHash === txHash);
    const cancelLog = settlementCancelledLogs.find((l) => l.transactionHash === txHash);
    const refundLog = cancelLog; // same as cancel for importer refund

    const anyLog = lzLog ?? baseLog;
    if (!anyLog) continue;

    const v = baseLog?.args?.verdict !== undefined ? Number(baseLog.args.verdict) : (lzLog?.args?.verdict !== undefined ? Number(lzLog.args.verdict) : 0);
    const label = shipmentVerdictLabel(v);
    const reasoning = baseLog?.args?.reasonSummary || null;
    const refundAmount = refundLog?.args?.refundAmount
      ? (Number(refundLog.args.refundAmount) / 1e18).toLocaleString()
      : null;

    const outcome = refundAmount
      ? `${refundAmount} MockPEN refunded to importer`
      : label.includes("exporter") ? "Settlement proceeds to exporter" : null;

    docket.push({
      action: `Verdict received via bridge: ${label}`,
      txHash,
      blockNumber: Number(anyLog.blockNumber),
      timestamp: t(anyLog),
      actor: null,
      details: [reasoning, outcome].filter(Boolean).join("\n") || null,
      evidence: null,
      source: "LayerZero",
      links: [basescanLink(txHash), lzLink(txHash)],
    });
  }

  // Settled — funds released to exporter (no dispute path — plain accept → settle)
  settledLogs.forEach((log) => {
    // Skip if this tx was already merged into the verdict entry above
    if (verdictTxSet.has(log.transactionHash!)) return;
    const amount = log.args.amount ? (Number(log.args.amount) / 1e18).toLocaleString() : "—";
    docket.push({
      action: "Settlement released to exporter",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.exporter || null,
      details: `${amount} MockPEN transferred to exporter.`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // Cancelled
  cancelledLogs.forEach((log) => {
    const amount = log.args.refundAmount ? (Number(log.args.refundAmount) / 1e18).toLocaleString() : "—";
    docket.push({
      action: "Trade cancelled",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.by || null,
      details: `Reason code: ${log.args.reasonCode ?? "—"} · Refund: ${amount} MockPEN`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // SettlementManualReview
  manualReviewLogs.forEach((log) => {
    const deadline = log.args.reviewDeadline ? new Date(Number(log.args.reviewDeadline) * 1000).toUTCString() : "—";
    docket.push({
      action: "Evidence insufficient — manual review window opened",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: null,
      details: `AI verdict: UNDETERMINED. Arbitrator may resolve within 14 days.\nReview deadline: ${deadline}`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // ManualReviewResolved
  manualReviewResolvedLogs.forEach((log) => {
    docket.push({
      action: `Manual review resolved: ${log.args.timeliness ? "TIMELY" : "LATE"}`,
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.arbitrator || null,
      details: log.args.reason || null,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // ManualReviewTimedOut
  manualReviewTimedOutLogs.forEach((log) => {
    docket.push({
      action: "Manual review timed out — default refund to importer",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.caller || null,
      details: "14-day review window expired with no ruling. Importer bears evidence burden; funds returned.",
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // ExceptionFlagged
  exceptionFlaggedLogs.forEach((log) => {
    docket.push({
      action: "Exception flagged",
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: t(log),
      actor: log.args.flagger || null,
      details: `Reason code: ${log.args.reasonCode ?? "—"}`,
      evidence: null,
      source: "Base",
      links: [basescanLink(log.transactionHash!)],
    });
  });

  // GenLayer entry — single collapsed entry, timestamp placed between dispute and verdict.
  // Compute bounds from the docket we just built.
  try {
    const rawGlEntries = await glEntriesPromise;
    if (rawGlEntries.length > 0) {
      // Find the timestamp of the dispute forwarded event (lower bound)
      const contestedTs = docket
        .filter((e) => e.source === "LayerZero" && e.action.includes("disputed"))
        .map((e) => e.timestamp)
        .find((ts) => ts > 0) ?? 0;

      // Find the timestamp of the verdict received event (upper bound)
      const verdictTs = docket
        .filter((e) => e.source === "LayerZero" && e.action.includes("Verdict received"))
        .map((e) => e.timestamp)
        .find((ts) => ts > 0) ?? 0;

      // Compute midpoint; fall back to simple offsets if bounds unknown
      const glTimestamp = contestedTs > 0 && verdictTs > contestedTs
        ? Math.floor((contestedTs + verdictTs) / 2)
        : contestedTs > 0
        ? contestedTs + 240  // ~4 min after dispute
        : verdictTs > 0
        ? verdictTs - 60     // ~1 min before verdict
        : (rawGlEntries[0]?.timestamp ?? 0);

      // Collapse to single GenLayer entry: prefer the verdict entry (most informative)
      const verdictEntry = rawGlEntries.find((e) => e.action.toLowerCase().includes("verdict"));
      const entry = verdictEntry ?? rawGlEntries[0];

      docket.push({
        ...entry,
        timestamp: glTimestamp,
        blockNumber: 0, // GenLayer has no Base block number
      });
    }
  } catch { /* GL entries unavailable — skip */ }

  docket.sort((a, b) => a.timestamp !== b.timestamp ? a.timestamp - b.timestamp : a.blockNumber - b.blockNumber);
  return docket;
}

// ─── Agreement.sol docket builder (unchanged from original) ──────────────────

async function buildAgreementDocket(
  agreementAddress: `0x${string}`,
  factoryAddress: `0x${string}`,
  caseId: number,
  deployBlock: bigint,
  currentBlock: bigint,
  glEntriesPromise: Promise<DocketEntry[]>,
): Promise<DocketEntry[]> {
  const creationLogs = await getLogsChunked({
    address: factoryAddress,
    event: parseAbiItem("event AgreementCreated(uint256 indexed id, address agreementAddress, address partyA, address partyB)"),
    args: { id: BigInt(caseId) },
    fromBlock: deployBlock,
    toBlock: currentBlock,
  }).catch(() => []);

  const fromBlock = creationLogs[0]?.blockNumber ?? deployBlock;

  const fetch = (sig: string) =>
    getLogsChunked({ address: agreementAddress, event: parseAbiItem(sig), fromBlock, toBlock: currentBlock }).catch(() => []);

  const [
    agreementAcceptedLogs, outcomeProposedLogs, outcomeConfirmedLogs,
    disputeRaisedLogs, evidenceSubmittedLogs, resolutionTriggeredLogs,
    resolvedLogs, fundsClaimedLogs, cancelledLogs,
  ] = await Promise.all([
    fetch("event AgreementAccepted(address indexed partyB, uint256 escrowAmount)"),
    fetch("event OutcomeProposed(address indexed proposer, bool statementIsTrue)"),
    fetch("event OutcomeConfirmed(uint8 verdict)"),
    fetch("event DisputeRaised(address indexed raisedBy, uint256 evidenceDeadline)"),
    fetch("event EvidenceSubmitted(address indexed submitter)"),
    fetch("event ResolutionTriggered(uint256 timestamp)"),
    fetch("event Resolved(uint8 verdict, string reasoning)"),
    fetch("event FundsClaimed(address indexed claimant, uint256 amount)"),
    fetch("event Cancelled(address indexed cancelledBy)"),
  ]);

  const [disputeRequestedLogs, verdictReceivedLogs] = await Promise.all([
    getLogsChunked({ address: factoryAddress, event: parseAbiItem("event DisputeRequested(address indexed agreementAddress, uint256 timestamp)"), args: { agreementAddress }, fromBlock: deployBlock, toBlock: currentBlock }).catch(() => []),
    getLogsChunked({ address: factoryAddress, event: parseAbiItem("event VerdictReceived(address indexed agreementAddress, uint8 verdict)"), args: { agreementAddress }, fromBlock: deployBlock, toBlock: currentBlock }).catch(() => []),
  ]);

  const [statement, partyA, partyB, escrowAmount, evidenceA, evidenceB, evidenceDeadlineSeconds] = await Promise.all([
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "statement" }).catch(() => ""),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyA" }).catch(() => ""),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "partyB" }).catch(() => ""),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "escrowAmount" }).catch(() => BigInt(0)),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceA" }).catch(() => ""),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceB" }).catch(() => ""),
    publicClient.readContract({ address: agreementAddress, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" }).catch(() => BigInt(0)),
  ]);

  const escrowFormatted = formatUnits(escrowAmount as bigint, 6);

  const allLogs = [
    ...creationLogs, ...agreementAcceptedLogs, ...outcomeProposedLogs, ...outcomeConfirmedLogs,
    ...disputeRaisedLogs, ...evidenceSubmittedLogs, ...resolutionTriggeredLogs,
    ...resolvedLogs, ...fundsClaimedLogs, ...cancelledLogs,
    ...disputeRequestedLogs, ...verdictReceivedLogs,
  ];

  const uniqueBlocks = [...new Set(allLogs.map((l) => l.blockNumber))];
  const blockData = await Promise.all(uniqueBlocks.map((bn) => publicClient.getBlock({ blockNumber: bn })));
  const ts = new Map<bigint, number>(blockData.map((b) => [b.number, Number(b.timestamp)]));
  const t = (log: any) => ts.get(log.blockNumber) || 0;

  const docket: DocketEntry[] = [];

  creationLogs.forEach((log) => {
    docket.push({ action: "Agreement created", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.partyA || null, details: `Statement: "${statement}"\nParty A: ${partyA}\nParty B: ${partyB}\nEscrow: ${escrowFormatted} USDC`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  agreementAcceptedLogs.forEach((log) => {
    const amt = log.args.escrowAmount ? formatUnits(log.args.escrowAmount, 6) : "0";
    docket.push({ action: "Party B accepted the agreement", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.partyB || null, details: `Escrow deposited: ${amt} USDC`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  outcomeProposedLogs.forEach((log) => {
    docket.push({ action: `Outcome proposed: ${log.args.statementIsTrue ? "Party A Wins" : "Party B Wins"}`, txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.proposer || null, details: null, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  outcomeConfirmedLogs.forEach((log) => {
    docket.push({ action: "Outcome confirmed by mutual agreement", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: null, details: `Verdict: ${getVerdictName(Number(log.args.verdict ?? 0))}`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  disputeRaisedLogs.forEach((log) => {
    const deadlineSec = Number(evidenceDeadlineSeconds || 0);
    docket.push({ action: "Dispute raised — evidence window opened", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.raisedBy || null, details: `Evidence deadline: ${deadlineSec > 0 ? Math.round(deadlineSec / 60) + " minutes" : "none"}`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  evidenceSubmittedLogs.forEach((log) => {
    const submitter = (log.args.submitter || "").toLowerCase();
    const isA = submitter === (partyA as string).toLowerCase();
    docket.push({ action: `Evidence submitted by ${isA ? "Party A" : "Party B"}`, txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.submitter || null, details: null, evidence: isA ? (evidenceA as string) || null : (evidenceB as string) || null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  resolutionTriggeredLogs.forEach((log) => {
    docket.push({ action: "Resolution triggered — sent to AI jury", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: null, details: "Both parties submitted evidence. Case forwarded to AI jury for judgment.", evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  disputeRequestedLogs.forEach((log) => {
    docket.push({ action: "Dispute forwarded via LayerZero bridge", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: null, details: "Cross-chain message dispatched from Base for AI jury evaluation.", evidence: null, source: "LayerZero", links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)] });
  });
  resolvedLogs.forEach((log) => {
    docket.push({ action: `Verdict delivered: ${getVerdictName(Number(log.args.verdict ?? 0))}`, txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: null, details: log.args.reasoning || null, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  verdictReceivedLogs.forEach((log) => {
    docket.push({ action: `Verdict received from bridge: ${getVerdictName(Number(log.args.verdict ?? 0))}`, txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: null, details: "Verdict relayed via LayerZero V2 to Base Sepolia.", evidence: null, source: "LayerZero", links: [basescanLink(log.transactionHash!), lzLink(log.transactionHash!)] });
  });
  fundsClaimedLogs.forEach((log) => {
    docket.push({ action: "Funds claimed", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.claimant || null, details: `${log.args.amount ? formatUnits(log.args.amount, 6) : "0"} USDC withdrawn`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });
  cancelledLogs.forEach((log) => {
    docket.push({ action: "Agreement cancelled", txHash: log.transactionHash!, blockNumber: Number(log.blockNumber), timestamp: t(log), actor: log.args.cancelledBy || null, details: `Escrow of ${escrowFormatted} USDC returned`, evidence: null, source: "Base", links: [basescanLink(log.transactionHash!)] });
  });

  try {
    const glEntries = await glEntriesPromise;
    if (glEntries.length) docket.push(...glEntries);
  } catch { /* relay not configured */ }

  docket.sort((a, b) => a.timestamp !== b.timestamp ? a.timestamp - b.timestamp : a.blockNumber - b.blockNumber);
  return docket;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let agreementAddress: `0x${string}`;
    let caseId: number = -1;
    let factoryAddress: `0x${string}` = FACTORY_REGISTRY[0].address;
    let deployBlock: bigint = BigInt(FACTORY_REGISTRY[0].deploymentBlock);

    if (id.startsWith("0x") && id.length === 42) {
      agreementAddress = id as `0x${string}`;
      const found = await findFactory(agreementAddress);
      if (found) {
        caseId = found.caseId;
        factoryAddress = found.factoryAddress;
        deployBlock = found.deploymentBlock;
      }
    } else {
      caseId = parseInt(id, 10);
      if (isNaN(caseId) || caseId < 0) {
        return NextResponse.json({ error: "Invalid case ID" }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
      for (const f of FACTORY_REGISTRY) {
        try {
          const addr = await publicClient.readContract({ address: f.address, abi: FACTORY_ABI, functionName: "agreements", args: [BigInt(caseId)] }) as string;
          if (addr && addr !== "0x0000000000000000000000000000000000000000") {
            agreementAddress = addr as `0x${string}`;
            factoryAddress = f.address;
            deployBlock = BigInt(f.deploymentBlock);
            break;
          }
        } catch { /* skip */ }
      }
      if (!agreementAddress!) {
        return NextResponse.json({ error: "Case not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
      }
    }

    const currentBlock = await publicClient.getBlockNumber();

    // GenLayer oracle entries: try relay service first, fall back to static metadata.
    const relayBaseUrl = process.env.RELAY_BASE_URL?.trim();
    const glEntriesPromise: Promise<DocketEntry[]> = (async () => {
      // 1. Try relay service if configured
      if (relayBaseUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);
          const r = await fetch(`${relayBaseUrl.replace(/\/$/, "")}/cases/${agreementAddress}/gl`, { signal: controller.signal });
          clearTimeout(timeout);
          if (r.ok) {
            const data = await r.json();
            const entries = (data.entries || []) as DocketEntry[];
            if (entries.length > 0) return entries;
          }
        } catch { /* fall through to static */ }
      }

      // 2. Fall back to static GL oracle metadata (always available on Vercel)
      const meta = getGlOracleMeta(agreementAddress);
      if (!meta) return [];

      const glExplorerUrl = `https://explorer-studio.genlayer.com/transactions/${meta.oracleTxHash}`;
      // Single collapsed GenLayer entry — oracle deploys + evaluates + dispatches in one tx.
      // Timestamp will be overridden by buildTradeFxDocket using actual Base event bounds.
      const validatorLine = meta.validators
        ? `${meta.validators.agree + meta.validators.disagree} validators · ${meta.validators.agree} agree · ${meta.validators.disagree} disagree`
        : null;
      const verdictLine = meta.verdict ?? "UNDETERMINED";
      const entries: DocketEntry[] = [{
        action: `AI jury evaluated — verdict: ${verdictLine}`,
        txHash: meta.oracleTxHash,
        blockNumber: 0,
        timestamp: meta.timestamp, // will be overridden in buildTradeFxDocket
        actor: null,
        details: [validatorLine].filter(Boolean).join("\n") || null,
        evidence: null,
        source: "GenLayer",
        links: [{ label: "GenLayer Explorer", url: glExplorerUrl }],
      }];

      return entries;
    })();

    // Detect contract type and route to correct docket builder
    const tradeFx = await isTradeFx(agreementAddress);

    const docket = tradeFx
      ? await buildTradeFxDocket(agreementAddress, deployBlock, currentBlock, glEntriesPromise, factoryAddress, caseId, deployBlock)
      : await buildAgreementDocket(agreementAddress, factoryAddress, caseId, deployBlock, currentBlock, glEntriesPromise);

    return NextResponse.json({ docket, contractType: tradeFx ? "TradeFxSettlement" : "Agreement" }, {
      headers: { "Cache-Control": "no-store" },
    });

  } catch (err) {
    console.error("GET /api/cases/[id]/docket error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
