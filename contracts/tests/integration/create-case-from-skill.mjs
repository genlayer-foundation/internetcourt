#!/usr/bin/env node
/**
 * Create a case following skill.md Quick Start flow exactly.
 * Tests the full documented flow: deploy → register → verify discoverable.
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const RPC = "https://studio.genlayer.com/api";
const FACTORY = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";

const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];

// --- Helpers (same as skill.md SDK example) ---

let rpcId = 0;
async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: ++rpcId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

function isSuccess(receipt) {
  return receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
}

function log(step, msg) { console.log(`\n[${step}] ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }

// ============================================================
// SKILL.MD QUICK START FLOW
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("  Creating a case following skill.md instructions");
  console.log("=".repeat(60));

  // --- Step 1: Both agents create wallets ---
  log("STEP 1", "Both agents create wallets");
  const agentA = createAccount(generatePrivateKey());
  const agentB = createAccount(generatePrivateKey());
  ok(`Agent A (Clawdia): ${agentA.address}`);
  ok(`Agent B (Counterparty): ${agentB.address}`);

  // --- Step 2: Fund both accounts (free, instant) ---
  log("STEP 2", "Funding both accounts");
  for (const agent of [agentA, agentB]) {
    await rpc("sim_fundAccount", [agent.address, 10_000_000]);
  }
  ok("Both accounts funded");

  // --- Step 3: Agent A deploys the contract ---
  log("STEP 3", "Agent A deploys InternetCourt contract");
  const clientA = createClient({ chain: studionet, account: agentA });
  await clientA.initializeConsensusSmartContract();

  const contractCode = fs.readFileSync(
    path.join(ROOT, "contracts/InternetCourt.py"), "utf8"
  );

  const statement = "Clawdia completed the overnight dashboard improvements as requested";
  const guidelines = "Evaluate if deliverables match: screen sharing, security panel, mobile design, real-time updates";
  const evidenceDefs = JSON.stringify({
    party_a: {
      max_chars: 10000,
      description: "Proof of delivery: code diffs, deployment logs, screenshots"
    },
    party_b: {
      max_chars: 10000,
      description: "Proof of deficiency: missing features, failing tests, incomplete work"
    },
  });

  const deployHash = await clientA.deployContract({
    code: contractCode,
    args: [agentB.address, statement, guidelines, evidenceDefs, 86400],
    leaderOnly: false,
  });

  const deployReceipt = await clientA.waitForTransactionReceipt({
    hash: deployHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });

  if (!isSuccess(deployReceipt)) {
    throw new Error(`Deploy failed: ${deployReceipt.result_name}`);
  }

  const CONTRACT = deployReceipt.data?.contract_address || deployReceipt.to_address;
  ok(`Contract deployed at: ${CONTRACT}`);

  await new Promise(r => setTimeout(r, 5000));

  // --- Step 3b: Register with Factory (REQUIRED for UI discoverability) ---
  log("STEP 3b", "Registering contract with factory (REQUIRED)");

  const params = JSON.stringify({
    statement,
    party_b: agentB.address,
  });

  const regHash = await clientA.writeContract({
    address: FACTORY,
    functionName: "register_contract",
    args: [CONTRACT, "internetcourt", params],
    value: 0n,
    leaderOnly: false,
  });

  const regReceipt = await clientA.waitForTransactionReceipt({
    hash: regHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });

  if (!isSuccess(regReceipt)) {
    throw new Error(`Factory registration failed: ${regReceipt.result_name}`);
  }
  ok("Contract registered in factory");

  await new Promise(r => setTimeout(r, 5000));

  // --- Step 4: Agent B accepts the contract ---
  log("STEP 4", "Agent B accepts the contract");
  const clientB = createClient({ chain: studionet, account: agentB });
  await clientB.initializeConsensusSmartContract();

  const acceptHash = await clientB.writeContract({
    address: CONTRACT,
    functionName: "accept_contract",
    args: [],
    value: 0n,
    leaderOnly: false,
  });

  const acceptReceipt = await clientB.waitForTransactionReceipt({
    hash: acceptHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok(`Contract accepted by Agent B`);

  await new Promise(r => setTimeout(r, 3000));

  // --- Step 5: Try mutual resolution — but they disagree! ---
  log("STEP 5", "Both parties propose outcomes (they disagree)");

  // Agent A proposes TRUE ("I completed the work")
  const proposeAHash = await clientA.writeContract({
    address: CONTRACT,
    functionName: "propose_outcome",
    args: ["TRUE"],
    value: 0n,
    leaderOnly: false,
  });
  await clientA.waitForTransactionReceipt({
    hash: proposeAHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok("Agent A proposes TRUE");

  await new Promise(r => setTimeout(r, 3000));

  // Agent B proposes FALSE ("No you didn't")
  const proposeBHash = await clientB.writeContract({
    address: CONTRACT,
    functionName: "propose_outcome",
    args: ["FALSE"],
    value: 0n,
    leaderOnly: false,
  });
  await clientB.waitForTransactionReceipt({
    hash: proposeBHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok("Agent B proposes FALSE — disagreement!");

  await new Promise(r => setTimeout(r, 3000));

  // --- Step 6: Initiate dispute ---
  log("STEP 6", "Agent A initiates dispute");
  const disputeHash = await clientA.writeContract({
    address: CONTRACT,
    functionName: "initiate_dispute",
    args: [],
    value: 0n,
    leaderOnly: false,
  });
  await clientA.waitForTransactionReceipt({
    hash: disputeHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok("Dispute initiated");

  await new Promise(r => setTimeout(r, 3000));

  // --- Step 7: Both sides submit evidence ---
  log("STEP 7", "Both parties submit evidence");

  const evidenceA = "Dashboard built with screen sharing via WebRTC, security panel with RBAC controls, responsive mobile CSS with breakpoints at 768px and 1024px, WebSocket-based real-time updates with heartbeat. All code committed to dashboard/ directory. Deployment verified on staging.";

  const evAHash = await clientA.writeContract({
    address: CONTRACT,
    functionName: "submit_evidence",
    args: [evidenceA],
    value: 0n,
    leaderOnly: false,
  });
  await clientA.waitForTransactionReceipt({
    hash: evAHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok("Agent A submitted evidence");

  await new Promise(r => setTimeout(r, 3000));

  const evidenceB = "Screen sharing is screenshot-based, not real-time video streaming. Security panel has no unit tests and RBAC is hardcoded. Mobile CSS is basic media queries without proper touch interactions. WebSocket implementation lacks reconnection logic and error handling.";

  const evBHash = await clientB.writeContract({
    address: CONTRACT,
    functionName: "submit_evidence",
    args: [evidenceB],
    value: 0n,
    leaderOnly: false,
  });
  await clientB.waitForTransactionReceipt({
    hash: evBHash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  ok("Agent B submitted evidence");

  await new Promise(r => setTimeout(r, 3000));

  // --- Step 8: Trigger AI jury resolution ---
  log("STEP 8", "Triggering AI jury resolution (this takes ~2 minutes)");
  const resolveHash = await clientA.writeContract({
    address: CONTRACT,
    functionName: "resolve",
    args: [],
    value: 0n,
    leaderOnly: false,
  });
  const resolveReceipt = await clientA.waitForTransactionReceipt({
    hash: resolveHash,
    status: TransactionStatus.ACCEPTED,
    retries: 180,
    interval: 5000,
  });
  ok(`Resolution complete: ${resolveReceipt.result_name}`);

  await new Promise(r => setTimeout(r, 5000));

  // --- Step 9: Read the verdict ---
  log("STEP 9", "Reading verdict");
  const verdict = await clientA.readContract({
    address: CONTRACT,
    functionName: "get_verdict",
    args: [],
  });
  ok(`Verdict: ${verdict}`);

  const details = await clientA.readContract({
    address: CONTRACT,
    functionName: "get_contract_details",
    args: [],
  });
  ok(`Status: ${details.status}`);
  ok(`Reasoning: ${details.reasoning || "(none provided)"}`);

  // --- Verify: discoverable via factory ---
  log("VERIFY", "Checking contract is discoverable via factory");
  const contracts = await clientA.readContract({
    address: FACTORY,
    functionName: "get_contracts_by_type",
    args: ["internetcourt"],
  });
  const found = Array.isArray(contracts)
    ? contracts.some(c => c.address?.toLowerCase() === CONTRACT.toLowerCase())
    : JSON.stringify(contracts).toLowerCase().includes(CONTRACT.toLowerCase());
  ok(`Found in factory: ${found}`);

  // --- Verify: API endpoint returns it ---
  log("VERIFY", "Checking API endpoint at localhost:3333");
  try {
    const apiRes = await fetch("http://localhost:3333/api/contracts");
    const apiData = await apiRes.json();
    const inApi = apiData.contracts?.some(
      c => c.address?.toLowerCase() === CONTRACT.toLowerCase()
    );
    ok(`Found in API response: ${inApi}`);
    ok(`Total contracts in API: ${apiData.contracts?.length || 0}`);
  } catch (e) {
    console.log(`  ⚠️  Could not reach localhost:3333 — ${e.message}`);
  }

  // --- Summary ---
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ CASE CREATED SUCCESSFULLY");
  console.log();
  console.log(`  Contract: ${CONTRACT}`);
  console.log(`  Party A: ${agentA.address}`);
  console.log(`  Party B: ${agentB.address}`);
  console.log(`  Statement: ${statement}`);
  console.log(`  Verdict: ${verdict}`);
  console.log(`  Factory: ${FACTORY}`);
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("\n❌ FAILED:", err.message);
  process.exit(1);
});
