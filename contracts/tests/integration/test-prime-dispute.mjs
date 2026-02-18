#!/usr/bin/env node
/**
 * InternetCourt Live Test — "7 is prime" dispute with AI jury
 *
 * Deploys a fresh InternetCourt with prompt_non_comparative,
 * runs full lifecycle including AI jury resolution on studionet.
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
    retries: 180,      // longer timeout for resolve()
    interval: 5000,
  });
  return receipt;
}

async function deployContract(client, code, args = []) {
  const hash = await client.deployContract({ code, args, leaderOnly: false });
  const receipt = await waitReceipt(client, hash);
  const isSuccess = receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    throw new Error(
      `Deploy failed: ${receipt.result_name || receipt.result} — ${JSON.stringify(receipt.data).substring(0, 500)}`
    );
  }
  const address = receipt.data?.contract_address || receipt.to_address;
  await new Promise((r) => setTimeout(r, 5000));
  return { hash, receipt, address };
}

async function writeContract(client, address, functionName, args = [], value = 0n) {
  const hash = await client.writeContract({ address, functionName, args, value, leaderOnly: false });
  const receipt = await waitReceipt(client, hash);
  const isSuccess = receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
  if (!isSuccess) {
    console.log(`  !! write ${functionName} result: ${receipt.result_name || receipt.result}`);
    console.log(`  !! receipt data: ${JSON.stringify(receipt.data).substring(0, 500)}`);
  }
  await new Promise((r) => setTimeout(r, 3000));
  return { hash, receipt, isSuccess };
}

async function readState(client, address, functionName, args = []) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await client.readContract({ address, functionName, args });
    } catch (e) {
      if (attempt < 4 && e.message?.includes("not deployed")) {
        console.log(`  ... Read retry ${attempt + 1}/5 for ${functionName}...`);
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}

function log(step, msg) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`STEP ${step}: ${msg}`);
  console.log("=".repeat(60));
}

function ok(msg) { console.log(`  OK: ${msg}`); }
function info(msg) { console.log(`  >> ${msg}`); }

function parseResult(raw) {
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const results = {};

  // ── STEP 1: Create wallets ──
  log(1, "Creating wallets");
  const partyA = createAccount(generatePrivateKey());
  const partyB = createAccount(generatePrivateKey());
  ok(`Party A (deployer): ${partyA.address}`);
  ok(`Party B:            ${partyB.address}`);
  results.partyA = partyA.address;
  results.partyB = partyB.address;

  // ── STEP 2: Fund wallets ──
  log(2, "Funding wallets");
  await Promise.all([
    fundAccount(partyA.address),
    fundAccount(partyB.address),
  ]);
  await new Promise((r) => setTimeout(r, 3000));
  ok("Both wallets funded with 10M tokens");

  // ── STEP 3: Initialize clients ──
  log(3, "Initializing clients + consensus");
  const clientA = makeClient(partyA);
  const clientB = makeClient(partyB);
  await clientA.initializeConsensusSmartContract();
  await clientB.initializeConsensusSmartContract();
  ok("Consensus initialized for both clients");

  // ── STEP 4: Deploy InternetCourt ──
  log(4, "Deploying InternetCourt with prime number test case");
  const courtCode = readContract("contracts/InternetCourt.py");
  const evidenceDefs = JSON.stringify({
    party_a: { type: "text", max_chars: 5000 },
    party_b: { type: "text", max_chars: 5000 },
  });

  const deployResult = await deployContract(clientA, courtCode, [
    partyB.address,                                          // party_b
    "The number 7 is a prime number.",                        // statement
    "Evaluate whether the mathematical claim in the statement is true. A prime number is only divisible by 1 and itself.",  // guidelines
    evidenceDefs,                                             // evidence_defs
    3600,                                                     // evidence_deadline_seconds
  ]);
  const courtAddr = deployResult.address;
  ok(`Court deployed at: ${courtAddr}`);
  ok(`Deploy tx: ${deployResult.hash}`);
  ok(`Deploy result: ${deployResult.receipt.result_name || deployResult.receipt.result}`);
  results.courtAddress = courtAddr;
  results.deployTxHash = deployResult.hash;
  results.deployReceipt = deployResult.receipt;

  // ── STEP 5: Verify initial status ──
  log(5, "Checking initial contract status");
  const initStatus = parseResult(await readState(clientA, courtAddr, "get_status"));
  ok(`Status: ${initStatus.status}`);
  ok(`Statement: ${initStatus.statement}`);
  ok(`Party A: ${initStatus.party_a}`);
  ok(`Party B: ${initStatus.party_b}`);
  results.initialStatus = initStatus;

  // ── STEP 6: Party B accepts contract ──
  log(6, "Party B accepts the contract");
  const acceptResult = await writeContract(clientB, courtAddr, "accept_contract");
  ok(`Accept tx: ${acceptResult.hash}`);
  ok(`Accept result: ${acceptResult.receipt.result_name || acceptResult.receipt.result}`);
  const afterAccept = parseResult(await readState(clientA, courtAddr, "get_status"));
  ok(`Status after accept: ${afterAccept.status}`);
  results.acceptTxHash = acceptResult.hash;

  // ── STEP 7: Party A proposes PARTY_A ──
  log(7, "Party A proposes outcome: PARTY_A");
  const propAResult = await writeContract(clientA, courtAddr, "propose_outcome", ["PARTY_A"]);
  ok(`Propose A tx: ${propAResult.hash}`);
  ok(`Result: ${propAResult.receipt.result_name || propAResult.receipt.result}`);
  results.proposeATxHash = propAResult.hash;

  // ── STEP 8: Party B proposes PARTY_B (forces dispute) ──
  log(8, "Party B proposes outcome: PARTY_B (to force dispute)");
  const propBResult = await writeContract(clientB, courtAddr, "propose_outcome", ["PARTY_B"]);
  ok(`Propose B tx: ${propBResult.hash}`);
  ok(`Result: ${propBResult.receipt.result_name || propBResult.receipt.result}`);
  const afterPropose = parseResult(await readState(clientA, courtAddr, "get_status"));
  ok(`Status after conflicting proposals: ${afterPropose.status}`);
  results.proposeBTxHash = propBResult.hash;

  // ── STEP 9: Initiate dispute ──
  log(9, "Party A initiates dispute");
  const disputeResult = await writeContract(clientA, courtAddr, "initiate_dispute");
  ok(`Dispute tx: ${disputeResult.hash}`);
  ok(`Result: ${disputeResult.receipt.result_name || disputeResult.receipt.result}`);
  const afterDispute = parseResult(await readState(clientA, courtAddr, "get_status"));
  ok(`Status after dispute: ${afterDispute.status}`);
  results.disputeTxHash = disputeResult.hash;

  // ── STEP 10: Party A submits evidence ──
  log(10, "Party A submits evidence (supporting PARTY_A)");
  const evidenceA = "7 is prime because its only divisors are 1 and 7. Testing all integers up to sqrt(7) ~ 2.65: 7/2 = 3.5 (not integer), so 7 is prime.";
  const evAResult = await writeContract(clientA, courtAddr, "submit_evidence", [evidenceA]);
  ok(`Evidence A tx: ${evAResult.hash}`);
  ok(`Result: ${evAResult.receipt.result_name || evAResult.receipt.result}`);
  results.evidenceATxHash = evAResult.hash;

  // ── STEP 11: Party B submits evidence ──
  log(11, "Party B submits evidence (weak claim against)");
  const evidenceB = "I claim 7 is not prime, but I have no valid proof.";
  const evBResult = await writeContract(clientB, courtAddr, "submit_evidence", [evidenceB]);
  ok(`Evidence B tx: ${evBResult.hash}`);
  ok(`Result: ${evBResult.receipt.result_name || evBResult.receipt.result}`);
  results.evidenceBTxHash = evBResult.hash;

  // ── STEP 12: Verify evidence ──
  log(12, "Verifying submitted evidence");
  const evidence = parseResult(await readState(clientA, courtAddr, "get_evidence"));
  ok(`Evidence A: "${evidence.evidence_a.substring(0, 80)}..."`);
  ok(`Evidence B: "${evidence.evidence_b}"`);

  // ── STEP 13: RESOLVE — AI Jury decision ──
  log(13, "RESOLVING — calling AI jury (5 LLMs, prompt_non_comparative)");
  info("This may take 1-3 minutes as 5 validators process the prompt...");
  const resolveT0 = Date.now();
  const resolveResult = await writeContract(clientA, courtAddr, "resolve");
  const resolveTime = ((Date.now() - resolveT0) / 1000).toFixed(1);
  ok(`Resolve tx: ${resolveResult.hash}`);
  ok(`Resolve result_name: ${resolveResult.receipt.result_name || resolveResult.receipt.result}`);
  ok(`Resolve time: ${resolveTime}s`);
  ok(`Resolve success: ${resolveResult.isSuccess}`);
  results.resolveTxHash = resolveResult.hash;
  results.resolveReceipt = resolveResult.receipt;
  results.resolveTime = resolveTime;
  results.resolveSuccess = resolveResult.isSuccess;

  // Print full receipt data
  info("Full resolve receipt data:");
  console.log(JSON.stringify(resolveResult.receipt, null, 2));

  // ── STEP 14: Query final state ──
  log(14, "Querying final contract state");

  // get_status
  const finalStatus = parseResult(await readState(clientA, courtAddr, "get_status"));
  ok(`Final status: ${finalStatus.status}`);
  ok(`Verdict: ${finalStatus.verdict}`);
  ok(`Reasoning: ${finalStatus.reasoning}`);
  results.finalStatus = finalStatus;

  // get_verdict
  const verdict = parseResult(await readState(clientA, courtAddr, "get_verdict"));
  ok(`get_verdict(): ${JSON.stringify(verdict)}`);
  results.verdict = verdict;

  // get_contract_details
  const details = parseResult(await readState(clientA, courtAddr, "get_contract_details"));
  info("Full contract details:");
  console.log(JSON.stringify(details, null, 2));
  results.contractDetails = details;

  // ── Summary ──
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Court address:    ${courtAddr}`);
  console.log(`Party A:          ${partyA.address}`);
  console.log(`Party B:          ${partyB.address}`);
  console.log(`Resolve result:   ${resolveResult.receipt.result_name || resolveResult.receipt.result}`);
  console.log(`Verdict:          ${finalStatus.verdict}`);
  console.log(`Reasoning:        ${finalStatus.reasoning}`);
  console.log(`Resolve time:     ${resolveTime}s`);
  console.log(`Total time:       ${elapsed}s`);

  // Save full results
  const reportPath = path.join(__dirname, "prime-test-report.json");
  results.totalTime = elapsed;
  results.timestamp = new Date().toISOString();
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  return results;
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
