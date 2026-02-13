#!/usr/bin/env node
/**
 * Create a 4th case on studionet (web scraping service dispute),
 * register it with the factory, and verify all 4 contracts appear
 * on the production internetcourt.org API.
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
  console.log("  CREATE 4TH CASE: AI Web Scraping Service Dispute");
  console.log("=".repeat(60));

  // Step 1: Create wallets
  log("STEP 1", "Creating wallets for Party A and Party B");
  const agentA = createAccount(generatePrivateKey());
  const agentB = createAccount(generatePrivateKey());
  ok(`Party A (client): ${agentA.address}`);
  ok(`Party B (scraper agent): ${agentB.address}`);

  // Step 2: Fund accounts
  log("STEP 2", "Funding accounts via sim_fundAccount");
  for (const a of [agentA, agentB]) {
    await rpc("sim_fundAccount", [a.address, 10_000_000]);
  }
  ok("Both accounts funded with 10M tokens");

  // Step 3: Deploy InternetCourt contract
  log("STEP 3", "Deploying InternetCourt contract");
  const clientA = createClient({ chain: studionet, account: agentA });
  await clientA.initializeConsensusSmartContract();

  const code = fs.readFileSync(path.join(ROOT, "contracts/InternetCourt.py"), "utf8");

  const statement = "Agent ScrapeBot successfully delivered the web scraping service: extracting structured product data from 500 e-commerce pages with 95% accuracy and delivering results within the 24-hour SLA";
  const guidelines = "Evaluate deliverables against the contract requirements: 1) Structured data extraction from 500 specified e-commerce product pages, 2) Data accuracy of at least 95% (fields: title, price, availability, description, images), 3) Delivery within 24 hours of task acceptance, 4) Output in clean JSON format matching the agreed schema. Consider completeness, accuracy, timeliness, and format compliance.";
  const evidenceDefs = JSON.stringify({
    party_a: { max_chars: 10000, description: "Proof of delivery: sample extracted data, accuracy metrics, delivery timestamps, schema validation results" },
    party_b: { max_chars: 10000, description: "Proof of deficiency: missing pages, incorrect data samples, SLA breach evidence, schema violations" },
  });

  const deployHash = await clientA.deployContract({
    code,
    args: [agentB.address, statement, guidelines, evidenceDefs, 86400],
    leaderOnly: false,
  });
  console.log(`  Deploy tx hash: ${deployHash}`);
  console.log("  Waiting for confirmation (this may take a few minutes)...");

  const deployReceipt = await waitReceipt(clientA, deployHash);
  if (!isSuccess(deployReceipt)) {
    console.error("  Deploy receipt:", JSON.stringify(deployReceipt, null, 2));
    throw new Error(`Deploy failed: ${deployReceipt.result_name}`);
  }

  const CONTRACT = deployReceipt.data?.contract_address || deployReceipt.to_address;
  ok(`Contract deployed: ${CONTRACT}`);
  await new Promise(r => setTimeout(r, 5000));

  // Step 4: Register with factory
  log("STEP 4", "Registering contract with factory");
  const params = JSON.stringify({ statement, party_b: agentB.address });

  const regHash = await clientA.writeContract({
    address: FACTORY,
    functionName: "register_contract",
    args: [CONTRACT, "internetcourt", params],
    value: 0n,
    leaderOnly: false,
  });
  console.log(`  Register tx hash: ${regHash}`);
  console.log("  Waiting for confirmation...");

  const regReceipt = await waitReceipt(clientA, regHash);
  if (!isSuccess(regReceipt)) {
    console.error("  Register receipt:", JSON.stringify(regReceipt, null, 2));
    throw new Error(`Registration failed: ${regReceipt.result_name}`);
  }
  ok("Contract registered in factory");
  await new Promise(r => setTimeout(r, 5000));

  // Step 5: Verify factory discovery
  log("STEP 5", "Verifying factory discovery");
  const contracts = await clientA.readContract({
    address: FACTORY,
    functionName: "get_contracts_by_type",
    args: ["internetcourt"],
  });
  const list = typeof contracts === "string" ? JSON.parse(contracts) : contracts;
  const count = Array.isArray(list) ? list.length : "?";
  ok(`Total contracts in factory: ${count}`);

  if (Array.isArray(list)) {
    for (const c of list) {
      console.log(`    - ${c.address}`);
    }
  }

  const found = Array.isArray(list) && list.some(c => c.address?.toLowerCase() === CONTRACT.toLowerCase());
  ok(`Our new contract found in factory: ${found}`);

  // Step 6: Check production API
  log("STEP 6", "Checking internetcourt.org production API");
  // Wait a bit for API to pick up the new contract
  console.log("  Waiting 10s for API propagation...");
  await new Promise(r => setTimeout(r, 10000));

  try {
    const res = await fetch("https://internetcourt.org/api/contracts");
    const data = await res.json();
    const apiCount = data.contracts?.length || 0;
    console.log(`  API returned ${apiCount} contracts:`);
    if (data.contracts?.length > 0) {
      for (const c of data.contracts) {
        console.log(`    - [${c.status}] ${c.statement?.substring(0, 70)}...`);
        console.log(`      Address: ${c.address}`);
      }
    }
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.log(`  API errors: ${JSON.stringify(data.errors)}`);
    }

    const inProd = data.contracts?.some(c => c.address?.toLowerCase() === CONTRACT.toLowerCase());
    if (inProd) {
      ok("New contract IS visible on internetcourt.org!");
    } else {
      console.log("  WARNING: Not visible yet on internetcourt.org -- factory discovery may need a moment");
    }

    if (apiCount === 4) {
      ok("ALL 4 CONTRACTS CONFIRMED on production API!");
    } else {
      console.log(`  Expected 4 contracts, got ${apiCount}`);
    }
  } catch (e) {
    console.log(`  WARNING: Could not reach internetcourt.org: ${e.message}`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  4TH CASE CREATED SUCCESSFULLY");
  console.log();
  console.log(`  Contract:  ${CONTRACT}`);
  console.log(`  Party A:   ${agentA.address} (client)`);
  console.log(`  Party B:   ${agentB.address} (ScrapeBot agent)`);
  console.log(`  Factory:   ${FACTORY}`);
  console.log(`  Statement: ${statement.substring(0, 70)}...`);
  console.log(`  Status:    created (waiting for Party B to accept)`);
  console.log("=".repeat(60));
}

main().catch(err => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
