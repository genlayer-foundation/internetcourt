import { ethers } from "hardhat";

/**
 * Cross-Chain E2E Test — Creates real cases that flow through the bridge
 * for GenLayer AI jury verdicts.
 *
 * This script creates agreements, gets them to RESOLVING state, then STOPS.
 * The relay service picks up the DisputeRequested events, deploys oracle
 * contracts on GenLayer, and relays verdicts back via LayerZero.
 *
 * Run: npx hardhat run scripts/cross-chain-e2e.ts --network baseSepolia
 */

const FACTORY = "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a";
const USDC = "0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3";
const ESCROW = 50_000000n; // 50 USDC per case (6 decimals)
const PARTY_B_KEY = "0x31f35a8cc001278c0293a9a061e0e291b6379d3cc75982613770e4b7967ecfaf";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DELAY = 4000;

async function waitTx(tx: any) {
  const receipt = await tx.wait();
  await sleep(DELAY);
  return receipt;
}

function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

function statusName(s: bigint): string {
  const names: Record<string, string> = {
    "0": "CREATED", "1": "ACTIVE", "2": "DISPUTED",
    "3": "RESOLVING", "4": "RESOLVED", "5": "CANCELLED",
  };
  return names[s.toString()] || "UNKNOWN";
}

function verdictName(v: bigint): string {
  const names: Record<string, string> = {
    "0": "UNDETERMINED", "1": "TRUE", "2": "FALSE",
  };
  return names[v.toString()] || "UNKNOWN";
}

// ─────────────────────────────────────────────────
// Test cases — realistic disputes for AI jury
// ─────────────────────────────────────────────────

