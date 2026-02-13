import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * End-to-End tests for the Internet Court bridge & escrow system.
 *
 * Tests the FULL lifecycle on a local Hardhat network, covering:
 * - Factory + Bridge infrastructure deployment & wiring
 * - Agreement creation with escrow
 * - Agreement acceptance
 * - Mutual agreement resolution path
 * - Dispute path: raise -> evidence -> resolving -> bridge verdict -> resolved
 * - Bridge verdict delivery via BridgeForwarder local dispatch
 * - Escrow withdrawal for all verdict types (TRUE, FALSE, UNDETERMINED)
 * - Cancellation before acceptance
 */
describe("E2E: Internet Court Bridge & Escrow System", function () {
  // ──────────────────────────────────────────────
  //  Constants
  // ──────────────────────────────────────────────

  const ESCROW = ethers.parseEther("1");
  const STATEMENT = "The job was completed as specified in the contract";
  const GUIDELINES = "Evaluate based on deliverables vs contract specifications";
  const EVIDENCE_DEFS = "Party A: contract + proof of delivery. Party B: contract + complaint.";
  const EVIDENCE_DEADLINE = 3600; // 1 hour

  // Status enum mirrors the contract
  const Status = {
    CREATED: 0,
    ACTIVE: 1,
    DISPUTED: 2,
    RESOLVING: 3,
    RESOLVED: 4,
    CANCELLED: 5,
  };

  // Verdict enum mirrors the contract
  const Verdict = {
    UNDETERMINED: 0,
    TRUE_: 1,
    FALSE_: 2,
  };

  // The local EID used by MockLZEndpoint - must match for local dispatch
  const LOCAL_EID = 30101;

  // ──────────────────────────────────────────────
  //  Fixtures
  // ──────────────────────────────────────────────

  /**
   * Deploy the full infrastructure:
   * - MockLZEndpoint
   * - BridgeForwarder (connected to endpoint)
   * - BridgeReceiver (connected to endpoint)
   * - InternetCourtFactory (with bridgeReceiver set)
   * - Wire them together: trusted forwarder on receiver, bridge address on forwarder
   */
  async function deployFullInfraFixture() {
    const [owner, partyA, partyB, outsider] = await ethers.getSigners();

    // 1. Deploy MockLZEndpoint
    const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");
    const endpoint = await MockEndpoint.deploy(LOCAL_EID);

    // 2. Deploy BridgeForwarder
    const BridgeForwarder = await ethers.getContractFactory("BridgeForwarder");
    const forwarder = await BridgeForwarder.deploy(
      await endpoint.getAddress(),
      owner.address
    );

    // 3. Deploy BridgeReceiver
    const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
    const receiver = await BridgeReceiver.deploy(
      await endpoint.getAddress(),
      owner.address
    );

    // 4. Deploy InternetCourtFactory.
    //    For LOCAL dispatch, the BridgeForwarder calls factory.processBridgeMessage()
    //    directly (msg.sender = forwarder). So we set bridgeReceiver = forwarder address.
    //    For CROSS-CHAIN dispatch, the BridgeReceiver would be the caller, and we'd set
    //    bridgeReceiver = receiver address instead.
    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(
      await forwarder.getAddress(),  // bridgeReceiver = forwarder for local dispatch
      owner.address
    );

    // 5. Wire: Set trusted forwarder on receiver (forwarder's address, padded to bytes32)
    const forwarderBytes32 = ethers.zeroPadValue(await forwarder.getAddress(), 32);
    await receiver.connect(owner).setTrustedForwarder(LOCAL_EID, forwarderBytes32);

    // 6. Wire: Grant CALLER_ROLE to owner on forwarder (owner already has it from constructor)
    // No action needed - owner already has CALLER_ROLE from constructor

    // 7. Wire: Set bridge address on forwarder for local dispatch (not needed for local,
    //    but set it for completeness in case cross-chain tests are added)
    const receiverBytes32 = ethers.zeroPadValue(await receiver.getAddress(), 32);
    await forwarder.connect(owner).setBridgeAddress(LOCAL_EID, receiverBytes32);

    return { endpoint, forwarder, receiver, factory, owner, partyA, partyB, outsider };
  }

  /**
   * Deploy infra + create an agreement (Party A deposits 1 ETH)
   */
  async function createAgreementFixture() {
    const { endpoint, forwarder, receiver, factory, owner, partyA, partyB, outsider } =
      await loadFixture(deployFullInfraFixture);

    // Party A creates agreement with 1 ETH escrow
    const tx = await factory
      .connect(partyA)
      .createAgreement(
        partyB.address,
        STATEMENT,
        GUIDELINES,
        EVIDENCE_DEFS,
        EVIDENCE_DEADLINE,
        { value: ESCROW }
      );
    const receipt = await tx.wait();

    // Get agreement address from event
    const event = receipt!.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
      } catch {
        return false;
      }
    });
    const parsed = factory.interface.parseLog(event as any);
    const agreementAddr = parsed!.args.agreementAddress;
    const agreement = await ethers.getContractAt("Agreement", agreementAddr);

    return { endpoint, forwarder, receiver, factory, agreement, agreementAddr, owner, partyA, partyB, outsider };
  }

  /**
   * Deploy infra + create agreement + Party B accepts (ACTIVE state)
   */
  async function activeAgreementFixture() {
    const fixtures = await loadFixture(createAgreementFixture);
    const { agreement, partyB } = fixtures;

    await agreement.connect(partyB).acceptAndDeposit({ value: ESCROW });

    return fixtures;
  }

  /**
   * Deploy infra + active agreement + dispute raised (DISPUTED state)
   */
  async function disputedAgreementFixture() {
    const fixtures = await loadFixture(activeAgreementFixture);
    const { agreement, partyA } = fixtures;

    await agreement.connect(partyA).raiseDispute();

    return fixtures;
  }

  /**
   * Deploy infra + disputed agreement + both parties submit evidence (RESOLVING state)
   */
  async function resolvingAgreementFixture() {
    const fixtures = await loadFixture(disputedAgreementFixture);
    const { agreement, partyA, partyB } = fixtures;

    await agreement.connect(partyA).submitEvidence("Party A proof: delivery confirmed on 2025-01-15");
    await agreement.connect(partyB).submitEvidence("Party B proof: delivery was late by 3 days");

    return fixtures;
  }

  // ──────────────────────────────────────────────
  //  Helper: Deliver a verdict via the bridge
  // ──────────────────────────────────────────────

  /**
   * Simulate bridge verdict delivery using BridgeForwarder local dispatch.
   * This is the path: relay service -> BridgeForwarder.callRemoteArbitrary()
   *   -> (local dispatch) -> Factory.processBridgeMessage() -> Agreement.setResolution()
   */
  async function deliverVerdict(
    forwarder: any,
    factory: any,
    agreementAddr: string,
    verdictValue: number,
    reasoning: string,
    caller: any,
    txHashSeed: string
  ) {
    const txHash = ethers.keccak256(ethers.toUtf8Bytes(txHashSeed));

    // Inner resolution data: (address agreementAddr, uint8 verdict, string reasoning)
    const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint8", "string"],
      [agreementAddr, verdictValue, reasoning]
    );

    // Factory-level message: (address agreementAddr, bytes resolutionData)
    const factoryMessage = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "bytes"],
      [agreementAddr, resolutionData]
    );

    // Bridge envelope for local dispatch:
    // (uint32 srcChainId, address srcSender, address localContract, bytes message)
    const bridgeEnvelope = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint32", "address", "address", "bytes"],
      [42, caller.address, await factory.getAddress(), factoryMessage]
    );

    // Call BridgeForwarder with dstEid = LOCAL_EID for local dispatch
    return forwarder
      .connect(caller)
      .callRemoteArbitrary(txHash, LOCAL_EID, bridgeEnvelope, "0x");
  }

  // ──────────────────────────────────────────────
  //  1. Setup: Deploy and wire infrastructure
  // ──────────────────────────────────────────────

  describe("1. Infrastructure Setup", function () {
    it("deploys all contracts and wires them together", async function () {
      const { endpoint, forwarder, receiver, factory, owner } =
        await loadFixture(deployFullInfraFixture);

      // Endpoint deployed
      expect(await endpoint.eid()).to.equal(LOCAL_EID);

      // Forwarder is connected to endpoint
      expect(await forwarder.endpoint()).to.equal(await endpoint.getAddress());

      // Receiver is connected to endpoint
      expect(await receiver.endpoint()).to.equal(await endpoint.getAddress());

      // Factory has forwarder as bridge receiver (for local dispatch path)
      expect(await factory.bridgeReceiver()).to.equal(await forwarder.getAddress());

      // Receiver trusts forwarder for LOCAL_EID
      const expectedForwarder = ethers.zeroPadValue(await forwarder.getAddress(), 32);
      expect(await receiver.trustedForwarders(LOCAL_EID)).to.equal(expectedForwarder);

      // Factory owned by owner
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("factory starts with nextAgreementId = 0", async function () {
      const { factory } = await loadFixture(deployFullInfraFixture);
      expect(await factory.nextAgreementId()).to.equal(0);
    });
  });

  // ──────────────────────────────────────────────
  //  2. Agreement Creation
  // ──────────────────────────────────────────────

  describe("2. Agreement Creation", function () {
    it("Party A creates agreement with 1 ETH escrow", async function () {
      const { factory, partyA, partyB } =
        await loadFixture(deployFullInfraFixture);

      await expect(
        factory
          .connect(partyA)
          .createAgreement(
            partyB.address,
            STATEMENT,
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            { value: ESCROW }
          )
      ).to.emit(factory, "AgreementCreated");
    });

    it("agreement has correct parameters after creation", async function () {
      const { agreement, partyA, partyB, factory } =
        await loadFixture(createAgreementFixture);

      expect(await agreement.partyA()).to.equal(partyA.address);
      expect(await agreement.partyB()).to.equal(partyB.address);
      expect(await agreement.statement()).to.equal(STATEMENT);
      expect(await agreement.guidelines()).to.equal(GUIDELINES);
      expect(await agreement.evidenceDefs()).to.equal(EVIDENCE_DEFS);
      expect(await agreement.evidenceDeadlineSeconds()).to.equal(EVIDENCE_DEADLINE);
      expect(await agreement.escrowA()).to.equal(ESCROW);
      expect(await agreement.status()).to.equal(Status.CREATED);
      expect(await agreement.factory()).to.equal(await factory.getAddress());
    });

    it("agreement holds the escrowed ETH", async function () {
      const { agreement, agreementAddr } =
        await loadFixture(createAgreementFixture);

      const balance = await ethers.provider.getBalance(agreementAddr);
      expect(balance).to.equal(ESCROW);
    });

    it("factory tracks the agreement", async function () {
      const { factory, agreementAddr } =
        await loadFixture(createAgreementFixture);

      expect(await factory.deployedAgreements(agreementAddr)).to.be.true;
      expect(await factory.agreements(0)).to.equal(agreementAddr);
      expect(await factory.nextAgreementId()).to.equal(1);
    });
  });

  // ──────────────────────────────────────────────
  //  3. Agreement Acceptance
  // ──────────────────────────────────────────────

  describe("3. Agreement Acceptance", function () {
    it("Party B accepts with matching 1 ETH escrow, status -> ACTIVE", async function () {
      const { agreement, partyB } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyB).acceptAndDeposit({ value: ESCROW })
      )
        .to.emit(agreement, "AgreementAccepted")
        .withArgs(partyB.address, ESCROW);

      expect(await agreement.status()).to.equal(Status.ACTIVE);
      expect(await agreement.escrowB()).to.equal(ESCROW);
    });

    it("agreement now holds 2 ETH total escrow", async function () {
      const { agreement, agreementAddr } =
        await loadFixture(activeAgreementFixture);

      const balance = await ethers.provider.getBalance(agreementAddr);
      expect(balance).to.equal(ESCROW * 2n);
      expect(await agreement.getTotalEscrow()).to.equal(ESCROW * 2n);
    });
  });

  // ──────────────────────────────────────────────
  //  4. Mutual Agreement Path
  // ──────────────────────────────────────────────

  describe("4. Mutual Agreement Path (2-of-2)", function () {
    it("both propose TRUE -> resolves, all escrow to Party A", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Party A proposes TRUE
      await agreement.connect(partyA).proposeOutcome(true);
      expect(await agreement.status()).to.equal(Status.ACTIVE); // Not yet resolved

      // Party B proposes TRUE -> match -> resolve
      await expect(agreement.connect(partyB).proposeOutcome(true))
        .to.emit(agreement, "OutcomeConfirmed")
        .withArgs(Verdict.TRUE_);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(totalEscrow);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);

      // Party A claims all funds
      const balanceBefore = await ethers.provider.getBalance(partyA.address);
      const txClaim = await agreement.connect(partyA).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);
    });

    it("both propose FALSE -> resolves, all escrow to Party B", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      await agreement.connect(partyA).proposeOutcome(false);
      await agreement.connect(partyB).proposeOutcome(false);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(totalEscrow);

      // Party B claims all funds
      const balanceBefore = await ethers.provider.getBalance(partyB.address);
      const txClaim = await agreement.connect(partyB).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
    });

    it("Party B confirms Party A's TRUE proposal -> resolves", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(true);

      await expect(agreement.connect(partyB).confirmOutcome())
        .to.emit(agreement, "OutcomeConfirmed")
        .withArgs(Verdict.TRUE_);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
    });

    it("disagreeing proposals do NOT resolve", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(true);
      await agreement.connect(partyB).proposeOutcome(false);

      // Should remain ACTIVE - no resolution
      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });
  });

  // ──────────────────────────────────────────────
  //  5. Dispute Path - Full Flow
  // ──────────────────────────────────────────────

  describe("5. Dispute Path - Full Flow", function () {
    it("Party A raises dispute -> status DISPUTED", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(agreement.connect(partyA).raiseDispute())
        .to.emit(agreement, "DisputeRaised");

      expect(await agreement.status()).to.equal(Status.DISPUTED);
      expect(await agreement.disputeTimestamp()).to.be.greaterThan(0);
    });

    it("both parties submit evidence -> auto-triggers RESOLVING", async function () {
      const { agreement, factory, agreementAddr, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      // Party A submits evidence
      await expect(
        agreement.connect(partyA).submitEvidence("Party A evidence: delivery proof")
      )
        .to.emit(agreement, "EvidenceSubmitted")
        .withArgs(partyA.address);

      expect(await agreement.status()).to.equal(Status.DISPUTED); // Still disputed

      // Party B submits evidence -> triggers resolution
      // DisputeRequested emits block.timestamp at the time of the requestDispute call,
      // which is the same block as submitEvidence. We just check the event is emitted.
      await expect(
        agreement.connect(partyB).submitEvidence("Party B evidence: complaint details")
      )
        .to.emit(agreement, "ResolutionTriggered")
        .and.to.emit(factory, "DisputeRequested");

      expect(await agreement.status()).to.equal(Status.RESOLVING);
    });

    it("DisputeRequested event is emitted by factory when resolution triggers", async function () {
      const { agreement, factory, agreementAddr, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("Evidence A");

      // The second submission triggers resolution which calls factory.requestDispute
      await expect(
        agreement.connect(partyB).submitEvidence("Evidence B")
      ).to.emit(factory, "DisputeRequested");
    });

    it("evidence is stored correctly", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      expect(await agreement.getEvidenceA()).to.equal(
        "Party A proof: delivery confirmed on 2025-01-15"
      );
      expect(await agreement.getEvidenceB()).to.equal(
        "Party B proof: delivery was late by 3 days"
      );
      expect(await agreement.evidenceASubmitted()).to.be.true;
      expect(await agreement.evidenceBSubmitted()).to.be.true;
    });
  });

  // ──────────────────────────────────────────────
  //  6. Bridge Verdict Delivery
  // ──────────────────────────────────────────────

  describe("6. Bridge Verdict Delivery (BridgeForwarder local dispatch)", function () {
    it("TRUE verdict flows through: Forwarder -> Factory -> Agreement", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner } =
        await loadFixture(resolvingAgreementFixture);

      const reasoning = "The evidence shows the job was completed on time";

      // Deliver verdict via bridge
      await expect(
        deliverVerdict(
          forwarder, factory, agreementAddr,
          Verdict.TRUE_, reasoning, owner, "e2e-true-verdict"
        )
      )
        .to.emit(agreement, "Resolved")
        .withArgs(Verdict.TRUE_, reasoning)
        .and.to.emit(factory, "VerdictReceived")
        .withArgs(agreementAddr, Verdict.TRUE_);

      // Verify final state
      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
      expect(await agreement.reasoning()).to.equal(reasoning);
    });

    it("FALSE verdict flows through correctly", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner } =
        await loadFixture(resolvingAgreementFixture);

      const reasoning = "The evidence shows the job was NOT completed as specified";

      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.FALSE_, reasoning, owner, "e2e-false-verdict"
      );

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
      expect(await agreement.reasoning()).to.equal(reasoning);
    });

    it("UNDETERMINED verdict flows through correctly", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner } =
        await loadFixture(resolvingAgreementFixture);

      const reasoning = "Insufficient evidence to make a determination";

      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.UNDETERMINED, reasoning, owner, "e2e-undetermined-verdict"
      );

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.UNDETERMINED);
      expect(await agreement.reasoning()).to.equal(reasoning);
    });

    it("replay protection: same txHash cannot be used twice", async function () {
      const { forwarder, factory, agreementAddr, owner } =
        await loadFixture(resolvingAgreementFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("replay-test-e2e"));

      // Build message
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Reason"]
      );
      const factoryMessage = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );
      const bridgeEnvelope = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [42, owner.address, await factory.getAddress(), factoryMessage]
      );

      // First call succeeds
      await forwarder
        .connect(owner)
        .callRemoteArbitrary(txHash, LOCAL_EID, bridgeEnvelope, "0x");

      // Second call with same hash fails
      await expect(
        forwarder
          .connect(owner)
          .callRemoteArbitrary(txHash, LOCAL_EID, bridgeEnvelope, "0x")
      ).to.be.revertedWith("BridgeForwarder: txHash already used");
    });
  });

  // ──────────────────────────────────────────────
  //  7. Escrow Withdrawal
  // ──────────────────────────────────────────────

  describe("7. Escrow Withdrawal", function () {
    it("TRUE verdict: Party A (winner) claims all escrow via claimFunds()", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Deliver TRUE verdict
      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.TRUE_, "Statement verified", owner, "e2e-withdraw-true"
      );

      // Verify pending withdrawals
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(totalEscrow);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);

      // Party A claims
      const balanceBefore = await ethers.provider.getBalance(partyA.address);
      const txClaim = await agreement.connect(partyA).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);

      // Pending cleared
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);

      // Emits FundsClaimed
      await expect(txClaim)
        .to.emit(agreement, "FundsClaimed")
        .withArgs(partyA.address, totalEscrow);
    });

    it("FALSE verdict: Party B (winner) claims all escrow", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Deliver FALSE verdict
      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.FALSE_, "Statement disproven", owner, "e2e-withdraw-false"
      );

      // Verify pending withdrawals
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(totalEscrow);
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);

      // Party B claims
      const balanceBefore = await ethers.provider.getBalance(partyB.address);
      const txClaim = await agreement.connect(partyB).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);

      // Party A has nothing to claim
      await expect(
        agreement.connect(partyA).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("loser has nothing to claim", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyB } =
        await loadFixture(resolvingAgreementFixture);

      // TRUE verdict -> Party A wins
      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.TRUE_, "Winner is A", owner, "e2e-loser-claim"
      );

      // Party B (loser) tries to claim -> reverts
      await expect(
        agreement.connect(partyB).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("cannot claim twice", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyA } =
        await loadFixture(resolvingAgreementFixture);

      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.TRUE_, "Winner", owner, "e2e-double-claim"
      );

      // First claim succeeds
      await agreement.connect(partyA).claimFunds();

      // Second claim reverts
      await expect(
        agreement.connect(partyA).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });
  });

  // ──────────────────────────────────────────────
  //  8. Cancel Path
  // ──────────────────────────────────────────────

  describe("8. Cancel Path (before acceptance)", function () {
    it("Party A cancels -> gets escrow back", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      const balanceBefore = await ethers.provider.getBalance(partyA.address);

      const tx = await agreement.connect(partyA).cancel();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      expect(await agreement.status()).to.equal(Status.CANCELLED);

      const balanceAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW - gasUsed);
    });

    it("emits Cancelled event", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(agreement.connect(partyA).cancel())
        .to.emit(agreement, "Cancelled")
        .withArgs(partyA.address);
    });

    it("agreement balance is 0 after cancellation", async function () {
      const { agreement, agreementAddr, partyA } =
        await loadFixture(createAgreementFixture);

      await agreement.connect(partyA).cancel();

      const balance = await ethers.provider.getBalance(agreementAddr);
      expect(balance).to.equal(0);
    });

    it("Party B cannot cancel", async function () {
      const { agreement, partyB } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyB).cancel()
      ).to.be.revertedWith("Only party A");
    });

    it("cannot cancel after acceptance (ACTIVE status)", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyA).cancel()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ──────────────────────────────────────────────
  //  9. UNDETERMINED Verdict - Both Parties Get Deposits Back
  // ──────────────────────────────────────────────

  describe("9. UNDETERMINED Verdict - Both Parties Get Deposits Back", function () {
    it("UNDETERMINED: both parties get their original deposits back", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      // Deliver UNDETERMINED verdict via bridge
      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.UNDETERMINED,
        "Insufficient evidence to determine outcome",
        owner,
        "e2e-undetermined-withdrawal"
      );

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.UNDETERMINED);

      // Both parties have pending withdrawals for their original deposit
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Party A claims their deposit
      const balanceABefore = await ethers.provider.getBalance(partyA.address);
      const txA = await agreement.connect(partyA).claimFunds();
      const receiptA = await txA.wait();
      const gasA = receiptA!.gasUsed * receiptA!.gasPrice;
      const balanceAAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAAfter).to.equal(balanceABefore - gasA + ESCROW);

      // Party B claims their deposit
      const balanceBBefore = await ethers.provider.getBalance(partyB.address);
      const txB = await agreement.connect(partyB).claimFunds();
      const receiptB = await txB.wait();
      const gasB = receiptB!.gasUsed * receiptB!.gasPrice;
      const balanceBAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceBAfter).to.equal(balanceBBefore - gasB + ESCROW);

      // Agreement contract balance is now 0
      const agreementBalance = await ethers.provider.getBalance(agreementAddr);
      expect(agreementBalance).to.equal(0);
    });

    it("UNDETERMINED: each party can only claim their own deposit", async function () {
      const { forwarder, factory, agreement, agreementAddr, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      await deliverVerdict(
        forwarder, factory, agreementAddr,
        Verdict.UNDETERMINED,
        "Cannot determine",
        owner,
        "e2e-undetermined-own-deposit"
      );

      // Each has exactly ESCROW pending, not 2*ESCROW
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Outsider has nothing
      const { outsider } = await loadFixture(resolvingAgreementFixture);
      // Just verify outsider pattern - the outsider from our current fixture
      // We verify via the agreement that only the parties have pending amounts
    });
  });

  // ──────────────────────────────────────────────
  //  10. Full Happy Path (end-to-end in one test)
  // ──────────────────────────────────────────────

  describe("10. Complete Happy Path (single test)", function () {
    it("full lifecycle: create -> accept -> dispute -> evidence -> bridge verdict -> withdraw", async function () {
      const [owner, partyA, partyB] = await ethers.getSigners();

      // ---- Deploy infrastructure ----
      const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");
      const endpoint = await MockEndpoint.deploy(LOCAL_EID);

      const BridgeForwarder = await ethers.getContractFactory("BridgeForwarder");
      const forwarder = await BridgeForwarder.deploy(
        await endpoint.getAddress(),
        owner.address
      );

      const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
      const receiver = await BridgeReceiver.deploy(
        await endpoint.getAddress(),
        owner.address
      );

      const Factory = await ethers.getContractFactory("InternetCourtFactory");
      const factory = await Factory.deploy(
        await forwarder.getAddress(),  // bridgeReceiver = forwarder for local dispatch
        owner.address
      );

      // Wire them together
      const forwarderBytes32 = ethers.zeroPadValue(await forwarder.getAddress(), 32);
      await receiver.connect(owner).setTrustedForwarder(LOCAL_EID, forwarderBytes32);

      // ---- Step 1: Party A creates agreement ----
      const createTx = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          "The widget was delivered on time",
          "Check delivery receipt timestamp",
          "A: delivery receipt. B: order confirmation.",
          3600,
          { value: ethers.parseEther("2") }
        );
      const createReceipt = await createTx.wait();
      const createEvent = createReceipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
        } catch {
          return false;
        }
      });
      const parsedEvent = factory.interface.parseLog(createEvent as any);
      const agreementAddr = parsedEvent!.args.agreementAddress;
      const agreement = await ethers.getContractAt("Agreement", agreementAddr);

      expect(await agreement.status()).to.equal(Status.CREATED);

      // ---- Step 2: Party B accepts ----
      await agreement.connect(partyB).acceptAndDeposit({ value: ethers.parseEther("2") });
      expect(await agreement.status()).to.equal(Status.ACTIVE);

      // ---- Step 3: Party A raises dispute ----
      await agreement.connect(partyA).raiseDispute();
      expect(await agreement.status()).to.equal(Status.DISPUTED);

      // ---- Step 4: Both submit evidence ----
      await agreement.connect(partyA).submitEvidence("Delivery was on Jan 15 as agreed");
      await agreement.connect(partyB).submitEvidence("Delivery was actually Jan 18, 3 days late");
      expect(await agreement.status()).to.equal(Status.RESOLVING);

      // ---- Step 5: Bridge delivers verdict ----
      const txHash = ethers.keccak256(ethers.toUtf8Bytes("e2e-happy-path"));
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Delivery receipt shows Jan 15, which meets the deadline"]
      );
      const factoryMessage = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );
      const bridgeEnvelope = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [42, owner.address, await factory.getAddress(), factoryMessage]
      );

      await forwarder
        .connect(owner)
        .callRemoteArbitrary(txHash, LOCAL_EID, bridgeEnvelope, "0x");

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);

      // ---- Step 6: Winner withdraws ----
      const totalEscrow = ethers.parseEther("4"); // 2 + 2
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(totalEscrow);

      const balBefore = await ethers.provider.getBalance(partyA.address);
      const claimTx = await agreement.connect(partyA).claimFunds();
      const claimReceipt = await claimTx.wait();
      const gas = claimReceipt!.gasUsed * claimReceipt!.gasPrice;
      const balAfter = await ethers.provider.getBalance(partyA.address);

      expect(balAfter).to.equal(balBefore - gas + totalEscrow);

      // Agreement balance is now 0
      expect(await ethers.provider.getBalance(agreementAddr)).to.equal(0);
    });
  });
});
