#!/usr/bin/env node
/**
 * Register 4 existing InternetCourt cases with the CORRECT factory.
 *
 * These cases were originally registered with the wrong factory
 * (0xAA55c2768855A483b5D8C8926585Cdb940207898). This script registers them
 * with the correct factory (0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE) that
 * the frontend uses.
 *
 * Usage: node contracts/tests/integration/register-with-factory.mjs
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const RPC = "https://studio.genlayer.com/api";
const FUND_AMOUNT = 10_000_000;
const FACTORY_ADDRESS = "0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE";

// The 4 cases to register (deployed by create-real-cases.mjs)
const CASES = [
  {
    name: "Case 1: REST API Delivery Quality",
    address: "0x23A0fA2e4D80315a91Eb90caC3e04A83c2FF4D76",
    statement:
      "Agent CodeBot delivered a production-ready REST API with authentication, rate limiting, and comprehensive error handling",
    party_a: "0x94e33D1bBa78d08F99E1C1255C559dc2FD5015BB",
    party_b: "0x64bd301d0424A44F36e69bd88034A21Bcb9Ca32b",
  },
  {
    name: "Case 2: Web Scraping Data Accuracy",
    address: "0xFBA2B7063eA517cB1EcFc68F0f5bF5DBcC3aAE39",
    statement:
      "The web scraping service extracted accurate pricing data for all 200 products from the target e-commerce site",
    party_a: "0x94e33D1bBa78d08F99E1C1255C559dc2FD5015BB",
    party_b: "0x64bd301d0424A44F36e69bd88034A21Bcb9Ca32b",
  },
  {
    name: "Case 3: Marketing Copy Creative Brief",
    address: "0xE9e8f34B69DfeC1cC90Dc0aa719F44852D032aBA",
    statement:
      "The AI-generated marketing copy for the product launch meets the creative brief specifications",
    party_a: "0x94e33D1bBa78d08F99E1C1255C559dc2FD5015BB",
    party_b: "0x64bd301d0424A44F36e69bd88034A21Bcb9Ca32b",
  },
  {
    name: "Case 4: Database Migration Completion",
    address: "0xbDeCECf1a701cC7927113Ef4ECEB45ec9C19c896",
    statement:
      "Agent DataBot completed the database migration from PostgreSQL to MongoDB within the agreed 4-hour maintenance window with zero data loss",
    party_a: "0x94e33D1bBa78d08F99E1C1255C559dc2FD5015BB",
    party_b: "0x64bd301d0424A44F36e69bd88034A21Bcb9Ca32b",
  },
];

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

async function fundAccount(address) {
  return rpc("sim_fundAccount", [address, FUND_AMOUNT]);
}

function makeClient(account) {
  return createClient({ chain: studionet, account });
}

const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];

async function waitReceipt(client, hash) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 180,
    interval: 5000,
  });
  return receipt;
}

async function writeContract(client, address, functionName, args = []) {
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value: 0n,
    leaderOnly: false,
  });
  const receipt = await waitReceipt(client, hash);
  const isSuccess =
    receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    console.log(
      `  !! write ${functionName} result: ${receipt.result_name || receipt.result}`
    );
    console.log(
      `  !! receipt data: ${JSON.stringify(receipt.data).substring(0, 500)}`
    );
  }
  await sleep(3000);
  return { hash, receipt, isSuccess };
}

async function readState(client, address, functionName, args = []) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await client.readContract({ address, functionName, args });
    } catch (e) {
      if (attempt < 4 && e.message?.includes("not deployed")) {
        console.log(
          `  ... Read retry ${attempt + 1}/5 for ${functionName}...`
        );
        await sleep(5000 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
}

function parseResult(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ok(msg) {
  console.log(`  OK: ${msg}`);
}
function info(msg) {
  console.log(`  >> ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();

  console.log("=".repeat(70));
  console.log("Register 4 cases with CORRECT factory");
  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log("=".repeat(70));

  // Step 1: Create a funded wallet
  console.log("\n--- Step 1: Create and fund wallet ---");
  const account = createAccount(generatePrivateKey());
  ok(`Account: ${account.address}`);

  await fundAccount(account.address);
  await sleep(3000);
  ok("Account funded");

  // Step 2: Initialize client + consensus
  console.log("\n--- Step 2: Initialize client ---");
  const client = makeClient(account);
  await client.initializeConsensusSmartContract();
  ok("Consensus initialized");

  // Step 3: Check if "internetcourt" type is registered
  console.log("\n--- Step 3: Check type registration ---");
  let typeRegistered = false;
  try {
    const isReg = await readState(
      client,
      FACTORY_ADDRESS,
      "is_type_registered",
      ["internetcourt"]
    );
    typeRegistered = isReg === "true" || isReg === true;
    ok(`Type 'internetcourt' registered: ${typeRegistered}`);
  } catch (e) {
    info(`Could not check type: ${e.message}`);
  }

  if (!typeRegistered) {
    info("Attempting to register 'internetcourt' type...");
    try {
      await writeContract(client, FACTORY_ADDRESS, "register_type", [
        "internetcourt",
      ]);
      ok("Type registered successfully");
      typeRegistered = true;
    } catch (e) {
      console.log(`  !! Could not register type: ${e.message}`);
      console.log(
        "  !! If not factory owner, type must already be registered."
      );
    }
  }

  // Step 4: Register each case
  console.log("\n--- Step 4: Register all 4 cases ---");
  let successCount = 0;

  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    const metadata = JSON.stringify({
      statement: c.statement,
      party_a: c.party_a,
      party_b: c.party_b,
    });

    info(`[${i + 1}/4] Registering ${c.name} (${c.address})...`);
    try {
      const result = await writeContract(
        client,
        FACTORY_ADDRESS,
        "register_contract",
        [c.address, "internetcourt", metadata]
      );
      if (result.isSuccess) {
        ok(`Registered successfully (tx: ${result.hash})`);
        successCount++;
      } else {
        console.log(
          `  !! Registration may have failed: ${result.receipt.result_name || result.receipt.result}`
        );
      }
    } catch (e) {
      console.log(`  !! Registration failed for case ${i + 1}: ${e.message}`);
    }
  }

  // Step 5: Verify by querying factory
  console.log("\n--- Step 5: Verify registration ---");
  try {
    const count = await readState(
      client,
      FACTORY_ADDRESS,
      "get_contract_count"
    );
    ok(`Total contracts in factory: ${count}`);
  } catch (e) {
    info(`Could not read contract count: ${e.message}`);
  }

  try {
    const byType = await readState(
      client,
      FACTORY_ADDRESS,
      "get_contracts_by_type",
      ["internetcourt"]
    );
    const typeList = parseResult(byType);
    ok(`Contracts of type 'internetcourt': ${typeList.length}`);

    console.log("\n  Registered contracts:");
    for (const entry of typeList) {
      const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
      console.log(`    - ${parsed.address} (id: ${parsed.id})`);
    }
  } catch (e) {
    info(`Could not list contracts by type: ${e.message}`);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(70)}`);
  console.log(
    `Done! ${successCount}/4 cases registered in ${elapsed}s`
  );
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