interface TestCase {
  name: string;
  statement: string;
  guidelines: string;
  evidenceDefs: string;
  evidenceA: string;
  evidenceB: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: "API Delivery Dispute",
    statement: "The freelancer delivered the REST API integration on time and meeting all specifications outlined in the contract",
    guidelines: "Evaluate based on: (1) Whether all 12 API endpoints listed in the spec were implemented, (2) Whether the delivery was before the Jan 15 deadline, (3) Whether basic error handling exists for each endpoint, (4) Whether the API documentation was provided",
    evidenceDefs: "Party A (freelancer): delivery receipts, git commit history, API docs. Party B (client): test results, bug reports, spec document.",
    evidenceA: "I delivered the complete API on January 14, one day ahead of the deadline. All 12 endpoints are implemented: GET/POST/PUT/DELETE for /users, /orders, and /products. Each endpoint has proper error handling (400, 404, 500 responses). Full Swagger documentation is at /api/docs. Git log shows 47 commits between Dec 1 and Jan 14. The client acknowledged receipt via email on Jan 14.",
    evidenceB: "The delivery was on January 14 but 3 of the 12 endpoints are non-functional. POST /orders returns 500 error consistently. PUT /products fails on bulk updates (which was in the spec). DELETE /users does not cascade to related orders, causing orphan records. I reported these bugs on January 15. The API docs are auto-generated and missing request/response examples for 8 endpoints. This does not meet 'all specifications' as claimed.",
  },
  {
    name: "Design Work Quality Dispute",
    statement: "The graphic designer delivered brand identity work that meets professional industry standards and the agreed-upon project brief",
    guidelines: "Evaluate based on: (1) Whether deliverables match the project brief requirements (logo, color palette, typography, brand guidelines doc), (2) Whether the work is original (not AI-generated or stock templates), (3) Whether file formats were delivered as specified (AI, SVG, PNG, PDF), (4) Whether reasonable revisions were accommodated",
    evidenceDefs: "Party A (designer): project files, revision history, communication logs. Party B (client): project brief, feedback emails, comparison evidence.",
    evidenceA: "I delivered the complete brand identity package on February 1 as agreed. Deliverables include: primary logo with 3 variations (horizontal, stacked, icon-only), color palette with 6 colors (hex, RGB, CMYK values), typography selection (2 fonts: Inter for headings, Source Sans for body), and a 24-page brand guidelines PDF. All files delivered in AI, SVG, PNG (multiple sizes), and PDF. I completed 3 rounds of revisions per the contract. The work is 100% original, created in Adobe Illustrator from scratch.",
    evidenceB: "While the deliverables were technically provided, the quality is below professional standards. The logo is essentially a modified version of a free Canva template (I found the original template and can provide the link). The 'brand guidelines' document is a generic template with our colors swapped in — the layout structure and placeholder text are identical to templates available on Creative Market. Two of the three revision rounds consisted of minor color changes that I specifically asked not to be counted as full revisions. The designer spent approximately 3 hours total based on the Figma activity log, which is inconsistent with original professional work.",
  },
  {
    name: "SLA Uptime Dispute",
    statement: "The hosting provider maintained 99.9% uptime as guaranteed in the Service Level Agreement for the month of January 2026",
    guidelines: "Evaluate based on: (1) Total downtime minutes in January 2026 vs. the 43.8 minutes allowed for 99.9% uptime in a 31-day month, (2) Whether scheduled maintenance windows (communicated 48h in advance) are excluded from downtime calculation per the SLA, (3) Whether partial degradation (>500ms response times) counts as downtime per the SLA definition, (4) Whether monitoring data from both parties is consistent",
    evidenceDefs: "Party A (hosting provider): server monitoring logs, uptime reports, maintenance notifications. Party B (customer): third-party monitoring data, support tickets, user complaints.",
    evidenceA: "Our internal monitoring shows 99.95% uptime for January 2026 — only 22 minutes of unplanned downtime. There were two scheduled maintenance windows (Jan 8 at 3 AM UTC for 45 min, Jan 22 at 3 AM UTC for 30 min) both communicated 72 hours in advance via email, which per SLA Section 4.2 are excluded from uptime calculations. Our Datadog dashboard confirms all services responded within 200ms average throughout the month. We have 24/7 monitoring from 3 geographic regions.",
    evidenceB: "Our independent UptimeRobot monitoring recorded 4 separate outage events totaling 127 minutes of downtime: Jan 5 (18 min), Jan 12 (45 min), Jan 19 (32 min), Jan 28 (32 min). The Jan 12 outage affected our entire production environment during business hours (2 PM UTC) and was NOT a scheduled maintenance. Additionally, we logged 340 minutes where response times exceeded 500ms, which per SLA Section 2.1 paragraph 3 constitutes 'degraded service' and counts toward downtime. Total effective downtime: 467 minutes, well below the 99.9% threshold. We filed 3 support tickets that went unacknowledged for over 4 hours each.",
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const partyB = new ethers.Wallet(PARTY_B_KEY, ethers.provider);

  console.log("=".repeat(64));
  console.log("  Cross-Chain E2E Test — Real AI Jury Verdicts");
  console.log("=".repeat(64));
  console.log();
  console.log("Party A:", deployer.address);
  console.log("Party B:", partyB.address);
  console.log("Factory:", FACTORY);
  console.log("USDC:   ", USDC);
  console.log();
  console.log("This script creates cases and gets them to RESOLVING state.");
  console.log("The relay service then deploys oracle contracts on GenLayer,");
  console.log("where the AI jury evaluates and sends verdicts back via bridge.");
  console.log();

  const usdc = await ethers.getContractAt("MockUSDC", USDC);
  const factory = await ethers.getContractAt("InternetCourtFactory", FACTORY);

  // Fund Party B if needed
  const partyBBal = await ethers.provider.getBalance(partyB.address);
  if (partyBBal < ethers.parseEther("0.003")) {
    console.log("Funding Party B with ETH for gas...");
    await waitTx(await deployer.sendTransaction({
      to: partyB.address,
      value: ethers.parseEther("0.005"),
    }));
  }

  console.log("Party A ETH:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  console.log("Party B ETH:", ethers.formatEther(await ethers.provider.getBalance(partyB.address)));

  const caseAddresses: { name: string; address: string }[] = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  Case ${i + 1}/${TEST_CASES.length}: ${tc.name}`);
    console.log(`${"=".repeat(64)}`);

    // 1. Mint + approve USDC
    console.log(`\n  [1/5] Minting ${formatUSDC(ESCROW)} USDC for Party A...`);
    await waitTx(await usdc.mint(deployer.address, ESCROW));
    await waitTx(await usdc.approve(FACTORY, ESCROW));

    // 2. Create agreement
    console.log("  [2/5] Creating agreement...");
    const receipt = await waitTx(await factory.createAgreement(
      partyB.address,
      tc.statement,
      tc.guidelines,
      tc.evidenceDefs,
      3600,     // evidenceDeadlineSeconds (1 hour)
      USDC,
      ESCROW,
      0,        // joinDeadline (no deadline)
      0,        // maxEvidenceLength (no limit)
      "",       // constraints
    ));

    const createEvent = receipt?.logs.find((log: any) => {
      try {
        return factory.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgreementCreated";
      } catch { return false; }
    });
    const parsed = factory.interface.parseLog({ topics: createEvent!.topics as string[], data: createEvent!.data });
    const agreementAddr = parsed!.args.agreementAddress;
    const caseId = parsed!.args.id;
    console.log(`         Agreement: ${agreementAddr}`);
    console.log(`         Case ID:   ${caseId}`);

    const agreement = await ethers.getContractAt("Agreement", agreementAddr);

    // 3. Party B accepts
    console.log("  [3/5] Party B accepting...");
    await waitTx(await agreement.connect(partyB).acceptAgreement());
    const status1 = await agreement.status();
    console.log(`         Status: ${statusName(status1)}`);

    // 4. Raise dispute
    console.log("  [4/5] Raising dispute...");
    await waitTx(await agreement.raiseDispute());
    const status2 = await agreement.status();
    console.log(`         Status: ${statusName(status2)}`);

    // 5. Submit evidence (both parties → triggers RESOLVING)
    console.log("  [5/5] Submitting evidence...");
    await waitTx(await agreement.submitEvidence(tc.evidenceA));
    console.log("         Party A evidence submitted");
    await waitTx(await agreement.connect(partyB).submitEvidence(tc.evidenceB));
    console.log("         Party B evidence submitted");

    const finalStatus = await agreement.status();
    console.log(`\n  Final status: ${statusName(finalStatus)}`);

    if (finalStatus === 3n) {
      console.log("  >>> RESOLVING — Waiting for relay to pick up this dispute <<<");
    } else if (finalStatus === 4n) {
      console.log("  >>> RESOLVED (already?) <<<");
    } else {
      console.log(`  >>> Unexpected status: ${statusName(finalStatus)} <<<`);
    }

    console.log(`  Basescan: https://sepolia.basescan.org/address/${agreementAddr}`);
    caseAddresses.push({ name: tc.name, address: agreementAddr });
  }

  // Summary
  console.log(`\n${"=".repeat(64)}`);
  console.log("  ALL CASES CREATED — WAITING FOR RELAY");
  console.log(`${"=".repeat(64)}\n`);

  for (const c of caseAddresses) {
    console.log(`  ${c.name}`);
    console.log(`    Address: ${c.address}`);
    console.log(`    Basescan: https://sepolia.basescan.org/address/${c.address}`);
  }

  console.log(`\n  The relay service should detect DisputeRequested events`);
  console.log(`  and deploy oracle contracts on GenLayer.`);
  console.log(`  Expected timeline: 5-10 minutes per case.`);
  console.log();

  // Now poll for verdicts
  console.log("=".repeat(64));
  console.log("  MONITORING FOR VERDICTS");
  console.log("=".repeat(64));
  console.log();

  const resolved = new Set<string>();
  const startTime = Date.now();
  const MAX_WAIT = 20 * 60 * 1000; // 20 minutes max

  while (resolved.size < caseAddresses.length && (Date.now() - startTime) < MAX_WAIT) {
    for (const c of caseAddresses) {
      if (resolved.has(c.address)) continue;

      try {
        const agreement = await ethers.getContractAt("Agreement", c.address);
        const status = await agreement.status();

        if (status === 4n) { // RESOLVED
          const verdict = await agreement.verdict();
          const reasoning = await agreement.reasoning();
          console.log(`\n  [VERDICT] ${c.name}`);
          console.log(`    Address:   ${c.address}`);
          console.log(`    Verdict:   ${verdictName(verdict)}`);
          console.log(`    Reasoning: ${reasoning.slice(0, 200)}${reasoning.length > 200 ? "..." : ""}`);
          console.log(`    Time:      ${Math.round((Date.now() - startTime) / 1000)}s since start`);
          resolved.add(c.address);
        }
      } catch (e: any) {
        // Ignore errors during polling
      }
    }

    if (resolved.size < caseAddresses.length) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const remaining = caseAddresses.length - resolved.size;
      process.stdout.write(`\r  Waiting... ${elapsed}s elapsed, ${remaining} case(s) pending`);
      await sleep(15000); // Poll every 15 seconds
    }
  }

  // Final summary
  console.log(`\n\n${"=".repeat(64)}`);
  console.log("  FINAL RESULTS");
  console.log(`${"=".repeat(64)}\n`);

  for (const c of caseAddresses) {
    try {
      const agreement = await ethers.getContractAt("Agreement", c.address);
      const status = await agreement.status();
      const verdict = status === 4n ? await agreement.verdict() : 0n;
      const reasoning = status === 4n ? await agreement.reasoning() : "N/A";

      console.log(`  ${c.name}`);
      console.log(`    Address:   ${c.address}`);
      console.log(`    Status:    ${statusName(status)}`);
      if (status === 4n) {
        console.log(`    Verdict:   ${verdictName(verdict)}`);
        console.log(`    Reasoning: ${reasoning.slice(0, 150)}${reasoning.length > 150 ? "..." : ""}`);
      }
      console.log(`    Basescan:  https://sepolia.basescan.org/address/${c.address}`);
    } catch (e: any) {
      console.log(`  ${c.name}: ERROR reading status`);
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n  Resolved: ${resolved.size}/${caseAddresses.length}`);
  console.log(`  Total time: ${totalElapsed}s`);
  console.log(`${"=".repeat(64)}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
