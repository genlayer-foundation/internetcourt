#!/usr/bin/env node
/**
 * Create 4 Realistic AI Agent Economy Disputes on GenLayer Studionet
 *
 * Each case has meaningful statements, guidelines, and conflicting evidence
 * that the AI jury (5 LLMs) must evaluate. Cases are registered with the
 * factory so they show up in the frontend.
 *
 * Usage: node contracts/tests/integration/create-real-cases.mjs
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
const FACTORY_ADDRESS = "0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE";

// ---------------------------------------------------------------------------
// Case Definitions
// ---------------------------------------------------------------------------

const CASES = [
  {
    name: "Case 1: REST API Delivery Quality",
    statement:
      "Agent CodeBot delivered a production-ready REST API with authentication, rate limiting, and comprehensive error handling",
    guidelines:
      "Evaluate whether the delivered code meets production standards. Check for: proper JWT authentication, rate limiting middleware, consistent error response format, input validation on all endpoints. All four criteria must be substantially met for a TRUE verdict. Minor imperfections are acceptable if the overall delivery is production-grade.",
    evidence_a:
      "Delivered Express.js API with passport-jwt middleware for JWT authentication on all protected routes. Configured express-rate-limit at 100 requests/minute globally. Built Joi validation schemas for all 12 endpoints including POST, PUT, and PATCH routes. Implemented standardized error handler middleware returning {error: string, code: number, details?: object} format consistently. All 47 unit tests passing with 94% code coverage. Deployed to staging at api.example.com with 99.8% uptime over 7 days of monitoring. Load tested with k6 at 500 concurrent users — p95 latency under 200ms.",
    evidence_b:
      "Independent code review findings: (1) Rate limiting is only applied to /auth/* routes via express-rate-limit, NOT applied to /api/* resource routes — any client can hammer /api/users or /api/orders without throttling. (2) Error responses include full stack traces when NODE_ENV is not explicitly set to 'production', which is the case on the staging deployment where errors leak internal paths. (3) No input validation whatsoever on the PATCH /users/:id endpoint — accepts arbitrary fields including 'role' and 'isAdmin'. (4) 3 of the 47 tests are marked as .skip() and do not actually run — true passing count is 44/47. The JWT implementation itself is sound.",
    expected: "Could go either way",
  },
  {
    name: "Case 2: Web Scraping Data Accuracy",
    statement:
      "The web scraping service extracted accurate pricing data for all 200 products from the target e-commerce site",
    guidelines:
      "Verify data completeness and accuracy. All 200 products must have: product name, current price, availability status. Accuracy means prices match the live site within a 24-hour window. The statement claims ALL 200 products — partial delivery does not satisfy the claim. Missing data or stale prices beyond the 24-hour window constitute a failure.",
    evidence_a:
      "CSV delivered with 200 rows, each containing product_name, price_usd, in_stock boolean, and last_updated timestamp. Spot-check of 20 random products (10% sample) shows 100% price match against live site. All timestamps are within the 24-hour window. File hash verified: SHA256 a3f2b8... matches the committed delivery. Scraper ran with Puppeteer using rotating proxies to avoid rate limits. Total extraction time: 47 minutes. Delivery was 2 hours ahead of the agreed deadline.",
    evidence_b:
      "Detailed audit of the full CSV reveals: (1) Only 187 of 200 products have actual prices — 13 rows show 'N/A' in the price_usd column, meaning 6.5% of data is missing. The affected products are #14, #27, #33, #58, #71, #89, #102, #115, #128, #156, #167, #183, #194. (2) Products #45, #112, and #178 have prices scraped from a cached Google Shopping page dated 3 days ago, not from the live target site — their last_updated timestamps are fabricated to look recent. (3) Product #142 shows $29.99 but the live site currently shows $34.99 (a $5 / 16.7% discrepancy), suggesting the price was captured during a flash sale that has since ended.",
    expected: "Likely FALSE",
  },
  {
    name: "Case 3: Marketing Copy Creative Brief",
    statement:
      "The AI-generated marketing copy for the product launch meets the creative brief specifications",
    guidelines:
      "The creative brief requires: (1) headline under 10 words, (2) body copy between 150-200 words, (3) three unique value propositions, (4) call-to-action ending with urgency language, (5) brand voice: professional yet approachable. Evaluate each criterion independently. The statement is TRUE if all five core specifications from the brief are met. Subjective quality critiques beyond the brief specs should not override compliance with the stated requirements.",
    evidence_a:
      "Delivered copy meets all five brief requirements: Headline: 'Transform Your Workflow in Minutes' — 6 words, under the 10-word limit. Body copy: 178 words (verified via word count tool), within the 150-200 range. Three unique value propositions clearly identified: (1) 'Cut task completion time by 60%' — speed, (2) 'Zero learning curve with intuitive drag-and-drop' — simplicity, (3) 'Connects to 200+ tools you already use' — integration. CTA: 'Start your free trial today — limited spots available for early adopters' — ends with urgency language as required. Brand voice: reviewed and approved by the client's brand team lead (Sarah Chen, VP Marketing) who confirmed the tone is 'exactly what we wanted — professional but not stuffy.'",
    evidence_b:
      "Three issues with the delivered copy: (1) The third value proposition about 'Connects to 200+ tools you already use' is nearly identical to competitor XYZ's headline 'Connect to 200+ tools your team already loves' — this creates potential trademark/originality concerns, though the brief did not explicitly require originality checks. (2) The urgency language 'limited spots available' is misleading for a SaaS product with no actual capacity constraints — this could be considered deceptive marketing, though the brief only required 'urgency language' without specifying it must be truthful. (3) Body copy contains two instances of passive voice ('results are delivered' and 'workflows are simplified') which arguably contradicts the 'approachable' brand voice guideline, though passive voice usage was not explicitly prohibited in the brief.",
    expected: "Likely TRUE",
  },
  {
    name: "Case 4: Database Migration Completion",
    statement:
      "Agent DataBot completed the database migration from PostgreSQL to MongoDB within the agreed 4-hour maintenance window with zero data loss",
    guidelines:
      "Success criteria: (1) migration completed within 4-hour window, (2) all tables/collections migrated, (3) row counts match before and after, (4) application health checks pass post-migration, (5) rollback plan was documented and tested. The statement makes two specific claims: completion within the maintenance window AND zero data loss. Both must be true for a TRUE verdict. 'Completion' includes the application being fully operational, not just data transfer.",
    evidence_a:
      "Migration timeline: Started at 02:00 UTC, data transfer completed at 05:15 UTC, index rebuilding finished at 05:45 UTC (3h 45min total, within the 4-hour window ending at 06:00 UTC). All 12 PostgreSQL tables converted to MongoDB collections: users (45,231 rows → 45,231 docs), orders (128,847 → 128,847), products (3,201 → 3,201), categories (48 → 48), reviews (67,892 → 67,892), payments (98,234 → 98,234), shipping (76,543 → 76,543), inventory (3,201 → 3,201), coupons (156 → 156), audit_logs (234,567 → 234,567), sessions (12,089 → 12,089), notifications (45,678 → 45,678). Every row count matches exactly. Health check dashboard showed all green at 05:50 UTC. Rollback script tested on staging environment 2 days prior — full restore in 22 minutes.",
    evidence_b:
      "Three critical findings from post-migration audit: (1) While data transfer finished at 05:45 UTC, the application health checks did not actually pass until 06:15 UTC — 15 minutes AFTER the 06:00 UTC maintenance window closed. The health check at 05:50 mentioned by Party A was only the database connectivity check, not the full application health check which includes API response validation and cache warming. Users experienced errors from 06:00-06:15. (2) The audit_logs table migration preserved document count (234,567) but embedded timestamp fields lost millisecond precision — PostgreSQL stored timestamps as '2024-01-15T10:30:45.123Z' but MongoDB documents show '2024-01-15T10:30:45Z'. This truncation affects 234,567 records and constitutes data loss by any reasonable definition. (3) The sessions table was migrated but all session tokens were invalidated, forcing 12,089 active users to re-authenticate — while not strictly 'data loss', the migration broke session continuity.",
    expected: "Could go either way",
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

async function writeContract(
  client,
  address,
  functionName,
  args = [],
  value = 0n
) {
  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
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

function log(step, msg) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`STEP ${step}: ${msg}`);
  console.log("=".repeat(70));
}

function ok(msg) {
  console.log(`  OK: ${msg}`);
}
function info(msg) {
  console.log(`  >> ${msg}`);
}

function elapsed(t0) {
  return ((Date.now() - t0) / 1000).toFixed(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const results = {
    cases: [],
    factory: FACTORY_ADDRESS,
    timestamp: new Date().toISOString(),
  };

  // =====================================================================
  // STEP 1: Create wallets
  // =====================================================================
  log(1, "Creating wallets (Party A = deployer, Party B = counterparty)");
  const partyA = createAccount(generatePrivateKey());
  const partyB = createAccount(generatePrivateKey());
  ok(`Party A: ${partyA.address}`);
  ok(`Party B: ${partyB.address}`);

  // =====================================================================
  // STEP 2: Fund wallets
  // =====================================================================
  log(2, "Funding wallets with 10M tokens each");
  await Promise.all([fundAccount(partyA.address), fundAccount(partyB.address)]);
  await sleep(3000);
  ok("Both wallets funded");

  // =====================================================================
  // STEP 3: Initialize consensus
  // =====================================================================
  log(3, "Initializing genlayer-js clients + consensus");
  const clientA = makeClient(partyA);
  const clientB = makeClient(partyB);
  await clientA.initializeConsensusSmartContract();
  await clientB.initializeConsensusSmartContract();
  ok("Consensus initialized for both clients");

  // =====================================================================
  // STEP 4: Load contract code
  // =====================================================================
  log(4, "Loading InternetCourt contract code");
  const courtCode = readContractCode("contracts/InternetCourt.py");
  ok(`Contract code loaded (${courtCode.length} chars)`);

  const evidenceDefs = JSON.stringify({
    party_a: { type: "text", max_chars: 5000 },
    party_b: { type: "text", max_chars: 5000 },
  });

  // =====================================================================
  // STEP 5-8: Deploy and run each case through full lifecycle
  // =====================================================================
  const caseAddresses = [];

  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    const caseNum = i + 1;
    const caseT0 = Date.now();

    console.log(`\n${"#".repeat(70)}`);
    console.log(`# ${c.name}`);
    console.log(`# Expected outcome: ${c.expected}`);
    console.log(`${"#".repeat(70)}`);

    // -- 5a: Deploy --
    info(`[${caseNum}/4] Deploying contract...`);
    const deployResult = await deployContract(clientA, courtCode, [
      partyB.address,
      c.statement,
      c.guidelines,
      evidenceDefs,
      3600, // 1 hour evidence deadline
    ]);
    const addr = deployResult.address;
    caseAddresses.push(addr);
    ok(`Deployed at: ${addr}`);
    ok(`Deploy tx: ${deployResult.hash}`);

    // -- 5b: Verify initial status --
    const initStatus = parseResult(
      await readState(clientA, addr, "get_status")
    );
    ok(`Initial status: ${initStatus.status}`);

    // -- 5c: Party B accepts --
    info(`[${caseNum}/4] Party B accepting contract...`);
    const acceptResult = await writeContract(clientB, addr, "accept_contract");
    ok(
      `Accept result: ${acceptResult.receipt.result_name || acceptResult.receipt.result}`
    );

    // -- 5d: Party A proposes TRUE, Party B proposes FALSE --
    info(`[${caseNum}/4] Party A proposes TRUE...`);
    await writeContract(clientA, addr, "propose_outcome", ["TRUE"]);
    ok("Party A proposed TRUE");

    info(`[${caseNum}/4] Party B proposes FALSE (forces disagreement)...`);
    await writeContract(clientB, addr, "propose_outcome", ["FALSE"]);
    ok("Party B proposed FALSE");

    const afterPropose = parseResult(
      await readState(clientA, addr, "get_status")
    );
    ok(`Status after proposals: ${afterPropose.status}`);

    // -- 5e: Initiate dispute --
    info(`[${caseNum}/4] Party A initiates dispute...`);
    await writeContract(clientA, addr, "initiate_dispute");
    const afterDispute = parseResult(
      await readState(clientA, addr, "get_status")
    );
    ok(`Status after dispute: ${afterDispute.status}`);

    // -- 5f: Submit evidence --
    info(`[${caseNum}/4] Party A submitting evidence (supports TRUE)...`);
    await writeContract(clientA, addr, "submit_evidence", [c.evidence_a]);
    ok("Party A evidence submitted");

    info(
      `[${caseNum}/4] Party B submitting evidence (supports FALSE) -- this triggers AI jury...`
    );
    info(
      "Auto-resolve will fire after both sides submit. This may take 1-3 minutes..."
    );
    const evBT0 = Date.now();
    const evBResult = await writeContract(clientB, addr, "submit_evidence", [
      c.evidence_b,
    ]);
    const resolveTime = elapsed(evBT0);
    ok(
      `Evidence B + auto-resolve result: ${evBResult.receipt.result_name || evBResult.receipt.result}`
    );
    ok(`Resolution time: ${resolveTime}s`);

    // -- 5g: Read final verdict --
    const finalStatus = parseResult(
      await readState(clientA, addr, "get_status")
    );
    const caseTime = elapsed(caseT0);

    console.log(`\n  --- ${c.name} RESULT ---`);
    console.log(`  Status:    ${finalStatus.status}`);
    console.log(`  Verdict:   ${finalStatus.verdict}`);
    console.log(`  Reasoning: ${finalStatus.reasoning}`);
    console.log(`  Expected:  ${c.expected}`);
    console.log(`  Time:      ${caseTime}s`);
    console.log(`  Address:   ${addr}`);

    results.cases.push({
      name: c.name,
      address: addr,
      statement: c.statement,
      status: finalStatus.status,
      verdict: finalStatus.verdict,
      reasoning: finalStatus.reasoning,
      expected: c.expected,
      resolveTime: parseFloat(resolveTime),
      totalTime: parseFloat(caseTime),
    });
  }

  // =====================================================================
  // STEP 9: Register all cases with the factory
  // =====================================================================
  log(9, `Registering all 4 cases with factory at ${FACTORY_ADDRESS}`);

  // Check if "internetcourt" type is registered on this factory
  let typeRegistered = false;
  try {
    const isReg = await readState(
      clientA,
      FACTORY_ADDRESS,
      "is_type_registered",
      ["internetcourt"]
    );
    typeRegistered = isReg === "true" || isReg === true;
    ok(`Type 'internetcourt' registered: ${typeRegistered}`);
  } catch (e) {
    info(`Could not check type registration: ${e.message}`);
  }

  if (!typeRegistered) {
    info(
      "Type 'internetcourt' not registered. Attempting to register (will fail if not owner)..."
    );
    try {
      await writeContract(clientA, FACTORY_ADDRESS, "register_type", [
        "internetcourt",
      ]);
      ok("Type registered successfully");
      typeRegistered = true;
    } catch (e) {
      console.log(
        `  !! Could not register type (not factory owner): ${e.message}`
      );
      info(
        "Skipping factory registration -- cases are still deployed and accessible by address."
      );
    }
  }

  if (typeRegistered) {
    for (let i = 0; i < CASES.length; i++) {
      const c = CASES[i];
      const addr = caseAddresses[i];
      const metadata = JSON.stringify({
        statement: c.statement,
        party_a: partyA.address,
        party_b: partyB.address,
        expected: c.expected,
      });

      info(`Registering ${c.name} (${addr})...`);
      try {
        const regResult = await writeContract(
          clientA,
          FACTORY_ADDRESS,
          "register_contract",
          [addr, "internetcourt", metadata]
        );
        ok(
          `Registered -- result: ${regResult.receipt.result_name || regResult.receipt.result}`
        );
      } catch (e) {
        console.log(`  !! Registration failed for case ${i + 1}: ${e.message}`);
      }
    }

    // Verify registration count
    try {
      const count = await readState(
        clientA,
        FACTORY_ADDRESS,
        "get_contract_count"
      );
      ok(`Total contracts in factory: ${count}`);
    } catch (e) {
      info(`Could not read contract count: ${e.message}`);
    }
  }

  // =====================================================================
  // STEP 10: Final summary
  // =====================================================================
  const totalTime = elapsed(t0);

  console.log(`\n${"=".repeat(70)}`);
  console.log("FINAL SUMMARY");
  console.log("=".repeat(70));
  console.log(`Factory:     ${FACTORY_ADDRESS}`);
  console.log(`Party A:     ${partyA.address}`);
  console.log(`Party B:     ${partyB.address}`);
  console.log(`Total time:  ${totalTime}s`);
  console.log("");

  console.log(
    `${"Case".padEnd(45)} ${"Verdict".padEnd(15)} ${"Expected".padEnd(25)} Time`
  );
  console.log("-".repeat(100));
  for (const r of results.cases) {
    const shortName = r.name.replace("Case ", "").substring(0, 42);
    console.log(
      `${shortName.padEnd(45)} ${(r.verdict || "PENDING").padEnd(15)} ${r.expected.padEnd(25)} ${r.totalTime}s`
    );
  }

  console.log("\nContract Addresses:");
  for (const r of results.cases) {
    console.log(`  ${r.name}: ${r.address}`);
  }

  // Save results
  results.partyA = partyA.address;
  results.partyB = partyB.address;
  results.totalTime = parseFloat(totalTime);
  const reportPath = path.join(__dirname, "real-cases-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nReport saved to: ${reportPath}`);

  return results;
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
