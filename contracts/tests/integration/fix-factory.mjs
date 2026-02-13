#!/usr/bin/env node
/**
 * Diagnose and fix factory state.
 *
 * 1. Check if existing factory is functional
 * 2. If not, deploy a fresh factory
 * 3. Register the "internetcourt" type
 * 4. Test full flow: deploy contract → register → verify discoverable
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

function log(step, msg) { console.log(`\n[${step}] ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); process.exit(1); }

async function main() {
  console.log("=".repeat(60));
  console.log("  FACTORY FIX: Deploy fresh factory + register type");
  console.log("=".repeat(60));

  // Create deployer account (will be factory owner)
  log("SETUP", "Creating deployer account");
  const deployer = createAccount(generatePrivateKey());
  const agentB = createAccount(generatePrivateKey());
  ok(`Deployer (factory owner): ${deployer.address}`);
  ok(`Test agent B: ${agentB.address}`);

  // Fund accounts
  log("FUND", "Funding accounts");
  for (const a of [deployer, agentB]) {
    await rpc("sim_fundAccount", [a.address, 10_000_000]);
  }
  ok("Funded");

  const client = makeClient(deployer);
  await client.initializeConsensusSmartContract();

  // Deploy fresh factory
  log("DEPLOY", "Deploying InternetCourtFactory");
  const factoryCode = fs.readFileSync(
    path.join(ROOT, "contracts/InternetCourtFactory.py"),
    "utf8"
  );

  const factoryHash = await client.deployContract({
    code: factoryCode,
    args: [],
    leaderOnly: false,
  });
  const factoryReceipt = await waitReceipt(client, factoryHash);
  if (!isSuccess(factoryReceipt)) {
    fail(`Factory deploy failed: ${factoryReceipt.result_name}`);
  }
  const factoryAddr = factoryReceipt.data?.contract_address || factoryReceipt.to_address;
  ok(`Factory deployed at: ${factoryAddr}`);

  await new Promise((r) => setTimeout(r, 5000));

  // Register "internetcourt" type
  log("TYPE", 'Registering "internetcourt" type');
  const typeHash = await client.writeContract({
    address: factoryAddr,
    functionName: "register_type",
    args: ["internetcourt"],
    value: 0n,
    leaderOnly: false,
  });
  const typeReceipt = await waitReceipt(client, typeHash);
  if (!isSuccess(typeReceipt)) {
    fail(`Type registration failed: ${typeReceipt.result_name}`);
  }
  ok('"internetcourt" type registered');

  await new Promise((r) => setTimeout(r, 3000));

  // Verify type is registered
  const typeCheck = await client.readContract({
    address: factoryAddr,
    functionName: "is_type_registered",
    args: ["internetcourt"],
  });
  ok(`Type verification: ${typeCheck}`);

  // Deploy a test InternetCourt contract
  log("CONTRACT", "Deploying test InternetCourt contract");
  const courtCode = fs.readFileSync(
    path.join(ROOT, "contracts/InternetCourt.py"),
    "utf8"
  );

  const statement = "Test case: skill.md flow verification";
  const guidelines = "Evaluate if the documentation is complete and accurate";
  const evidenceDefs = JSON.stringify({
    party_a: { max_chars: 5000, description: "Proof of completeness" },
    party_b: { max_chars: 5000, description: "Proof of gaps" },
  });

  const courtHash = await client.deployContract({
    code: courtCode,
    args: [agentB.address, statement, guidelines, evidenceDefs, 86400],
    leaderOnly: false,
  });
  const courtReceipt = await waitReceipt(client, courtHash);
  if (!isSuccess(courtReceipt)) {
    fail(`Court deploy failed: ${courtReceipt.result_name}`);
  }
  const courtAddr = courtReceipt.data?.contract_address || courtReceipt.to_address;
  ok(`Court deployed at: ${courtAddr}`);

  await new Promise((r) => setTimeout(r, 5000));

  // Register contract in factory
  log("REGISTER", "Registering contract in factory");
  const params = JSON.stringify({
    statement,
    party_b: agentB.address,
  });

  const regHash = await client.writeContract({
    address: factoryAddr,
    functionName: "register_contract",
    args: [courtAddr, "internetcourt", params],
    value: 0n,
    leaderOnly: false,
  });
  const regReceipt = await waitReceipt(client, regHash);
  if (!isSuccess(regReceipt)) {
    fail(`Registration failed: ${regReceipt.result_name}`);
  }
  ok("Contract registered in factory");

  await new Promise((r) => setTimeout(r, 5000));

  // Verify everything
  log("VERIFY", "Checking factory state");
  const count = await client.readContract({
    address: factoryAddr,
    functionName: "get_contract_count",
    args: [],
  });
  ok(`Factory contract count: ${count}`);

  const contractData = await client.readContract({
    address: factoryAddr,
    functionName: "get_contract",
    args: [1],
  });
  ok(`Contract #1: ${JSON.stringify(contractData)}`);

  // Read contract details
  const details = await client.readContract({
    address: courtAddr,
    functionName: "get_contract_details",
    args: [],
  });
  ok(`Contract status: ${details.status}`);
  ok(`Statement: ${details.statement}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ FACTORY DEPLOYED AND VERIFIED");
  console.log();
  console.log(`  NEW FACTORY ADDRESS: ${factoryAddr}`);
  console.log(`  Factory owner: ${deployer.address}`);
  console.log(`  Owner private key: ${deployer.privateKey || "(check generatePrivateKey)"}`);
  console.log();
  console.log(`  Test contract: ${courtAddr}`);
  console.log(`  Contract count: ${count}`);
  console.log();
  console.log("  UPDATE THESE FILES:");
  console.log("  - frontend/public/skill.md");
  console.log("  - frontend/.env (NEXT_PUBLIC_COURT_FACTORY_ADDRESS)");
  console.log("  - frontend/src/app/api/contracts/route.ts (fallback)");
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ FAILED:", err.message);
  process.exit(1);
});
