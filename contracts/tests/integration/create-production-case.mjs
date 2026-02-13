#!/usr/bin/env node
/**
 * Create a case on studionet following the skill.md flow,
 * then verify it's visible on the production internetcourt.org API.
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

async function waitReceipt(client, hash) {
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("  PRODUCTION CASE: skill.md flow on studionet");
  console.log("=".repeat(60));

  // Step 1: Create wallets
  log("STEP 1", "Creating wallets");
  const agentA = createAccount(generatePrivateKey());
  const agentB = createAccount(generatePrivateKey());
  ok(`Party A: ${agentA.address}`);
  ok(`Party B: ${agentB.address}`);

  // Step 2: Fund
  log("STEP 2", "Funding accounts");
  for (const a of [agentA, agentB]) {
    await rpc("sim_fundAccount", [a.address, 10_000_000]);
  }
  ok("Funded");

  // Step 3: Deploy contract
  log("STEP 3", "Deploying InternetCourt contract");
  const clientA = createClient({ chain: studionet, account: agentA });
  await clientA.initializeConsensusSmartContract();

  const code = fs.readFileSync(path.join(ROOT, "contracts/InternetCourt.py"), "utf8");

  const statement = "Agent Clawdia delivered the overnight dashboard improvements including screen sharing, security panel, mobile design, and real-time updates";
  const guidelines = "Evaluate deliverables against the four requirements: 1) Screen sharing functionality, 2) Security panel with access controls, 3) Mobile-responsive design, 4) Real-time WebSocket updates. Consider both presence and quality of implementation.";
  const evidenceDefs = JSON.stringify({
    party_a: { max_chars: 10000, description: "Proof of delivery: code, logs, screenshots, deployment evidence" },
    party_b: { max_chars: 10000, description: "Proof of deficiency: missing features, quality issues, spec violations" },
  });

  const deployHash = await clientA.deployContract({
    code,
    args: [agentB.address, statement, guidelines, evidenceDefs, 86400],
    leaderOnly: false,
  });
  const deployReceipt = await waitReceipt(clientA, deployHash);
  if (!isSuccess(deployReceipt)) throw new Error(`Deploy failed: ${deployReceipt.result_name}`);

  const CONTRACT = deployReceipt.data?.contract_address || deployReceipt.to_address;
  ok(`Contract: ${CONTRACT}`);
  await new Promise(r => setTimeout(r, 5000));

  // Step 3b: Register with factory
  log("STEP 3b", "Registering with factory (REQUIRED)");
  const params = JSON.stringify({ statement, party_b: agentB.address });

  const regHash = await clientA.writeContract({
    address: FACTORY,
    functionName: "register_contract",
    args: [CONTRACT, "internetcourt", params],
    value: 0n,
    leaderOnly: false,
  });
  const regReceipt = await waitReceipt(clientA, regHash);
  if (!isSuccess(regReceipt)) throw new Error(`Registration failed: ${regReceipt.result_name}`);
  ok("Registered in factory");
  await new Promise(r => setTimeout(r, 5000));

  // Verify factory
  log("VERIFY", "Checking factory");
  const contracts = await clientA.readContract({
    address: FACTORY,
    functionName: "get_contracts_by_type",
    args: ["internetcourt"],
  });
  const list = typeof contracts === "string" ? JSON.parse(contracts) : contracts;
  ok(`Total contracts in factory: ${Array.isArray(list) ? list.length : "?"}`);
  const found = Array.isArray(list) && list.some(c => c.address?.toLowerCase() === CONTRACT.toLowerCase());
  ok(`Our contract in factory: ${found}`);

  // Check production API
  log("VERIFY", "Checking internetcourt.org production API");
  try {
    const res = await fetch("https://internetcourt.org/api/contracts");
    const data = await res.json();
    console.log(`  API response: ${data.contracts?.length || 0} contracts`);
    if (data.contracts?.length > 0) {
      for (const c of data.contracts) {
        console.log(`    - ${c.status}: ${c.statement?.substring(0, 60)}... (${c.address})`);
      }
    }
    const inProd = data.contracts?.some(c => c.address?.toLowerCase() === CONTRACT.toLowerCase());
    if (inProd) {
      ok("✅ Contract visible on internetcourt.org!");
    } else {
      console.log("  ⚠️  Not visible yet on internetcourt.org — may need Vercel env var update");
    }
  } catch (e) {
    console.log(`  ⚠️  Could not reach internetcourt.org: ${e.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  CASE CREATED ON STUDIONET");
  console.log();
  console.log(`  Contract:  ${CONTRACT}`);
  console.log(`  Party A:   ${agentA.address}`);
  console.log(`  Party B:   ${agentB.address}`);
  console.log(`  Factory:   ${FACTORY}`);
  console.log(`  Statement: ${statement.substring(0, 70)}...`);
  console.log(`  Status:    created (waiting for Party B to accept)`);
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("\n❌ FAILED:", err.message);
  process.exit(1);
});
