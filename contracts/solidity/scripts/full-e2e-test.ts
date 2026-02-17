import { ethers } from "hardhat";

/**
 * Comprehensive E2E test script for Internet Court Agreement.sol on Base Sepolia.
 *
 * Creates 11 named test cases covering every lifecycle path of the Agreement contract.
 * Each case's `statement` field IS the test name, making them readable on Basescan.
 *
 * Run: npx hardhat run scripts/full-e2e-test.ts --network baseSepolia
 */

// ──────────────────────────────────────────────────────────────
//  Contract addresses (Base Sepolia)
// ──────────────────────────────────────────────────────────────
const MOCK_USDC = "0x58C27C7C1Ff5DBF480c956acf6b119508b6FBa4f";
const FACTORY = "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a";
const BRIDGE_RECEIVER = "0xc3e6aE892A704c875bF74Df46eD873308db15d82";

// Party B deterministic key (testnet only - no real funds)
const PARTY_B_KEY =
  "0x31f35a8cc001278c0293a9a061e0e291b6379d3cc75982613770e4b7967ecfaf";

// ──────────────────────────────────────────────────────────────
//  Enums (mirror Solidity)
// ──────────────────────────────────────────────────────────────
const Status = {
  CREATED: 0n,
  ACTIVE: 1n,
  DISPUTED: 2n,
  RESOLVING: 3n,
  RESOLVED: 4n,
  CANCELLED: 5n,
} as const;

const VerdictEnum = {
  UNDETERMINED: 0n,
  TRUE_: 1n,
  FALSE_: 2n,
} as const;

// ──────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DELAY = 4000; // RPC propagation delay

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
    "0": "CREATED",
    "1": "ACTIVE",
    "2": "DISPUTED",
    "3": "RESOLVING",
    "4": "RESOLVED",
    "5": "CANCELLED",
  };
  return names[s.toString()] || "UNKNOWN";
}

function verdictName(v: bigint): string {
  const names: Record<string, string> = {
    "0": "UNDETERMINED",
    "1": "TRUE",
    "2": "FALSE",
  };
  return names[v.toString()] || "UNKNOWN";
}

/**
 * Mint USDC to a signer and approve the factory to spend it.
 */
async function mintAndApprove(
  usdc: any,
  factoryAddr: string,
  signer: any,
  amount: bigint,
) {
  await waitTx(await usdc.connect(signer).mint(signer.address, amount));
  await waitTx(await usdc.connect(signer).approve(factoryAddr, amount));
}

/**
 * Create an agreement via the factory. Returns the deployed Agreement address.
 */
async function createCase(
  factory: any,
  partyA: any,
  partyBAddr: string,
  name: string,
  escrowAmount: bigint,
  opts: {
    usdcAddr: string;
    evidenceDeadlineSeconds?: number;
    joinDeadline?: number;
    guidelines?: string;
    evidenceDefs?: string;
    maxEvidenceLength?: number;
    constraints?: string;
  },
): Promise<string> {
  const receipt = await waitTx(
    await factory.connect(partyA).createAgreement(
      partyBAddr,
      name, // statement = test case name
      opts.guidelines || "Test guidelines",
      opts.evidenceDefs || "Test evidence definitions",
      opts.evidenceDeadlineSeconds ?? 3600,
      opts.usdcAddr,
      escrowAmount,
      opts.joinDeadline ?? 0,
      opts.maxEvidenceLength ?? 0,
      opts.constraints ?? "",
    ),
  );

  const event = receipt?.logs.find((log: any) => {
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

  if (!event) throw new Error("AgreementCreated event not found");
  const parsed = factory.interface.parseLog({
    topics: event.topics as string[],
    data: event.data,
  });
  return parsed!.args.agreementAddress;
}

/**
 * Deliver a bridge verdict by temporarily swapping the bridgeReceiver to the owner.
 * verdictValue: 0 = UNDETERMINED, 1 = TRUE, 2 = FALSE
 */
async function deliverVerdict(
  factory: any,
  owner: any,
  agreementAddr: string,
  verdictValue: number,
  reasoning: string,
) {
  const currentBR = await factory.bridgeReceiver();

  // Temporarily set bridgeReceiver to owner
  await waitTx(
    await factory.connect(owner).setBridgeReceiver(owner.address),
  );

  const innerResolution = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint8", "string"],
    [agreementAddr, verdictValue, reasoning],
  );
  const outerMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [agreementAddr, innerResolution],
  );
  await waitTx(
    await factory
      .connect(owner)
      .processBridgeMessage(0, ethers.ZeroAddress, outerMessage),
  );

  // Restore bridgeReceiver
  await waitTx(
    await factory.connect(owner).setBridgeReceiver(currentBR),
  );
}

