#!/usr/bin/env node
/**
 * Test: skill.md Quick Start flow
 *
 * Tests the exact flow documented in skill.md, specifically verifying
 * that factory registration (Step 3b) makes contracts discoverable.
 *
 * Usage: node contracts/tests/integration/test-skill-flow.mjs
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
const FACTORY_ADDRESS = "0xAA55c2768855A483b5D8C8926585Cdb940207898";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];

function makeClient(account) {
  return createClient({ chain: studionet, account });
}

async function waitReceipt(client, hash) {
  return client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
}

function isSuccess(receipt) {
  return receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
}

function log(step, msg) {
  console.log(`\n[${ step }] ${msg}`);
}
function ok(msg) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg) {
  console.error(`  ❌ ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("  TEST: skill.md Quick Start Flow");
  console.log("  Verifying factory registration makes contracts discoverable");
  console.log("=".repeat(60));

  // --- Step 1: Both agents create wallets ---
  log("STEP 1", "Creating wallets for Agent A and Agent B");
  const agentA = createAccount(generatePrivateKey());
  const agentB = createAccount(generatePrivateKey());
  ok(`Agent A: ${agentA.address}`);
  ok(`Agent B: ${agentB.address}`);

  // --- Step 2: Fund both accounts ---
  log("STEP 2", "Funding both accounts");
  for (const agent of [agentA, agentB]) {
    await rpc("sim_fundAccount", [agent.address, 10_000_000]);
  }
  ok("Both accounts funded");

  // --- Step 3: Agent A deploys the contract ---
  log("STEP 3", "Agent A deploys InternetCourt contract");
  const clientA = makeClient(agentA);
  await clientA.initializeConsensusSmartContract();

  const contractCode = fs.readFileSync(
    path.join(ROOT, "contracts/InternetCourt.py"),
    "utf8"
  );

  const statement = "Test case from skill.md flow verification";
  const guidelines = "Evaluate if the skill.md documentation is complete and accurate";
  const evidenceDefs = JSON.stringify({
    party_a: { max_chars: 5000, description: "Proof of documentation completeness" },
    party_b: { max_chars: 5000, description: "Proof of documentation gaps" },
  });

  const deployHash = await clientA.deployContract({
    code: contractCode,
    args: [agentB.address, statement, guidelines, evidenceDefs, 86400],
    leaderOnly: false,
  });

  const deployReceipt = await waitReceipt(clientA, deployHash);
  if (!isSuccess(deployReceipt)) {
    fail(`Deploy failed: ${deployReceipt.result_name || deployReceipt.result}`);
  }

  const contractAddress =
    deployReceipt.data?.contract_address || deployReceipt.to_address;
  ok(`Contract deployed at: ${contractAddress}`);

  // Wait for propagation
  await new Promise((r) => setTimeout(r, 5000));

  // --- Check factory count BEFORE registration ---
  log("CHECK", "Reading factory contract count BEFORE registration");
  const countBefore = await clientA.readContract({
    address: FACTORY_ADDRESS,
    functionName: "get_contract_count",
    args: [],
  });
  ok(`Factory contract count before: ${countBefore}`);

  // --- Step 3b: Register with Factory (the NEW step we're testing) ---
  log("STEP 3b", "Registering contract with factory (REQUIRED)");

  // First verify the type is registered
  const typeRegistered = await clientA.readContract({
    address: FACTORY_ADDRESS,
    functionName: "is_type_registered",
    args: ["internetcourt"],
  });
  ok(`Type "internetcourt" registered: ${typeRegistered}`);

  if (!typeRegistered) {
    fail('"internetcourt" type not registered on factory — cannot proceed');
  }

  const params = JSON.stringify({
    statement,
    party_b: agentB.address,
  });

  const regHash = await clientA.writeContract({
    address: FACTORY_ADDRESS,
    functionName: "register_contract",
    args: [contractAddress, "internetcourt", params],
    value: 0n,
    leaderOnly: false,
  });

  const regReceipt = await waitReceipt(clientA, regHash);
  if (!isSuccess(regReceipt)) {
    fail(
      `Factory registration failed: ${regReceipt.result_name || regReceipt.result}`
    );
  }
  ok("Contract registered in factory");

  // Wait for propagation
  await new Promise((r) => setTimeout(r, 5000));

  // --- Verify: factory count increased ---
  log("VERIFY", "Checking factory contract count AFTER registration");
  const countAfter = await clientA.readContract({
    address: FACTORY_ADDRESS,
    functionName: "get_contract_count",
    args: [],
  });
  ok(`Factory contract count after: ${countAfter}`);

  if (Number(countAfter) > Number(countBefore)) {
    ok(`Count increased from ${countBefore} → ${countAfter}`);
  } else {
    fail(`Count did NOT increase: ${countBefore} → ${countAfter}`);
  }

  // --- Verify: can retrieve our contract from factory ---
  log("VERIFY", "Retrieving our contract from factory by ID");
  const contractData = await clientA.readContract({
    address: FACTORY_ADDRESS,
    functionName: "get_contract",
    args: [Number(countAfter)],
  });
  ok(`Factory entry: ${JSON.stringify(contractData)}`);

  const registeredAddress = contractData?.address || contractData?.[0];
  if (
    registeredAddress &&
    registeredAddress.toLowerCase() === contractAddress.toLowerCase()
  ) {
    ok("Contract address matches — factory registration verified!");
  } else {
    fail(
      `Address mismatch: expected ${contractAddress}, got ${registeredAddress}`
    );
  }

  // --- Verify: contract details readable ---
  log("VERIFY", "Reading contract details directly");
  const details = await clientA.readContract({
    address: contractAddress,
    functionName: "get_contract_details",
    args: [],
  });
  ok(`Status: ${details.status}`);
  ok(`Statement: ${details.statement}`);
  ok(`Party A: ${details.party_a}`);
  ok(`Party B: ${details.party_b}`);

  // --- Summary ---
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ ALL CHECKS PASSED");
  console.log("");
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Factory ID: ${countAfter}`);
  console.log(`  Statement: ${statement}`);
  console.log("");
  console.log("  The skill.md flow works correctly.");
  console.log("  Factory registration makes the contract discoverable.");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message);
  process.exit(1);
});
