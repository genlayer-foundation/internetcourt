#!/usr/bin/env node
/**
 * Register the old InternetCourt contract (from the old factory)
 * into the new factory on GenLayer studionet.
 *
 * Old contract: 0xFF4A8608618dB88c1Dff275C1434C5e65fF0699B
 * New factory:  0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const RPC = "https://studio.genlayer.com/api";
const FACTORY = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";
const OLD_CONTRACT = "0xFF4A8608618dB88c1Dff275C1434C5e65fF0699B";

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
function ok(msg) { console.log(`  OK: ${msg}`); }

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
  console.log("  REGISTER OLD CONTRACT INTO NEW FACTORY");
  console.log(`  Old contract: ${OLD_CONTRACT}`);
  console.log(`  New factory:  ${FACTORY}`);
  console.log("=".repeat(60));

  // Step 1: Create and fund account
  log("STEP 1", "Creating and funding account");
  const agent = createAccount(generatePrivateKey());
  await rpc("sim_fundAccount", [agent.address, 10_000_000]);
  ok(`Account: ${agent.address} (funded with 10M tokens)`);

  const client = createClient({ chain: studionet, account: agent });

  // Step 2: Read contract details from the old contract
  log("STEP 2", "Reading contract details from old contract");
  let details;
  try {
    details = await client.readContract({
      address: OLD_CONTRACT,
      functionName: "get_contract_details",
      args: [],
    });
    const parsed = typeof details === "string" ? JSON.parse(details) : details;
    console.log("  Contract details:", JSON.stringify(parsed, null, 2));
    details = parsed;
  } catch (e) {
    console.log(`  WARNING: Could not read contract details: ${e.message}`);
    console.log("  Trying raw RPC call...");
    try {
      details = await rpc("gen_call", [OLD_CONTRACT, "get_contract_details", []]);
      const parsed = typeof details === "string" ? JSON.parse(details) : details;
      console.log("  Contract details (via RPC):", JSON.stringify(parsed, null, 2));
      details = parsed;
    } catch (e2) {
      console.log(`  WARNING: RPC call also failed: ${e2.message}`);
      details = null;
    }
  }

  // Extract metadata from contract details
  const statement = details?.statement || "Unknown statement (old contract)";
  const partyB = details?.party_b || "";
  ok(`Statement: ${statement.substring(0, 80)}...`);
  ok(`Party B: ${partyB || "(unknown)"}`);

  // Step 3: Register contract in new factory
  log("STEP 3", "Registering old contract in new factory");
  const metadata = JSON.stringify({ statement, party_b: partyB });

  const regHash = await client.writeContract({
    address: FACTORY,
    functionName: "register_contract",
    args: [OLD_CONTRACT, "internetcourt", metadata],
    value: 0n,
    leaderOnly: false,
  });
  console.log(`  Registration tx hash: ${regHash}`);
  console.log("  Waiting for confirmation (this may take a few minutes)...");

  const regReceipt = await waitReceipt(client, regHash);
  if (!isSuccess(regReceipt)) {
    console.error("  Registration receipt:", JSON.stringify(regReceipt, null, 2));
    throw new Error(`Registration failed: ${regReceipt.result_name}`);
  }
  ok("Contract registered in factory!");
  console.log("  Receipt:", JSON.stringify(regReceipt, null, 2));

  // Step 4: Wait and verify
  log("STEP 4", "Waiting 5s then verifying factory state");
  await new Promise(r => setTimeout(r, 5000));

  const contracts = await client.readContract({
    address: FACTORY,
    functionName: "get_contracts_by_type",
    args: ["internetcourt"],
  });
  const list = typeof contracts === "string" ? JSON.parse(contracts) : contracts;
  const count = Array.isArray(list) ? list.length : "?";
  ok(`Total internetcourt contracts in factory: ${count}`);

  if (Array.isArray(list)) {
    for (const c of list) {
      const addr = c.address || c;
      const isOld = typeof addr === "string" && addr.toLowerCase() === OLD_CONTRACT.toLowerCase();
      console.log(`    - ${typeof addr === "string" ? addr : JSON.stringify(c)}${isOld ? " <-- OLD CONTRACT" : ""}`);
    }
  }

  const found = Array.isArray(list) && list.some(c => {
    const addr = c.address || c;
    return typeof addr === "string" && addr.toLowerCase() === OLD_CONTRACT.toLowerCase();
  });

  if (found) {
    ok("Old contract IS registered in the new factory!");
  } else {
    console.log("  WARNING: Old contract not found in factory results");
  }

  if (count === 5) {
    ok("EXPECTED COUNT OF 5 CONFIRMED!");
  } else {
    console.log(`  NOTE: Expected 5 contracts, got ${count}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  REGISTRATION COMPLETE");
  console.log();
  console.log(`  Old contract: ${OLD_CONTRACT}`);
  console.log(`  New factory:  ${FACTORY}`);
  console.log(`  Total count:  ${count} internetcourt contracts`);
  console.log(`  Found:        ${found}`);
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
