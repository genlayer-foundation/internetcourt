#!/usr/bin/env node
/**
 * InternetCourt Integration Test — GenLayer Studio
 *
 * Deploys InternetCourtFactory + InternetCourt, runs full lifecycle test,
 * and queries factory registry.
 *
 * Usage: node contracts/tests/integration/deploy-and-test.mjs
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

function readContract(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];

async function waitReceipt(client, hash) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 120,
    interval: 5000,
  });
  return receipt;
}

async function deploy(client, code, args = []) {
  const hash = await client.deployContract({ code, args, leaderOnly: false });
  const receipt = await waitReceipt(client, hash);
  const isSuccess = receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    throw new Error(
      `Deploy failed: ${receipt.result_name || receipt.result} — ${JSON.stringify(receipt.data).substring(0, 300)}`
    );
  }
  const address = receipt.data?.contract_address || receipt.to_address;
  // Wait extra for propagation
  await new Promise((r) => setTimeout(r, 5000));
  return { hash, receipt, address };
}

async function write(client, address, functionName, args = [], value = 0n) {
  const hash = await client.writeContract({ address, functionName, args, value, leaderOnly: false });
  const receipt = await waitReceipt(client, hash);
  const isSuccess = receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    console.log(`  ⚠ write ${functionName} result: ${receipt.result_name || receipt.result}`);
  }
  // Wait extra for propagation
  await new Promise((r) => setTimeout(r, 3000));
  return { hash, receipt };
}

async function read(client, address, functionName, args = []) {
  // Retry with backoff for propagation delays
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await client.readContract({ address, functionName, args });
    } catch (e) {
      if (attempt < 4 && e.message?.includes("not deployed")) {
        console.log(`  ⏳ Read retry ${attempt + 1}/5 for ${functionName}...`);
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

function log(label, msg) {
  console.log(`\n[${"=".repeat(3)}] ${label}`);
  if (msg !== undefined) console.log(typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
}

function ok(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); }

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const report = { steps: [], errors: [], addresses: {} };
  const t0 = Date.now();

  // ── Step 1: Create wallets ──────────────────────────────────
  log("STEP 1", "Creating wallets");
  const deployer = createAccount(generatePrivateKey());
  const partyA = createAccount(generatePrivateKey());
  const partyB = createAccount(generatePrivateKey());

  const wallets = {
    deployer: { address: deployer.address, privateKey: `(generated)` },
    party_a: { address: partyA.address, privateKey: `(generated)` },
    party_b: { address: partyB.address, privateKey: `(generated)` },
  };
  ok(`Deployer: ${deployer.address}`);
  ok(`Party A:  ${partyA.address}`);
  ok(`Party B:  ${partyB.address}`);

  // Save wallet addresses (not private keys) to JSON
  const walletsPath = path.join(__dirname, "wallets.json");
  fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
  ok(`Wallets saved to ${walletsPath}`);

  // ── Step 2: Fund wallets ────────────────────────────────────
  log("STEP 2", "Funding wallets");
  await Promise.all([
    fundAccount(deployer.address),
    fundAccount(partyA.address),
    fundAccount(partyB.address),
  ]);
  await new Promise((r) => setTimeout(r, 3000));
  ok("All 3 wallets funded");

  // ── Step 3: Initialize consensus ────────────────────────────
  log("STEP 3", "Initializing clients");
  const deployerClient = makeClient(deployer);
  const partyAClient = makeClient(partyA);
  const partyBClient = makeClient(partyB);

  await deployerClient.initializeConsensusSmartContract();
  await partyAClient.initializeConsensusSmartContract();
  await partyBClient.initializeConsensusSmartContract();
  ok("Consensus initialized for all 3 clients");

  // ── Step 4: Deploy InternetCourtFactory ─────────────────────────
  log("STEP 4", "Deploying InternetCourtFactory");
  const factoryCode = readContract("contracts/InternetCourtFactory.py");
  let factoryAddr;
  try {
    const result = await deploy(deployerClient, factoryCode, []);
    factoryAddr = result.address;
    report.addresses.factory = factoryAddr;
    ok(`Factory deployed at ${factoryAddr}`);
    report.steps.push({ step: 4, status: "ok", detail: `Factory: ${factoryAddr}` });
  } catch (e) {
    fail(`Factory deploy failed: ${e.message}`);
    report.errors.push({ step: 4, error: e.message });
    throw e;
  }

  // ── Step 5: Register "internetcourt" type in factory ────────────
  log("STEP 5", "Registering 'internetcourt' contract type");
  try {
    await write(deployerClient, factoryAddr, "register_type", ["internetcourt"]);
    ok("Type 'internetcourt' registered");

    const isReg = await read(deployerClient, factoryAddr, "is_type_registered", ["internetcourt"]);
    ok(`is_type_registered('internetcourt') = ${isReg}`);
    report.steps.push({ step: 5, status: "ok" });
  } catch (e) {
    fail(`register_type failed: ${e.message}`);
    report.errors.push({ step: 5, error: e.message });
  }

  // ── Step 6: Deploy InternetCourt instance ───────────────────────
  log("STEP 6", "Deploying InternetCourt instance");
  const courtCode = readContract("contracts/InternetCourt.py");
  const evidenceDefs = JSON.stringify({
    party_a: { type: "text", max_chars: 10000 },
    party_b: { type: "text", max_chars: 10000 },
  });
  let courtAddr;
  try {
    const result = await deploy(deployerClient, courtCode, [
      partyB.address,                                           // party_b
      "The API endpoint returns valid JSON for all documented routes", // statement
      "Test each documented API route and verify response is valid JSON with correct schema", // guidelines
      evidenceDefs,                                             // evidence_defs
      3600,                                                     // evidence_deadline_seconds
    ]);
    courtAddr = result.address;
    report.addresses.court = courtAddr;
    ok(`Court deployed at ${courtAddr}`);
    report.steps.push({ step: 6, status: "ok", detail: `Court: ${courtAddr}` });
  } catch (e) {
    fail(`Court deploy failed: ${e.message}`);
    report.errors.push({ step: 6, error: e.message });
    throw e;
  }

  // ── Step 7: Register court in factory ───────────────────────
  log("STEP 7", "Registering court in factory");
  try {
    const params = JSON.stringify({
      statement: "The API endpoint returns valid JSON for all documented routes",
      party_a: deployer.address,
      party_b: partyB.address,
    });
    await write(deployerClient, factoryAddr, "register_contract", [courtAddr, "internetcourt", params]);
    ok("Court registered in factory");
    report.steps.push({ step: 7, status: "ok" });
  } catch (e) {
    fail(`register_contract failed: ${e.message}`);
    report.errors.push({ step: 7, error: e.message });
  }

  // ── Step 8: Verify initial status ──────────────────────────
  log("STEP 8", "Checking initial contract status");
  try {
    const rawStatus = await read(deployerClient, courtAddr, "get_status", []);
    const status = typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;
    ok(`Status: ${status.status}`);
    ok(`Statement: ${status.statement?.substring(0, 60)}...`);
    ok(`Party A: ${status.party_a}`);
    ok(`Party B: ${status.party_b}`);

    if (status.status !== "created") fail(`Expected 'created', got '${status.status}'`);
    else ok("Status is 'created' as expected");
    report.steps.push({ step: 8, status: "ok", detail: status });
  } catch (e) {
    fail(`get_status failed: ${e.message}`);
    report.errors.push({ step: 8, error: e.message });
  }

  // ── Step 9: Party B accepts contract ───────────────────────
  log("STEP 9", "Party B accepts the contract");
  try {
    await write(partyBClient, courtAddr, "accept_contract", []);
    const rawStatus = await read(partyBClient, courtAddr, "get_status", []);
    const status = typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;
    ok(`Status after accept: ${status.status}`);
    if (status.status !== "active") fail(`Expected 'active', got '${status.status}'`);
    else ok("Contract is ACTIVE");
    report.steps.push({ step: 9, status: "ok" });
  } catch (e) {
    fail(`accept_contract failed: ${e.message}`);
    report.errors.push({ step: 9, error: e.message });
  }

  // ── Step 10: Party A proposes TRUE ─────────────────────────
  log("STEP 10", "Party A proposes outcome TRUE");
  try {
    await write(deployerClient, courtAddr, "propose_outcome", ["TRUE"]);
    ok("Party A proposed TRUE");
    report.steps.push({ step: 10, status: "ok" });
  } catch (e) {
    fail(`propose_outcome (A) failed: ${e.message}`);
    report.errors.push({ step: 10, error: e.message });
  }

  // ── Step 11: Party B proposes FALSE (triggers dispute) ─────
  log("STEP 11", "Party B proposes outcome FALSE");
  try {
    await write(partyBClient, courtAddr, "propose_outcome", ["FALSE"]);
    ok("Party B proposed FALSE");

    // Check status — should still be active since proposals differ
    const rawStatus = await read(deployerClient, courtAddr, "get_status", []);
    const status = typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;
    ok(`Status after conflicting proposals: ${status.status}`);
    report.steps.push({ step: 11, status: "ok", detail: status.status });
  } catch (e) {
    fail(`propose_outcome (B) failed: ${e.message}`);
    report.errors.push({ step: 11, error: e.message });
  }

  // ── Step 12: Initiate dispute ──────────────────────────────
  log("STEP 12", "Party A initiates dispute");
  try {
    await write(deployerClient, courtAddr, "initiate_dispute", []);
    const rawStatus = await read(deployerClient, courtAddr, "get_status", []);
    const status = typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;
    ok(`Status after dispute initiation: ${status.status}`);
    if (status.status !== "disputed") fail(`Expected 'disputed', got '${status.status}'`);
    else ok("Contract is DISPUTED");
    report.steps.push({ step: 12, status: "ok" });
  } catch (e) {
    fail(`initiate_dispute failed: ${e.message}`);
    report.errors.push({ step: 12, error: e.message });
  }

  // ── Step 13: Party A submits evidence ──────────────────────
  log("STEP 13", "Party A submits evidence");
  try {
    const evidenceA = JSON.stringify({
      test_results: "All 47 API routes tested. 47/47 returned valid JSON matching documented schemas.",
      methodology: "Automated test runner hit each endpoint with sample requests.",
      timestamp: new Date().toISOString(),
    });
    await write(deployerClient, courtAddr, "submit_evidence", [evidenceA]);
    ok("Party A evidence submitted");
    report.steps.push({ step: 13, status: "ok" });
  } catch (e) {
    fail(`submit_evidence (A) failed: ${e.message}`);
    report.errors.push({ step: 13, error: e.message });
  }

  // ── Step 14: Party B submits evidence ──────────────────────
  log("STEP 14", "Party B submits evidence");
  try {
    const evidenceB = JSON.stringify({
      test_results: "Independent testing found 3 routes returning 500 errors and 2 routes with invalid JSON.",
      failing_routes: ["/api/users/delete", "/api/reports/export", "/api/settings/reset"],
      invalid_json_routes: ["/api/status", "/api/health"],
      timestamp: new Date().toISOString(),
    });
    await write(partyBClient, courtAddr, "submit_evidence", [evidenceB]);
    ok("Party B evidence submitted");
    report.steps.push({ step: 14, status: "ok" });
  } catch (e) {
    fail(`submit_evidence (B) failed: ${e.message}`);
    report.errors.push({ step: 14, error: e.message });
  }

  // ── Step 15: Check evidence ────────────────────────────────
  log("STEP 15", "Verifying submitted evidence");
  try {
    const rawEvidence = await read(deployerClient, courtAddr, "get_evidence", []);
    const evidence = typeof rawEvidence === "string" ? JSON.parse(rawEvidence) : rawEvidence;
    ok(`Evidence A present: ${evidence.evidence_a?.length > 0}`);
    ok(`Evidence B present: ${evidence.evidence_b?.length > 0}`);
    report.steps.push({ step: 15, status: "ok" });
  } catch (e) {
    fail(`get_evidence failed: ${e.message}`);
    report.errors.push({ step: 15, error: e.message });
  }

  // ── Step 16: Trigger resolution (AI jury) ──────────────────
  log("STEP 16", "Triggering AI jury resolution");
  try {
    const { hash, receipt } = await write(deployerClient, courtAddr, "resolve", []);
    ok(`Resolve tx: ${hash}`);
    ok(`Resolve result: ${receipt.result_name || receipt.result}`);

    const rawStatus = await read(deployerClient, courtAddr, "get_status", []);
    const status = typeof rawStatus === "string" ? JSON.parse(rawStatus) : rawStatus;
    ok(`Status after resolve: ${status.status}`);
    ok(`Verdict: ${status.verdict}`);
    ok(`Reasoning: ${status.reasoning?.substring(0, 120)}...`);
    report.steps.push({ step: 16, status: "ok", detail: { verdict: status.verdict, reasoning: status.reasoning } });
  } catch (e) {
    fail(`resolve failed: ${e.message}`);
    report.errors.push({ step: 16, error: e.message });
  }

  // ── Step 17: Query factory ─────────────────────────────────
  log("STEP 17", "Testing factory queries");
  try {
    // Get contract by ID
    const contract0 = await read(deployerClient, factoryAddr, "get_contract", [0]);
    const parsed = typeof contract0 === "string" ? JSON.parse(contract0) : contract0;
    ok(`Contract #0: type=${parsed.contract_type}, address=${parsed.address}`);

    // Get by type
    const byType = await read(deployerClient, factoryAddr, "get_contracts_by_type", ["internetcourt"]);
    const typeList = typeof byType === "string" ? JSON.parse(byType) : byType;
    ok(`Contracts of type 'internetcourt': ${typeList.length}`);

    // Get by deployer
    const byDeployer = await read(deployerClient, factoryAddr, "get_contracts_by_deployer", [deployer.address]);
    const depList = typeof byDeployer === "string" ? JSON.parse(byDeployer) : byDeployer;
    ok(`Contracts by deployer: ${depList.length}`);

    // Get count
    const count = await read(deployerClient, factoryAddr, "get_contract_count", []);
    ok(`Total contracts: ${count}`);

    // Get owner
    const owner = await read(deployerClient, factoryAddr, "get_owner", []);
    ok(`Factory owner: ${owner}`);
    ok(`Matches deployer: ${owner?.toLowerCase() === deployer.address.toLowerCase()}`);

    report.steps.push({ step: 17, status: "ok", detail: { count, byType: typeList.length, byDeployer: depList.length } });
  } catch (e) {
    fail(`factory query failed: ${e.message}`);
    report.errors.push({ step: 17, error: e.message });
  }

  // ── Step 18: Get full contract details ─────────────────────
  log("STEP 18", "Full contract details");
  try {
    const rawDetails = await read(deployerClient, courtAddr, "get_contract_details", []);
    const details = typeof rawDetails === "string" ? JSON.parse(rawDetails) : rawDetails;
    console.log(JSON.stringify(details, null, 2));
    report.steps.push({ step: 18, status: "ok" });
  } catch (e) {
    fail(`get_contract_details failed: ${e.message}`);
    report.errors.push({ step: 18, error: e.message });
  }

  // ── Save report ────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  report.elapsed_seconds = parseFloat(elapsed);
  report.timestamp = new Date().toISOString();

  const reportPath = path.join(__dirname, "test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log("DONE", `Completed in ${elapsed}s — ${report.errors.length} errors`);
  console.log(`\nFactory address: ${factoryAddr}`);
  console.log(`Court address:   ${courtAddr}`);
  console.log(`Report saved to: ${reportPath}`);

  // Return for programmatic use
  return report;
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