// ──────────────────────────────────────────────────────────────
//  Assertion helpers
// ──────────────────────────────────────────────────────────────

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function assertEqual(actual: any, expected: any, label: string) {
  const a = typeof actual === "bigint" ? actual : BigInt(actual);
  const e = typeof expected === "bigint" ? expected : BigInt(expected);
  if (a !== e) {
    throw new Error(
      `ASSERTION FAILED [${label}]: expected ${e} but got ${a}`,
    );
  }
}

// ──────────────────────────────────────────────────────────────
//  Main
// ──────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const partyB = new ethers.Wallet(PARTY_B_KEY, ethers.provider);

  console.log(
    "================================================================",
  );
  console.log(
    "  Internet Court - Full E2E Test Suite (Base Sepolia)",
  );
  console.log(
    "================================================================\n",
  );
  console.log("Party A (deployer):", deployer.address);
  console.log("Party B:           ", partyB.address);
  console.log(
    "Factory:           ",
    FACTORY,
  );
  console.log(
    "MockUSDC:          ",
    MOCK_USDC,
  );

  // Contracts
  const usdc = await ethers.getContractAt("MockUSDC", MOCK_USDC);
  const factory = await ethers.getContractAt(
    "InternetCourtFactory",
    FACTORY,
  );

  // Fund Party B with ETH for gas if needed
  const partyBBal = await ethers.provider.getBalance(partyB.address);
  if (partyBBal < ethers.parseEther("0.005")) {
    console.log("\nFunding Party B with ETH for gas...");
    await waitTx(
      await deployer.sendTransaction({
        to: partyB.address,
        value: ethers.parseEther("0.01"),
      }),
    );
  }
  console.log(
    "Party B ETH:",
    ethers.formatEther(await ethers.provider.getBalance(partyB.address)),
  );

  const ESCROW = 100_000000n; // 100 USDC per case
  let passed = 0;
  let failed = 0;
  const results: { name: string; status: string; addr: string }[] = [];

  // ════════════════════════════════════════════════════════════
  //  CASE 1: Cancel Before Acceptance
  //  CREATED -> cancel() -> CANCELLED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 1: Cancel Before Acceptance";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      // Mint + approve
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      // Create agreement
      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Verify CREATED
      assertEqual(await agreement.status(), Status.CREATED, "status=CREATED");

      // Record balances before cancel
      const balBefore = await usdc.balanceOf(deployer.address);

      // Party A cancels
      await waitTx(await agreement.connect(deployer).cancel());

      // Assert CANCELLED
      assertEqual(await agreement.status(), Status.CANCELLED, "status=CANCELLED");

      // Assert escrow returned to A
      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "escrow returned to A");

      console.log("  Status: CANCELLED");
      console.log("  Escrow returned to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 2: Join Deadline Expired
  //  CREATED -> (wait) -> reclaimOnExpiry() -> CANCELLED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 2: Join Deadline Expired";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      // Use a very short join deadline: now + 10 seconds
      const block = await ethers.provider.getBlock("latest");
      const joinDeadline = block!.timestamp + 10;

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
        joinDeadline,
      });
      console.log("  Agreement:", caseAddr);
      console.log("  Join deadline:", joinDeadline, "(now + 10s)");

      const agreement = await ethers.getContractAt("Agreement", caseAddr);
      assertEqual(await agreement.status(), Status.CREATED, "status=CREATED");

      // Wait for deadline to pass
      console.log("  Waiting 15s for join deadline to expire...");
      await sleep(15000);

      const balBefore = await usdc.balanceOf(deployer.address);

      // Reclaim
      await waitTx(await agreement.reclaimOnExpiry());

      assertEqual(await agreement.status(), Status.CANCELLED, "status=CANCELLED");

      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "escrow returned to A");

      console.log("  Status: CANCELLED");
      console.log("  Escrow reclaimed by A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 3: Mutual Agreement Both TRUE
  //  ACTIVE -> proposeOutcome(true) x2 -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 3: Mutual Agreement Both TRUE";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Party B accepts
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      assertEqual(await agreement.status(), Status.ACTIVE, "status=ACTIVE");

      // Party A proposes TRUE
      await waitTx(await agreement.connect(deployer).proposeOutcome(true));
      console.log("  Party A proposed: TRUE");

      // Party B proposes TRUE -> should resolve
      await waitTx(await agreement.connect(partyB).proposeOutcome(true));
      console.log("  Party B proposed: TRUE");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(await agreement.verdict(), VerdictEnum.TRUE_, "verdict=TRUE");

      // Escrow to A (TRUE = party A wins)
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      assertEqual(pendingA, ESCROW, "pending A = escrow");

      // Claim funds
      const balBefore = await usdc.balanceOf(deployer.address);
      await waitTx(await agreement.connect(deployer).claimFunds());
      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "A claimed escrow");

      console.log("  Status: RESOLVED | Verdict: TRUE");
      console.log("  Escrow to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 4: Mutual Agreement Both FALSE
  //  ACTIVE -> proposeOutcome(false) x2 -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 4: Mutual Agreement Both FALSE";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Party B accepts
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      assertEqual(await agreement.status(), Status.ACTIVE, "status=ACTIVE");

      // Both propose FALSE
      await waitTx(await agreement.connect(deployer).proposeOutcome(false));
      console.log("  Party A proposed: FALSE");
      await waitTx(await agreement.connect(partyB).proposeOutcome(false));
      console.log("  Party B proposed: FALSE");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(await agreement.verdict(), VerdictEnum.FALSE_, "verdict=FALSE");

      // Escrow to B (FALSE = party B wins)
      const pendingB = await agreement.pendingWithdrawals(partyB.address);
      assertEqual(pendingB, ESCROW, "pending B = escrow");

      // Party B claims
      const balBefore = await usdc.balanceOf(partyB.address);
      await waitTx(await agreement.connect(partyB).claimFunds());
      const balAfter = await usdc.balanceOf(partyB.address);
      assertEqual(balAfter - balBefore, ESCROW, "B claimed escrow");

      console.log("  Status: RESOLVED | Verdict: FALSE");
      console.log("  Escrow to B:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 5: Confirm Other Party Proposal
  //  ACTIVE -> proposeOutcome(true) -> confirmOutcome() -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 5: Confirm Other Party Proposal";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Party B accepts
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      assertEqual(await agreement.status(), Status.ACTIVE, "status=ACTIVE");

      // Party A proposes TRUE
      await waitTx(await agreement.connect(deployer).proposeOutcome(true));
      console.log("  Party A proposed: TRUE");

      // Party B confirms (shorthand for proposing the same)
      await waitTx(await agreement.connect(partyB).confirmOutcome());
      console.log("  Party B confirmed A's proposal");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(await agreement.verdict(), VerdictEnum.TRUE_, "verdict=TRUE");

      // Escrow to A
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      assertEqual(pendingA, ESCROW, "pending A = escrow");

      await waitTx(await agreement.connect(deployer).claimFunds());
      console.log("  Status: RESOLVED | Verdict: TRUE");
      console.log("  Escrow to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 6: Dispute With Bridge Verdict TRUE
  //  DISPUTED -> evidence x2 -> RESOLVING -> bridge TRUE -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 6: Dispute With Bridge Verdict TRUE";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Accept
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      assertEqual(await agreement.status(), Status.ACTIVE, "status=ACTIVE");

      // Raise dispute (Party A initiates)
      await waitTx(await agreement.connect(deployer).raiseDispute());
      assertEqual(await agreement.status(), Status.DISPUTED, "status=DISPUTED");
      console.log("  Dispute raised by Party A");

      // Both submit evidence -> auto-triggers RESOLVING
      await waitTx(
        await agreement
          .connect(deployer)
          .submitEvidence("Party A evidence: delivery proof, commit logs"),
      );
      console.log("  Party A submitted evidence");

      await waitTx(
        await agreement
          .connect(partyB)
          .submitEvidence("Party B evidence: bug reports, spec violations"),
      );
      console.log("  Party B submitted evidence");

      assertEqual(await agreement.status(), Status.RESOLVING, "status=RESOLVING");

      // Deliver verdict TRUE via bridge simulation
      await deliverVerdict(
        factory,
        deployer,
        caseAddr,
        1, // TRUE
        "AI jury: Party A delivered as specified.",
      );
      console.log("  Bridge verdict delivered: TRUE");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(await agreement.verdict(), VerdictEnum.TRUE_, "verdict=TRUE");

      // Claim funds (Party A)
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      assertEqual(pendingA, ESCROW, "pending A = escrow");

      const balBefore = await usdc.balanceOf(deployer.address);
      await waitTx(await agreement.connect(deployer).claimFunds());
      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "A claimed escrow");

      console.log("  Status: RESOLVED | Verdict: TRUE");
      console.log("  Escrow to A:", formatUSDC(ESCROW), "USDC (claimed)");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 7: Dispute With Bridge Verdict FALSE
  //  DISPUTED -> evidence x2 -> RESOLVING -> bridge FALSE -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 7: Dispute With Bridge Verdict FALSE";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      await waitTx(await agreement.connect(partyB).acceptAgreement());
      await waitTx(await agreement.connect(deployer).raiseDispute());
      console.log("  Dispute raised");

      await waitTx(
        await agreement
          .connect(deployer)
          .submitEvidence("Party A evidence for case 7"),
      );
      await waitTx(
        await agreement
          .connect(partyB)
          .submitEvidence("Party B evidence for case 7"),
      );
      console.log("  Both parties submitted evidence");

      assertEqual(await agreement.status(), Status.RESOLVING, "status=RESOLVING");

      // Deliver verdict FALSE
      await deliverVerdict(
        factory,
        deployer,
        caseAddr,
        2, // FALSE
        "AI jury: Statement is false. Party B wins.",
      );
      console.log("  Bridge verdict delivered: FALSE");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(await agreement.verdict(), VerdictEnum.FALSE_, "verdict=FALSE");

      // Party B claims
      const pendingB = await agreement.pendingWithdrawals(partyB.address);
      assertEqual(pendingB, ESCROW, "pending B = escrow");

      const balBefore = await usdc.balanceOf(partyB.address);
      await waitTx(await agreement.connect(partyB).claimFunds());
      const balAfter = await usdc.balanceOf(partyB.address);
      assertEqual(balAfter - balBefore, ESCROW, "B claimed escrow");

      console.log("  Status: RESOLVED | Verdict: FALSE");
      console.log("  Escrow to B:", formatUSDC(ESCROW), "USDC (claimed)");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 8: Dispute With Bridge Verdict UNDETERMINED
  //  DISPUTED -> evidence x2 -> RESOLVING -> bridge UNDETERMINED -> RESOLVED
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 8: Dispute With Bridge Verdict UNDETERMINED";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      await waitTx(await agreement.connect(partyB).acceptAgreement());
      await waitTx(await agreement.connect(deployer).raiseDispute());
      console.log("  Dispute raised");

      await waitTx(
        await agreement
          .connect(deployer)
          .submitEvidence("Party A evidence for case 8"),
      );
      await waitTx(
        await agreement
          .connect(partyB)
          .submitEvidence("Party B evidence for case 8"),
      );
      console.log("  Both parties submitted evidence");

      assertEqual(await agreement.status(), Status.RESOLVING, "status=RESOLVING");

      // Deliver verdict UNDETERMINED
      await deliverVerdict(
        factory,
        deployer,
        caseAddr,
        0, // UNDETERMINED
        "AI jury: Insufficient evidence to determine outcome.",
      );
      console.log("  Bridge verdict delivered: UNDETERMINED");

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(
        await agreement.verdict(),
        VerdictEnum.UNDETERMINED,
        "verdict=UNDETERMINED",
      );

      // UNDETERMINED -> escrow refunded to A
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      assertEqual(pendingA, ESCROW, "pending A = escrow (refund)");

      const balBefore = await usdc.balanceOf(deployer.address);
      await waitTx(await agreement.connect(deployer).claimFunds());
      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "A claimed refund");

      console.log("  Status: RESOLVED | Verdict: UNDETERMINED");
      console.log("  Escrow refunded to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 9: Default Judgment Neither Submitted
  //  DISPUTED -> deadline passes -> resolveByDefault() -> RESOLVED
  //  Neither party submits -> UNDETERMINED, refund to A
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 9: Default Judgment Neither Submitted";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      // Short evidence deadline: 10 seconds
      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
        evidenceDeadlineSeconds: 10,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Accept + raise dispute
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      await waitTx(await agreement.connect(deployer).raiseDispute());
      assertEqual(await agreement.status(), Status.DISPUTED, "status=DISPUTED");
      console.log("  Dispute raised (evidence deadline = 10s)");

      // Neither party submits evidence - wait for deadline
      console.log("  Waiting 15s for evidence deadline to pass...");
      await sleep(15000);

      // Resolve by default
      const balBefore = await usdc.balanceOf(deployer.address);
      await waitTx(await agreement.resolveByDefault());

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      assertEqual(
        await agreement.verdict(),
        VerdictEnum.UNDETERMINED,
        "verdict=UNDETERMINED",
      );

      // Escrow refunded to A
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      // pendingA might be 0 if _releaseEscrow already transferred; check claim
      if (pendingA > 0n) {
        await waitTx(await agreement.connect(deployer).claimFunds());
      }
      const balAfter = await usdc.balanceOf(deployer.address);
      assertEqual(balAfter - balBefore, ESCROW, "escrow refunded to A");

      console.log("  Status: RESOLVED | Verdict: UNDETERMINED");
      console.log("  Escrow refunded to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 10: Default Judgment Initiator Wins
  //  DISPUTED -> initiator submits -> deadline -> resolveByDefault() -> RESOLVED
  //  Party A (initiator) submits, B does not -> A wins (TRUE)
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 10: Default Judgment Initiator Wins";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
        evidenceDeadlineSeconds: 10,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Accept + raise dispute (Party A = initiator)
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      await waitTx(await agreement.connect(deployer).raiseDispute());
      assertEqual(await agreement.status(), Status.DISPUTED, "status=DISPUTED");
      console.log("  Dispute raised by Party A (initiator)");

      // Only initiator (Party A) submits evidence
      await waitTx(
        await agreement
          .connect(deployer)
          .submitEvidence("Initiator evidence: proof of delivery"),
      );
      console.log("  Party A (initiator) submitted evidence");
      console.log("  Party B did NOT submit evidence");

      // Wait for deadline
      console.log("  Waiting 15s for evidence deadline to pass...");
      await sleep(15000);

      // Resolve by default -> initiator wins
      await waitTx(await agreement.resolveByDefault());

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      // Initiator is Party A -> TRUE verdict
      assertEqual(await agreement.verdict(), VerdictEnum.TRUE_, "verdict=TRUE (initiator wins)");

      // Escrow to A
      const pendingA = await agreement.pendingWithdrawals(deployer.address);
      assertEqual(pendingA, ESCROW, "pending A = escrow");

      await waitTx(await agreement.connect(deployer).claimFunds());

      console.log("  Status: RESOLVED | Verdict: TRUE (initiator wins)");
      console.log("  Escrow to A:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  CASE 11: Default Judgment Non-Initiator Wins
  //  DISPUTED -> non-initiator submits -> deadline -> resolveByDefault() -> RESOLVED
  //  Party A initiates dispute, only Party B (non-initiator) submits -> B wins (FALSE)
  // ════════════════════════════════════════════════════════════
  {
    const name = "Case 11: Default Judgment Non-Initiator Wins";
    console.log(`\n${"=".repeat(64)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(64)}`);
    let caseAddr = "";
    try {
      await mintAndApprove(usdc, FACTORY, deployer, ESCROW);

      caseAddr = await createCase(factory, deployer, partyB.address, name, ESCROW, {
        usdcAddr: MOCK_USDC,
        evidenceDeadlineSeconds: 10,
      });
      console.log("  Agreement:", caseAddr);

      const agreement = await ethers.getContractAt("Agreement", caseAddr);

      // Accept + raise dispute (Party A = initiator)
      await waitTx(await agreement.connect(partyB).acceptAgreement());
      await waitTx(await agreement.connect(deployer).raiseDispute());
      assertEqual(await agreement.status(), Status.DISPUTED, "status=DISPUTED");
      console.log("  Dispute raised by Party A (initiator)");

      // Only non-initiator (Party B) submits evidence
      await waitTx(
        await agreement
          .connect(partyB)
          .submitEvidence("Non-initiator evidence: counter-proof"),
      );
      console.log("  Party A (initiator) did NOT submit evidence");
      console.log("  Party B (non-initiator) submitted evidence");

      // Wait for deadline
      console.log("  Waiting 15s for evidence deadline to pass...");
      await sleep(15000);

      // Resolve by default -> non-initiator wins
      await waitTx(await agreement.resolveByDefault());

      assertEqual(await agreement.status(), Status.RESOLVED, "status=RESOLVED");
      // Non-initiator is Party B -> FALSE verdict (Party B = partyB, so verdict = FALSE)
      assertEqual(await agreement.verdict(), VerdictEnum.FALSE_, "verdict=FALSE (non-initiator wins)");

      // Escrow to B
      const pendingB = await agreement.pendingWithdrawals(partyB.address);
      assertEqual(pendingB, ESCROW, "pending B = escrow");

      const balBefore = await usdc.balanceOf(partyB.address);
      await waitTx(await agreement.connect(partyB).claimFunds());
      const balAfter = await usdc.balanceOf(partyB.address);
      assertEqual(balAfter - balBefore, ESCROW, "B claimed escrow");

      console.log("  Status: RESOLVED | Verdict: FALSE (non-initiator wins)");
      console.log("  Escrow to B:", formatUSDC(ESCROW), "USDC");
      console.log("  https://sepolia.basescan.org/address/" + caseAddr);
      console.log("  ** PASS **");
      passed++;
      results.push({ name, status: "PASS", addr: caseAddr });
    } catch (e: any) {
      console.error("  ** FAIL **:", e.message);
      failed++;
      results.push({ name, status: "FAIL", addr: caseAddr });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  Summary
  // ════════════════════════════════════════════════════════════
  console.log(`\n${"=".repeat(64)}`);
  console.log("  RESULTS SUMMARY");
  console.log(`${"=".repeat(64)}\n`);

  for (const r of results) {
    const icon = r.status === "PASS" ? "PASS" : "FAIL";
    const link = r.addr
      ? `https://sepolia.basescan.org/address/${r.addr}`
      : "N/A";
    console.log(`  [${icon}] ${r.name}`);
    console.log(`         ${link}`);
  }

  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`${"=".repeat(64)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
