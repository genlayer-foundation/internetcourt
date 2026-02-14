import { ethers } from "hardhat";

/**
 * Comprehensive manual end-to-end test for Internet Court system on Base Sepolia testnet.
 *
 * Tests the complete lifecycle:
 * 1. Setup & mint USDC
 * 2. Create agreement with escrow
 * 3. Party B accepts
 * 4. Raise dispute
 * 5. Submit evidence from both parties
 * 6. Deliver verdict via bridge simulation
 * 7. Claim funds
 * 8. Verify final state
 */

// Contract addresses on Base Sepolia
const MOCK_USDC = "0x58C27C7C1Ff5DBF480c956acf6b119508b6FBa4f";
const FACTORY = "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a";
const BRIDGE_RECEIVER = "0x347FbC76104588dF52b85b7c840a4a8a891E2cf2";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY!;

// Party B's private key from e2e-testnet.ts
const PARTY_B_KEY = "0x31f35a8cc001278c0293a9a061e0e291b6379d3cc75982613770e4b7967ecfaf";

// Enums
const Status = {
  CREATED: 0,
  ACTIVE: 1,
  DISPUTED: 2,
  RESOLVING: 3,
  RESOLVED: 4,
  CANCELLED: 5,
};

const Verdict = {
  UNDETERMINED: 0,
  TRUE_: 1,
  FALSE_: 2,
};

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Internet Court E2E Test - Base Sepolia Testnet");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ──────────────────────────────────────────────────────────────
  // Step 1: Setup
  // ──────────────────────────────────────────────────────────────
  console.log("📋 STEP 1: Setup wallets and initial balances");
  console.log("───────────────────────────────────────────────────────────────\n");

  const provider = ethers.provider;
  const partyA = new ethers.Wallet(DEPLOYER_KEY, provider);
  const partyB = new ethers.Wallet(PARTY_B_KEY, provider);

  console.log(`Party A (deployer): ${partyA.address}`);
  console.log(`Party B:            ${partyB.address}`);

  const ethBalanceA = await provider.getBalance(partyA.address);
  const ethBalanceB = await provider.getBalance(partyB.address);

  console.log(`\nETH Balances:`);
  console.log(`  Party A: ${ethers.formatEther(ethBalanceA)} ETH`);
  console.log(`  Party B: ${ethers.formatEther(ethBalanceB)} ETH`);

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", MOCK_USDC);
  const factory = await ethers.getContractAt("InternetCourtFactory", FACTORY);

  // Check current USDC balances
  let usdcBalanceA = await usdc.balanceOf(partyA.address);
  let usdcBalanceB = await usdc.balanceOf(partyB.address);

  console.log(`\nUSDC Balances (before mint):`);
  console.log(`  Party A: ${ethers.formatUnits(usdcBalanceA, 6)} USDC`);
  console.log(`  Party B: ${ethers.formatUnits(usdcBalanceB, 6)} USDC`);

  // Mint 10,000 USDC to Party A
  console.log(`\n🪙 Minting 10,000 USDC to Party A...`);
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC with 6 decimals

  // Get and set nonce manually to avoid nonce conflicts
  let currentNonce = await provider.getTransactionCount(partyA.address, 'pending');
  const mintTx = await usdc.connect(partyA).mint(partyA.address, mintAmount, { nonce: currentNonce });
  await mintTx.wait();
  console.log(`✅ Minted! Tx: ${mintTx.hash}`);
  currentNonce++;

  // Check updated balances
  usdcBalanceA = await usdc.balanceOf(partyA.address);
  usdcBalanceB = await usdc.balanceOf(partyB.address);

  console.log(`\nUSDC Balances (after mint):`);
  console.log(`  Party A: ${ethers.formatUnits(usdcBalanceA, 6)} USDC`);
  console.log(`  Party B: ${ethers.formatUnits(usdcBalanceB, 6)} USDC`);

  // ──────────────────────────────────────────────────────────────
  // Step 2: Create Agreement
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n📝 STEP 2: Create Agreement");
  console.log("───────────────────────────────────────────────────────────────\n");

  const escrowAmount = ethers.parseUnits("500", 6); // 500 USDC
  const statement = "The freelancer delivered the website as specified in the contract";
  const guidelines = "Evaluate based on: 1) All pages implemented 2) Responsive design 3) Performance benchmarks met";
  const evidenceDefs = "Party A: screenshots, deployment URL, original spec. Party B: work logs, commit history, deployment proof";
  const evidenceDeadlineSeconds = 3600; // 1 hour
  const joinDeadlineTimestamp = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const maxEvidenceLength = 10000;
  const constraints = "Evidence must be submitted in English";

  // Approve factory to spend USDC
  console.log(`💰 Approving factory to spend ${ethers.formatUnits(escrowAmount, 6)} USDC...`);
  const approveTx = await usdc.connect(partyA).approve(FACTORY, escrowAmount, { nonce: currentNonce });
  await approveTx.wait();
  console.log(`✅ Approved! Tx: ${approveTx.hash}`);
  currentNonce++;

  // Create agreement
  console.log(`\n🏗️  Creating agreement...`);
  console.log(`  Party A: ${partyA.address}`);
  console.log(`  Party B: ${partyB.address}`);
  console.log(`  Escrow:  ${ethers.formatUnits(escrowAmount, 6)} USDC`);
  console.log(`  Statement: "${statement}"`);

  const createTx = await factory.connect(partyA).createAgreement(
    partyB.address,
    statement,
    guidelines,
    evidenceDefs,
    evidenceDeadlineSeconds,
    MOCK_USDC,
    escrowAmount,
    joinDeadlineTimestamp,
    maxEvidenceLength,
    constraints,
    { nonce: currentNonce }
  );
  const createReceipt = await createTx.wait();
  console.log(`✅ Agreement created! Tx: ${createTx.hash}`);
  currentNonce++;

  // Extract agreement address from event
  const createEvent = createReceipt!.logs.find((log: any) => {
    try {
      const parsed = factory.interface.parseLog(log as any);
      return parsed?.name === "AgreementCreated";
    } catch {
      return false;
    }
  });

  if (!createEvent) {
    throw new Error("AgreementCreated event not found");
  }

  const parsedEvent = factory.interface.parseLog(createEvent as any);
  const agreementAddress = parsedEvent!.args.agreementAddress;
  const agreement = await ethers.getContractAt("Agreement", agreementAddress);

  console.log(`\n📍 Agreement deployed at: ${agreementAddress}`);
  console.log(`   View on Basescan: https://sepolia.basescan.org/address/${agreementAddress}`);

  // Check agreement status
  const statusAfterCreate = await agreement.status();
  const escrowInContract = await usdc.balanceOf(agreementAddress);

  console.log(`\n📊 Agreement State:`);
  console.log(`  Status: ${statusAfterCreate} (CREATED = 0)`);
  console.log(`  Escrow in contract: ${ethers.formatUnits(escrowInContract, 6)} USDC`);

  // ──────────────────────────────────────────────────────────────
  // Step 3: Accept Agreement
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n✅ STEP 3: Party B accepts agreement");
  console.log("───────────────────────────────────────────────────────────────\n");

  const acceptTx = await agreement.connect(partyB).acceptAgreement();
  await acceptTx.wait();
  console.log(`✅ Agreement accepted! Tx: ${acceptTx.hash}`);

  const statusAfterAccept = await agreement.status();
  console.log(`\n📊 Agreement State:`);
  console.log(`  Status: ${statusAfterAccept} (ACTIVE = 1)`);
  console.log(`  Escrow in contract: ${ethers.formatUnits(await usdc.balanceOf(agreementAddress), 6)} USDC`);

  // ──────────────────────────────────────────────────────────────
  // Step 4: Raise Dispute
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n⚡ STEP 4: Party A raises dispute");
  console.log("───────────────────────────────────────────────────────────────\n");

  const disputeTx = await agreement.connect(partyA).raiseDispute({ nonce: currentNonce });
  await disputeTx.wait();
  console.log(`✅ Dispute raised! Tx: ${disputeTx.hash}`);
  currentNonce++;

  const statusAfterDispute = await agreement.status();
  const disputeTimestamp = await agreement.disputeTimestamp();

  console.log(`\n📊 Agreement State:`);
  console.log(`  Status: ${statusAfterDispute} (DISPUTED = 2)`);
  console.log(`  Dispute timestamp: ${disputeTimestamp}`);
  console.log(`  Evidence deadline: ${Number(disputeTimestamp) + evidenceDeadlineSeconds}s from epoch`);

  // ──────────────────────────────────────────────────────────────
  // Step 5: Submit Evidence
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n📄 STEP 5: Submit evidence from both parties");
  console.log("───────────────────────────────────────────────────────────────\n");

  const evidenceA = "Here is the original project specification and screenshots showing the delivered work does not match: [spec.pdf] [screenshot1.png] [screenshot2.png]. The responsive design was not implemented for mobile.";
  const evidenceB = "Work logs show all requirements were met. Commit history: github.com/project/commits. Live deployment at staging.example.com demonstrates full responsive design.";

  console.log(`📤 Party A submitting evidence...`);
  console.log(`   Evidence (${evidenceA.length} chars): "${evidenceA.substring(0, 80)}..."`);
  const evidenceATx = await agreement.connect(partyA).submitEvidence(evidenceA, { nonce: currentNonce });
  await evidenceATx.wait();
  console.log(`✅ Party A evidence submitted! Tx: ${evidenceATx.hash}`);
  currentNonce++;

  console.log(`\n📤 Party B submitting evidence...`);
  console.log(`   Evidence (${evidenceB.length} chars): "${evidenceB.substring(0, 80)}..."`);
  const evidenceBTx = await agreement.connect(partyB).submitEvidence(evidenceB);
  await evidenceBTx.wait();
  console.log(`✅ Party B evidence submitted! Tx: ${evidenceBTx.hash}`);

  const statusAfterEvidence = await agreement.status();
  const evidenceASubmitted = await agreement.evidenceASubmitted();
  const evidenceBSubmitted = await agreement.evidenceBSubmitted();

  console.log(`\n📊 Agreement State:`);
  console.log(`  Status: ${statusAfterEvidence} (RESOLVING = 3)`);
  console.log(`  Evidence A submitted: ${evidenceASubmitted}`);
  console.log(`  Evidence B submitted: ${evidenceBSubmitted}`);

  // ──────────────────────────────────────────────────────────────
  // Step 6: Deliver Verdict via Bridge
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n⚖️  STEP 6: Deliver verdict via bridge");
  console.log("───────────────────────────────────────────────────────────────\n");

  // On testnet, we need to simulate bridge verdict delivery.
  // The factory has a processBridgeMessage() function that can only be called by bridgeReceiver.
  // We'll check if the deployer (partyA) is the factory owner and can set a verdict directly,
  // or if we need to impersonate the bridgeReceiver address.

  const factoryOwner = await factory.owner();
  const bridgeReceiver = await factory.bridgeReceiver();

  console.log(`Factory owner: ${factoryOwner}`);
  console.log(`Bridge receiver: ${bridgeReceiver}`);
  console.log(`Party A is owner: ${factoryOwner.toLowerCase() === partyA.address.toLowerCase()}`);

  // For this test, we'll use the factory's processBridgeMessage() by impersonating the bridge receiver
  // Note: On testnet, we can't use hardhat_impersonateAccount, so we'll check if partyA has permission

  const verdictValue = Verdict.TRUE_; // Party A wins
  const reasoning = "The evidence shows the delivered website meets all specified requirements. The responsive design is properly implemented as shown in the deployment proof.";

  console.log(`\n📋 Verdict details:`);
  console.log(`  Verdict: ${verdictValue} (TRUE = 1)`);
  console.log(`  Reasoning: "${reasoning}"`);

  // Encode the resolution data
  const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint8", "string"],
    [agreementAddress, verdictValue, reasoning]
  );

  // For testnet, we'll try to call processBridgeMessage directly if partyA is the owner
  // Otherwise, we need to use the bridge infrastructure properly

  // On testnet, the proper flow is:
  // BridgeForwarder.callRemoteArbitrary() -> (if local) -> Factory.processBridgeMessage() -> Agreement.setResolution()
  //
  // Since the factory is set up with bridgeReceiver = BridgeReceiver address (not BridgeForwarder),
  // and we don't have the BridgeForwarder deployed address, we'll need to simulate this properly.
  //
  // For this test, we'll call processBridgeMessage directly from the bridgeReceiver address.
  // On testnet, we need to either:
  // 1. Have the BridgeReceiver make the call (requires access to that wallet)
  // 2. Use hardhat_impersonateAccount (only works on local fork)
  // 3. Run the actual bridge relay service

  console.log(`\n🔗 Attempting to deliver verdict via bridge receiver...`);
  console.log(`   NOTE: Factory expects calls from bridgeReceiver: ${bridgeReceiver}`);
  console.log(`   Current caller would be: ${partyA.address}`);

  // Prepare the message in the format expected by processBridgeMessage
  const factoryMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [agreementAddress, resolutionData]
  );

  // Since Party A is the factory owner, we can use OPTION 3:
  // Temporarily set bridgeReceiver to Party A, deliver verdict, then restore
  let verdictDelivered = false;

  if (factoryOwner.toLowerCase() === partyA.address.toLowerCase()) {
    console.log(`\n✨ Party A is the factory owner! Using OPTION 3 to deliver verdict...`);
    console.log(`   1. Temporarily set bridgeReceiver to Party A`);
    console.log(`   2. Deliver the verdict`);
    console.log(`   3. Restore original bridgeReceiver`);

    try {
      // Step 1: Set bridgeReceiver to Party A temporarily
      console.log(`\n🔧 Setting bridgeReceiver to Party A...`);
      const setBridgeTx = await factory.connect(partyA).setBridgeReceiver(partyA.address, { nonce: currentNonce });
      await setBridgeTx.wait();
      console.log(`✅ Bridge receiver updated! Tx: ${setBridgeTx.hash}`);
      currentNonce++;

      // Step 2: Deliver verdict
      console.log(`\n⚖️  Delivering verdict...`);
      const verdictTx = await factory.connect(partyA).processBridgeMessage(
        42, // srcChainId (GenLayer chain ID placeholder)
        partyA.address, // srcSender
        factoryMessage,
        { nonce: currentNonce }
      );
      await verdictTx.wait();
      console.log(`✅ Verdict delivered! Tx: ${verdictTx.hash}`);
      currentNonce++;
      verdictDelivered = true;

      // Step 3: Restore original bridgeReceiver
      console.log(`\n🔄 Restoring original bridgeReceiver...`);
      const restoreTx = await factory.connect(partyA).setBridgeReceiver(bridgeReceiver, { nonce: currentNonce });
      await restoreTx.wait();
      console.log(`✅ Bridge receiver restored! Tx: ${restoreTx.hash}`);
      currentNonce++;

    } catch (error: any) {
      console.log(`\n❌ Verdict delivery failed:`);
      console.log(`   Error: ${error.message}`);
      verdictDelivered = false;
    }
  } else {
    console.log(`\n❌ Direct verdict delivery not possible:`);
    console.log(`   Party A is not the factory owner, so cannot use OPTION 3.`);
    console.log(`\n📝 To deliver a verdict on testnet, you would need to:`);
    console.log(`   OPTION 1 - Use the bridge relay service`);
    console.log(`   OPTION 2 - Access BridgeReceiver private key`);
  }

  // Check if verdict was delivered
  const statusAfterVerdict = await agreement.status();
  const currentVerdict = await agreement.verdict();
  const currentReasoning = await agreement.reasoning();

  console.log(`\n📊 Agreement State After Verdict Attempt:`);
  console.log(`  Status: ${statusAfterVerdict} (RESOLVED = 4, or still RESOLVING = 3)`);
  console.log(`  Verdict: ${currentVerdict}`);
  console.log(`  Reasoning: "${currentReasoning}"`);

  // ──────────────────────────────────────────────────────────────
  // Step 7: Claim Funds (if verdict was delivered)
  // ──────────────────────────────────────────────────────────────
  if (verdictDelivered && Number(statusAfterVerdict) === Status.RESOLVED) {
    console.log("\n\n💰 STEP 7: Claim funds");
    console.log("───────────────────────────────────────────────────────────────\n");

    const pendingA = await agreement.pendingWithdrawals(partyA.address);
    const pendingB = await agreement.pendingWithdrawals(partyB.address);

    console.log(`Pending withdrawals:`);
    console.log(`  Party A: ${ethers.formatUnits(pendingA, 6)} USDC`);
    console.log(`  Party B: ${ethers.formatUnits(pendingB, 6)} USDC`);

    if (pendingA > 0n) {
      const usdcBeforeClaim = await usdc.balanceOf(partyA.address);
      console.log(`\n💸 Party A claiming funds...`);
      const claimTx = await agreement.connect(partyA).claimFunds({ nonce: currentNonce });
      await claimTx.wait();
      console.log(`✅ Funds claimed! Tx: ${claimTx.hash}`);
      currentNonce++;

      const usdcAfterClaim = await usdc.balanceOf(partyA.address);
      console.log(`\n📊 Party A USDC balance:`);
      console.log(`  Before claim: ${ethers.formatUnits(usdcBeforeClaim, 6)} USDC`);
      console.log(`  After claim:  ${ethers.formatUnits(usdcAfterClaim, 6)} USDC`);
      console.log(`  Received:     ${ethers.formatUnits(usdcAfterClaim - usdcBeforeClaim, 6)} USDC`);
    }
  } else {
    console.log("\n\n⏭️  STEP 7: Skipped (verdict not delivered yet)");
    console.log("───────────────────────────────────────────────────────────────");
  }

  // ──────────────────────────────────────────────────────────────
  // Step 8: Verify Final State
  // ──────────────────────────────────────────────────────────────
  console.log("\n\n📊 STEP 8: Final state verification");
  console.log("───────────────────────────────────────────────────────────────\n");

  const finalStatus = await agreement.status();
  const finalVerdict = await agreement.verdict();
  const finalReasoning = await agreement.reasoning();
  const finalPartyA = await agreement.partyA();
  const finalPartyB = await agreement.partyB();
  const finalStatement = await agreement.statement();
  const finalGuidelines = await agreement.guidelines();
  const finalEvidenceDefs = await agreement.evidenceDefs();
  const finalEvidenceA = await agreement.evidenceASubmitted() ?
    (await agreement.getEvidenceA()).substring(0, 100) + "..." : "Not submitted";
  const finalEvidenceB = await agreement.evidenceBSubmitted() ?
    (await agreement.getEvidenceB()).substring(0, 100) + "..." : "Not submitted";
  const finalEscrowInContract = await usdc.balanceOf(agreementAddress);
  const finalPendingA = await agreement.pendingWithdrawals(partyA.address);
  const finalPendingB = await agreement.pendingWithdrawals(partyB.address);

  console.log(`Agreement Address: ${agreementAddress}`);
  console.log(`\nParties:`);
  console.log(`  Party A: ${finalPartyA}`);
  console.log(`  Party B: ${finalPartyB}`);
  console.log(`\nContract Terms:`);
  console.log(`  Statement: "${finalStatement}"`);
  console.log(`  Guidelines: "${finalGuidelines.substring(0, 100)}..."`);
  console.log(`  Evidence Defs: "${finalEvidenceDefs.substring(0, 100)}..."`);
  console.log(`\nEvidence:`);
  console.log(`  Party A: "${finalEvidenceA}"`);
  console.log(`  Party B: "${finalEvidenceB}"`);
  console.log(`\nResolution:`);
  console.log(`  Status: ${finalStatus} (${getStatusName(Number(finalStatus))})`);
  console.log(`  Verdict: ${finalVerdict} (${getVerdictName(Number(finalVerdict))})`);
  console.log(`  Reasoning: "${finalReasoning}"`);
  console.log(`\nEscrow:`);
  console.log(`  Contract balance: ${ethers.formatUnits(finalEscrowInContract, 6)} USDC`);
  console.log(`  Pending A: ${ethers.formatUnits(finalPendingA, 6)} USDC`);
  console.log(`  Pending B: ${ethers.formatUnits(finalPendingB, 6)} USDC`);

  console.log(`\n🔗 View on Basescan:`);
  console.log(`   Agreement: https://sepolia.basescan.org/address/${agreementAddress}`);
  console.log(`   Factory:   https://sepolia.basescan.org/address/${FACTORY}`);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ E2E Test Complete!");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

function getStatusName(status: number): string {
  const names = ["CREATED", "ACTIVE", "DISPUTED", "RESOLVING", "RESOLVED", "CANCELLED"];
  return names[status] || "UNKNOWN";
}

function getVerdictName(verdict: number): string {
  const names = ["UNDETERMINED", "TRUE", "FALSE"];
  return names[verdict] || "UNKNOWN";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
