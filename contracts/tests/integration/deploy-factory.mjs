#!/usr/bin/env node
/**
 * Deploy fresh InternetCourtFactory to GenLayer Studionet
 *
 * Steps:
 *   1. Generate new account + fund via sim_fundAccount
 *   2. Initialize consensus
 *   3. Load contracts/InternetCourtFactory.py contract code
 *   4. Deploy via client.deployContract({ code, args: [], leaderOnly: false })
 *   5. Wait for TransactionStatus.ACCEPTED
 *   6. Register "internetcourt" type via register_type
 *   7. Verify: is_type_registered("internetcourt") returns true, get_contract_count() returns 0
 *
 * Usage: node contracts/tests/integration/deploy-factory.mjs
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
const FUND_AMOUNT = 10_000_000;

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

function readContractCode(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
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

async function deployContract(client, code, args = []) {
  const hash = await client.deployContract({ code, args, leaderOnly: false });
  const receipt = await waitReceipt(client, hash);
  const isSuccess =
    receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    throw new Error(
      `Deploy failed: ${receipt.result_name || receipt.result} -- ${JSON.stringify(receipt.data).substring(0, 500)}`
    );
  }
  const address = receipt.data?.contract_address || receipt.to_address;
  await sleep(5000);
  return { hash, receipt, address };
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
  console.log("Deploy Fresh InternetCourtFactory to GenLayer Studionet");
  console.log("=".repeat(70));

  // Step 1: Create a funded wallet
  console.log("\n--- Step 1: Create and fund account ---");
  const account = createAccount(generatePrivateKey());
  ok(`Account address: ${account.address}`);

  await fundAccount(account.address);
  await sleep(3000);
  ok("Account funded with 10M tokens");

  // Step 2: Initialize client + consensus
  console.log("\n--- Step 2: Initialize client + consensus ---");
  const client = makeClient(account);
  await client.initializeConsensusSmartContract();
  ok("Consensus initialized");

  // Step 3: Load factory contract code
  console.log("\n--- Step 3: Load InternetCourtFactory contract code ---");
  const factoryCode = readContractCode("contracts/InternetCourtFactory.py");
  ok(`Contract code loaded (${factoryCode.length} chars)`);

  // Step 4-5: Deploy factory contract
  console.log("\n--- Step 4: Deploy InternetCourtFactory ---");
  info("Deploying... (this may take 1-3 minutes)");
  const deployResult = await deployContract(client, factoryCode, []);
  const factoryAddress = deployResult.address;
  ok(`Factory deployed at: ${factoryAddress}`);
  ok(`Deploy tx hash: ${deployResult.hash}`);

  // Step 6: Register "internetcourt" type
  console.log('\n--- Step 5: Register "internetcourt" type ---');
  const regResult = await writeContract(client, factoryAddress, "register_type", [
    "internetcourt",
  ]);
  if (regResult.isSuccess) {
    ok('Type "internetcourt" registered successfully');
  } else {
    throw new Error(
      `register_type failed: ${regResult.receipt.result_name || regResult.receipt.result}`
    );
  }

  // Step 7: Verify deployment
  console.log("\n--- Step 6: Verify deployment ---");

  // 7a: is_type_registered("internetcourt") should return "true"
  const isReg = await readState(
    client,
    factoryAddress,
    "is_type_registered",
    ["internetcourt"]
  );
  const typeRegistered = isReg === "true" || isReg === true;
  if (typeRegistered) {
    ok('is_type_registered("internetcourt") = true');
  } else {
    console.log(`  FAIL: is_type_registered returned: ${isReg}`);
  }

  // 7b: get_contract_count() should return 0
  const count = await readState(client, factoryAddress, "get_contract_count");
  const countVal = typeof count === "string" ? parseInt(count) : Number(count);
  if (countVal === 0) {
    ok(`get_contract_count() = 0 (empty factory, as expected)`);
  } else {
    console.log(`  WARN: get_contract_count() returned ${count} (expected 0)`);
  }

  // 7c: get_owner() should match deployer
  const owner = await readState(client, factoryAddress, "get_owner");
  const ownerMatch =
    owner?.toLowerCase() === account.address.toLowerCase();
  if (ownerMatch) {
    ok(`get_owner() matches deployer: ${owner}`);
  } else {
    console.log(`  WARN: get_owner() = ${owner}, deployer = ${account.address}`);
  }

  // Final summary
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(70)}`);
  console.log("DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(70));
  console.log("");
  console.log(`  Factory Address:  ${factoryAddress}`);
  console.log(`  Owner Address:    ${account.address}`);
  console.log(`  Type Registered:  internetcourt = ${typeRegistered}`);
  console.log(`  Contract Count:   ${countVal}`);
  console.log(`  Deploy Time:      ${elapsed}s`);
  console.log(`  Network:          GenLayer Studionet`);
  console.log("");
  console.log("=".repeat(70));
  console.log(`NEW FACTORY ADDRESS: ${factoryAddress}`);
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
