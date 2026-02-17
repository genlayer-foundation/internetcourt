import { ethers } from "hardhat";

/**
 * Create real test cases on Base Sepolia that flow through the cross-chain bridge
 * for real AI jury verdicts on GenLayer.
 *
 * Unlike e2e-testnet.ts which simulates the bridge verdict, this script STOPS
 * after both parties submit evidence (RESOLVING state) and lets the real relay
 * service handle the AI jury evaluation and verdict relay.
 *
 * Run with: npx hardhat run scripts/create-bridge-cases.ts --network baseSepolia
 */

const FACTORY = "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a";
const USDC = "0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3";
const ESCROW = 1000_000000n; // 1000 USDC (6 decimals)
const PARTY_B_KEY = "0x31f35a8cc001278c0293a9a061e0e291b6379d3cc75982613770e4b7967ecfaf";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DELAY = 4000; // wait for RPC to catch up after each tx

async function waitTx(tx: any) {
  const receipt = await tx.wait();
  await sleep(DELAY);
  return receipt;
}

function formatUSDC(amount: bigint): string {
  return (Number(amount) / 1e6).toFixed(2);
}

// Status enum mapping
const STATUS_NAMES: Record<number, string> = {
  0: "CREATED",
  1: "ACTIVE",
  2: "DISPUTED",
  3: "RESOLVING",
  4: "RESOLVED",
  5: "CANCELLED",
};

interface CaseConfig {
  name: string;
  statement: string;
  guidelines: string;
  evidenceDefs: string;
  evidenceA: string;
  evidenceB: string;
}

const CASES: CaseConfig[] = [
  {
    name: "Software Delivery Dispute",
    statement:
      "The developer delivered a working REST API with all 12 endpoints specified in the SOW, passing all acceptance tests, by the January 31 deadline",
    guidelines:
      "Evaluate delivery completeness, code quality, test coverage, and timeline. A minor bug that doesn't affect core functionality should not invalidate delivery.",
    evidenceDefs:
      "Party A: git logs, CI/CD reports, deployment receipts. Party B: bug reports, test failures, spec compliance report.",
    evidenceA:
      "Delivered git repo on Jan 28. All 12 endpoints implemented. 94% test coverage. CI/CD pipeline green. Client accessed staging environment 47 times between Jan 28-31.",
    evidenceB:
      "3 of 12 endpoints return incorrect data formats. Authentication endpoint has a critical security vulnerability. Load testing shows 2 endpoints fail under 100 concurrent users.",
  },
  {
    name: "AI Training Data Quality",
    statement:
      "The dataset provider delivered 50,000 labeled images meeting the agreed quality standards of 95% accuracy, with proper licensing documentation",
    guidelines:
      "Evaluate: (1) total count meets 50,000, (2) labeling accuracy >= 95% based on random sample, (3) licensing docs are valid and complete",
    evidenceDefs:
      "Party A: delivery manifest, QA sample results, license documents. Party B: independent audit report, duplicate analysis, watermark detection scan.",
    evidenceA:
      "Delivered 51,247 labeled images. Internal QA sample of 2,000 showed 97.3% accuracy. CC-BY-4.0 license for all images, documentation attached.",
    evidenceB:
      "Independent audit of 500 random images: 43 mislabeled (91.4% accuracy). 1,200 images are duplicates. 847 images have watermarks violating license terms.",
  },
  {
    name: "SLA Violation Claim",
    statement:
      "The cloud hosting provider maintained 99.9% uptime as guaranteed in the SLA for Q4 2025",
    guidelines:
      "Calculate actual uptime percentage. Scheduled maintenance windows (announced 48h+ in advance) do not count as downtime. Only count outages confirmed by at least 2 independent monitoring sources.",
    evidenceDefs:
      "Party A: internal monitoring dashboard, maintenance announcement logs. Party B: third-party monitoring reports (UptimeRobot, Pingdom), incident timeline.",
    evidenceA:
      "Monitoring dashboard shows 99.94% uptime. Two incidents: Oct 15 (12 min, DNS propagation) and Dec 3 (8 min, database failover). Both under 15 min. All maintenance windows announced 72h in advance.",
    evidenceB:
      "Third-party monitoring (UptimeRobot + Pingdom) recorded 99.82% uptime. Oct 15 outage lasted 47 minutes per external monitors. Nov 22 maintenance was unannounced and lasted 3 hours. Dec 3 outage was 23 minutes.",
  },
];

async function createCase(
  factory: any,
  usdc: any,
  deployer: any,
  partyB: any,
  caseConfig: CaseConfig,
  caseIndex: number,
): Promise<string> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  CASE ${caseIndex + 1}: ${caseConfig.name}`);
  console.log(`${"=".repeat(60)}`);

  // Mint USDC
  console.log(`\n  [1/6] Minting ${formatUSDC(ESCROW)} USDC to Party A...`);
  await waitTx(await usdc.mint(deployer.address, ESCROW));

  // Approve
  console.log(`  [2/6] Approving factory to spend USDC...`);
  await waitTx(await usdc.approve(FACTORY, ESCROW));

  // Create agreement
  console.log(`  [3/6] Creating agreement (${formatUSDC(ESCROW)} USDC escrow)...`);
  const receipt = await waitTx(
    await factory.createAgreement(
      partyB.address,
      caseConfig.statement,
      caseConfig.guidelines,
      caseConfig.evidenceDefs,
      3600, // evidenceDeadlineSeconds (1 hour)
      USDC,
      ESCROW,
      0, // joinDeadline (no deadline)
      0, // maxEvidenceLength (no limit)
      "", // constraints
    ),
  );

  // Parse AgreementCreated event
  const createEvent = receipt?.logs.find((log: any) => {
    try {
      return (
        factory.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        })?.name === "AgreementCreated"
      );
    } catch {
      return false;
    }
  });
  const parsed = factory.interface.parseLog({
    topics: createEvent!.topics as string[],
    data: createEvent!.data,
  });
  const agreementAddr = parsed!.args.agreementAddress;
  const caseId = parsed!.args.id.toString();
  console.log(`         Agreement: ${agreementAddr}`);
  console.log(`         Case ID: ${caseId}`);

  const agreement = await ethers.getContractAt("Agreement", agreementAddr);

  // Party B accepts
  console.log(`  [4/6] Party B accepting...`);
  await waitTx(await agreement.connect(partyB).acceptAgreement());
  console.log(`         Status: ${STATUS_NAMES[Number(await agreement.status())]}`);

  // Raise dispute
  console.log(`  [5/6] Raising dispute...`);
  await waitTx(await agreement.raiseDispute());
  console.log(`         Status: ${STATUS_NAMES[Number(await agreement.status())]}`);

  // Submit evidence from both parties
  console.log(`  [6/6] Submitting evidence...`);
  await waitTx(await agreement.submitEvidence(caseConfig.evidenceA));
  console.log(`         Party A evidence submitted`);

  await waitTx(await agreement.connect(partyB).submitEvidence(caseConfig.evidenceB));
  console.log(`         Party B evidence submitted`);

  const finalStatus = Number(await agreement.status());
  console.log(`         Final status: ${STATUS_NAMES[finalStatus]} (${finalStatus})`);

  if (finalStatus === 3) {
    console.log(`         >>> RESOLVING — waiting for relay to pick up DisputeRequested event`);
  } else {
    console.log(`         >>> UNEXPECTED STATUS — expected RESOLVING (3), got ${finalStatus}`);
  }

  console.log(`\n         Basescan: https://sepolia.basescan.org/address/${agreementAddr}`);

  return agreementAddr;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const partyB = new ethers.Wallet(PARTY_B_KEY, ethers.provider);

  console.log("=".repeat(60));
  console.log("  INTERNET COURT — Real Bridge E2E Test");
  console.log("  Creating cases for AI jury evaluation via GenLayer");
  console.log("=".repeat(60));
  console.log(`\n  Party A: ${deployer.address}`);
  console.log(`  Party B: ${partyB.address}`);
  console.log(`  ETH Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  const usdc = await ethers.getContractAt("MockUSDC", USDC);
  const factory = await ethers.getContractAt("InternetCourtFactory", FACTORY);

  // Fund partyB with ETH for gas if needed
  const balB = await ethers.provider.getBalance(partyB.address);
  if (balB < ethers.parseEther("0.005")) {
    console.log(`\n  Funding Party B with ETH for gas...`);
    await waitTx(
      await deployer.sendTransaction({
        to: partyB.address,
        value: ethers.parseEther("0.01"),
      }),
    );
  }
  console.log(`  Party B ETH: ${ethers.formatEther(await ethers.provider.getBalance(partyB.address))} ETH`);

  // Create all cases
  const agreements: string[] = [];
  for (let i = 0; i < CASES.length; i++) {
    const addr = await createCase(factory, usdc, deployer, partyB, CASES[i], i);
    agreements.push(addr);
  }

  // Summary
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("  SUMMARY — All cases created and in RESOLVING state");
  console.log("=".repeat(60));
  console.log("\n  The relay service should now:");
  console.log("  1. Detect DisputeRequested events (polls every 5s)");
  console.log("  2. Deploy oracle contracts to GenLayer (1-3 min each)");
  console.log("  3. Wait for AI jury evaluation");
  console.log("  4. Relay verdicts back to Base via zkSync/LayerZero (cron: */5 min)");
  console.log("\n  Estimated time for verdicts: 5-10 minutes per case");

  console.log("\n  Agreement Addresses:");
  for (let i = 0; i < agreements.length; i++) {
    console.log(`    Case ${i + 1} (${CASES[i].name}): ${agreements[i]}`);
    console.log(`    https://sepolia.basescan.org/address/${agreements[i]}`);
  }

  console.log(`\n  To check status later, run:`);
  console.log(`    npx hardhat run scripts/check-bridge-cases.ts --network baseSepolia`);
  console.log(`\n  Or check individual agreements:`);
  for (const addr of agreements) {
    console.log(`    cast call ${addr} "status()(uint8)" --rpc-url https://sepolia.base.org`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
