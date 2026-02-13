import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

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

describe("Agreement", function () {
  const ESCROW = ethers.parseEther("1");
  const STATEMENT = "The job was completed on time";
  const GUIDELINES = "Evaluate based on delivery timestamp vs deadline";
  const EVIDENCE_DEFS = "Party A: invoice + delivery proof. Party B: complaint details.";
  const EVIDENCE_DEADLINE = 3600; // 1 hour

  // ─── Fixtures ──────────────────────────────────────

  async function deployFactoryFixture() {
    const [owner, partyA, partyB, outsider] = await ethers.getSigners();

    // Deploy a real factory so Agreement callbacks work
    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(owner.address, owner.address);

    return { factory, owner, partyA, partyB, outsider };
  }

  async function createAgreementFixture() {
    const { factory, owner, partyA, partyB, outsider } =
      await loadFixture(deployFactoryFixture);

    // Create agreement via factory (party A deposits escrow)
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

    return { agreement, factory, owner, partyA, partyB, outsider };
  }

  async function activeAgreementFixture() {
    const { agreement, factory, owner, partyA, partyB, outsider } =
      await loadFixture(createAgreementFixture);

    // Party B accepts
    await agreement.connect(partyB).acceptAndDeposit({ value: ESCROW });

    return { agreement, factory, owner, partyA, partyB, outsider };
  }

  async function disputedAgreementFixture() {
    const { agreement, factory, owner, partyA, partyB, outsider } =
      await loadFixture(activeAgreementFixture);

    // Party A raises dispute
    await agreement.connect(partyA).raiseDispute();

    return { agreement, factory, owner, partyA, partyB, outsider };
  }

  async function resolvingAgreementFixture() {
    const { agreement, factory, owner, partyA, partyB, outsider } =
      await loadFixture(disputedAgreementFixture);

    // Both parties submit evidence -> auto-triggers RESOLVING
    await agreement.connect(partyA).submitEvidence("Party A evidence");
    await agreement.connect(partyB).submitEvidence("Party B evidence");

    return { agreement, factory, owner, partyA, partyB, outsider };
  }

  // ─── Constructor / creation ────────────────────────

  describe("Constructor / creation", function () {
    it("creates with valid params and deposits escrow", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(createAgreementFixture);

      expect(await agreement.partyA()).to.equal(partyA.address);
      expect(await agreement.partyB()).to.equal(partyB.address);
      expect(await agreement.statement()).to.equal(STATEMENT);
      expect(await agreement.guidelines()).to.equal(GUIDELINES);
      expect(await agreement.evidenceDefs()).to.equal(EVIDENCE_DEFS);
      expect(await agreement.evidenceDeadlineSeconds()).to.equal(EVIDENCE_DEADLINE);
      expect(await agreement.escrowA()).to.equal(ESCROW);
      expect(await agreement.status()).to.equal(Status.CREATED);
    });

    it("reverts with zero value (no escrow)", async function () {
      const { factory, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory
          .connect(partyA)
          .createAgreement(
            partyB.address,
            STATEMENT,
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            { value: 0 }
          )
      ).to.be.revertedWith("Must deposit escrow");
    });

    it("reverts with zero address for party B", async function () {
      const { factory, partyA } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory
          .connect(partyA)
          .createAgreement(
            ethers.ZeroAddress,
            STATEMENT,
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            { value: ESCROW }
          )
      ).to.be.revertedWith("Invalid party B");
    });

    it("reverts with same party A and party B", async function () {
      const { factory, partyA } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory
          .connect(partyA)
          .createAgreement(
            partyA.address, // same as sender (partyA)
            STATEMENT,
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            { value: ESCROW }
          )
      ).to.be.revertedWith("Parties must differ");
    });

    it("reverts with empty statement", async function () {
      const { factory, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory
          .connect(partyA)
          .createAgreement(
            partyB.address,
            "", // empty statement
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            { value: ESCROW }
          )
      ).to.be.revertedWith("Empty statement");
    });
  });

  // ─── acceptAndDeposit ──────────────────────────────

  describe("acceptAndDeposit", function () {
    it("party B accepts with matching escrow", async function () {
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

    it("reverts if non-party B calls", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyA).acceptAndDeposit({ value: ESCROW })
      ).to.be.revertedWith("Only party B");
    });

    it("reverts if value doesn't match party A's escrow", async function () {
      const { agreement, partyB } =
        await loadFixture(createAgreementFixture);

      const wrongAmount = ethers.parseEther("0.5");
      await expect(
        agreement.connect(partyB).acceptAndDeposit({ value: wrongAmount })
      ).to.be.revertedWith("Must match party A escrow");
    });

    it("reverts if not in CREATED status", async function () {
      const { agreement, partyB } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyB).acceptAndDeposit({ value: ESCROW })
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── proposeOutcome ────────────────────────────────

  describe("proposeOutcome", function () {
    it("party A proposes TRUE", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(agreement.connect(partyA).proposeOutcome(true))
        .to.emit(agreement, "OutcomeProposed")
        .withArgs(partyA.address, true);

      expect(await agreement.proposalA()).to.equal(1); // 1 = TRUE
      expect(await agreement.status()).to.equal(Status.ACTIVE); // Not resolved yet
    });

    it("party A proposes TRUE, party B proposes TRUE -> resolves, escrow to A", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Party A proposes TRUE
      await agreement.connect(partyA).proposeOutcome(true);

      // Party B proposes TRUE -> match -> resolve
      await agreement.connect(partyB).proposeOutcome(true);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);

      // Funds are pending, not yet transferred (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(totalEscrow);

      // Party A claims funds
      const balanceBefore = await ethers.provider.getBalance(partyA.address);
      const txClaim = await agreement.connect(partyA).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);
    });

    it("party A proposes FALSE, party B proposes FALSE -> resolves, escrow to B", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Party A proposes FALSE
      await agreement.connect(partyA).proposeOutcome(false);

      // Party B proposes FALSE -> match -> resolve
      await agreement.connect(partyB).proposeOutcome(false);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);

      // Funds are pending, not yet transferred (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(totalEscrow);

      // Party B claims funds
      const balanceBefore = await ethers.provider.getBalance(partyB.address);
      const txClaim = await agreement.connect(partyB).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);
    });

    it("party A proposes TRUE, party B proposes FALSE -> no resolution yet", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(true);
      await agreement.connect(partyB).proposeOutcome(false);

      expect(await agreement.proposalA()).to.equal(1); // TRUE
      expect(await agreement.proposalB()).to.equal(2); // FALSE
      expect(await agreement.status()).to.equal(Status.ACTIVE); // Still active
    });

    it("reverts if not a party", async function () {
      const { agreement, outsider } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(outsider).proposeOutcome(true)
      ).to.be.revertedWith("Only a party");
    });

    it("reverts if not ACTIVE", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyA).proposeOutcome(true)
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── confirmOutcome ────────────────────────────────

  describe("confirmOutcome", function () {
    it("party B confirms party A's TRUE proposal -> resolves", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(true);

      await expect(agreement.connect(partyB).confirmOutcome())
        .to.emit(agreement, "OutcomeConfirmed")
        .withArgs(Verdict.TRUE_);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
    });

    it("party A confirms party B's FALSE proposal -> resolves", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyB).proposeOutcome(false);

      await expect(agreement.connect(partyA).confirmOutcome())
        .to.emit(agreement, "OutcomeConfirmed")
        .withArgs(Verdict.FALSE_);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
    });

    it("reverts if no proposal to confirm", async function () {
      const { agreement, partyB } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyB).confirmOutcome()
      ).to.be.revertedWith("No proposal to confirm");
    });

    it("reverts if not ACTIVE", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyA).confirmOutcome()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── raiseDispute ──────────────────────────────────

  describe("raiseDispute", function () {
    it("transitions ACTIVE -> DISPUTED", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(agreement.connect(partyA).raiseDispute())
        .to.emit(agreement, "DisputeRaised");

      expect(await agreement.status()).to.equal(Status.DISPUTED);
    });

    it("sets disputeTimestamp", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).raiseDispute();

      const disputeTs = await agreement.disputeTimestamp();
      expect(disputeTs).to.be.greaterThan(0);
    });

    it("party B can also raise dispute", async function () {
      const { agreement, partyB } =
        await loadFixture(activeAgreementFixture);

      await expect(agreement.connect(partyB).raiseDispute())
        .to.emit(agreement, "DisputeRaised");

      expect(await agreement.status()).to.equal(Status.DISPUTED);
    });

    it("reverts if not a party", async function () {
      const { agreement, outsider } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(outsider).raiseDispute()
      ).to.be.revertedWith("Only a party");
    });

    it("reverts if not ACTIVE", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyA).raiseDispute()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── submitEvidence ────────────────────────────────

  describe("submitEvidence", function () {
    it("party A submits evidence", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.connect(partyA).submitEvidence("Party A proof")
      )
        .to.emit(agreement, "EvidenceSubmitted")
        .withArgs(partyA.address);

      expect(await agreement.evidenceASubmitted()).to.be.true;
      expect(await agreement.evidenceA()).to.equal("Party A proof");
    });

    it("party B submits evidence", async function () {
      const { agreement, partyB } =
        await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.connect(partyB).submitEvidence("Party B proof")
      )
        .to.emit(agreement, "EvidenceSubmitted")
        .withArgs(partyB.address);

      expect(await agreement.evidenceBSubmitted()).to.be.true;
      expect(await agreement.evidenceB()).to.equal("Party B proof");
    });

    it("both submit -> auto-triggers resolution (DISPUTED -> RESOLVING)", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("Party A proof");

      await expect(
        agreement.connect(partyB).submitEvidence("Party B proof")
      ).to.emit(agreement, "ResolutionTriggered");

      expect(await agreement.status()).to.equal(Status.RESOLVING);
    });

    it("reverts with empty evidence", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.connect(partyA).submitEvidence("")
      ).to.be.revertedWith("Empty evidence");
    });

    it("reverts if already submitted", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("Party A proof");

      await expect(
        agreement.connect(partyA).submitEvidence("More evidence")
      ).to.be.revertedWith("Already submitted");
    });

    it("reverts if deadline passed", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      // Move time past the evidence deadline
      await time.increase(EVIDENCE_DEADLINE + 1);

      await expect(
        agreement.connect(partyA).submitEvidence("Too late")
      ).to.be.revertedWith("Evidence deadline passed");
    });

    it("reverts if not a party", async function () {
      const { agreement, outsider } =
        await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.connect(outsider).submitEvidence("Outsider evidence")
      ).to.be.revertedWith("Only a party");
    });

    it("reverts if not DISPUTED status", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyA).submitEvidence("Evidence")
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── closeEvidenceWindow ───────────────────────────

  describe("closeEvidenceWindow", function () {
    it("triggers resolution after deadline passes", async function () {
      const { agreement, partyA, outsider } =
        await loadFixture(disputedAgreementFixture);

      // Party A submits evidence (only A)
      await agreement.connect(partyA).submitEvidence("Party A proof");

      // Move time past deadline
      await time.increase(EVIDENCE_DEADLINE + 1);

      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.emit(agreement, "ResolutionTriggered");

      expect(await agreement.status()).to.equal(Status.RESOLVING);
    });

    it("reverts if deadline not passed", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.connect(partyA).closeEvidenceWindow()
      ).to.be.revertedWith("Deadline not passed");
    });

    it("reverts if no deadline set (evidenceDeadlineSeconds=0)", async function () {
      const { factory, partyA, partyB, outsider } =
        await loadFixture(deployFactoryFixture);

      // Create agreement with zero deadline
      const tx = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          0, // zero deadline
          { value: ESCROW }
        );
      const receipt = await tx.wait();
      const event = receipt!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
        } catch {
          return false;
        }
      });
      const parsed = factory.interface.parseLog(event as any);
      const agreement = await ethers.getContractAt(
        "Agreement",
        parsed!.args.agreementAddress
      );

      // Accept and activate
      await agreement.connect(partyB).acceptAndDeposit({ value: ESCROW });
      // Raise dispute
      await agreement.connect(partyA).raiseDispute();

      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.be.revertedWith("No deadline set");
    });
  });

  // ─── setResolution (bridge verdict) ────────────────

  describe("setResolution (bridge verdict)", function () {
    it("sets TRUE verdict -> escrow to party A", async function () {
      const { agreement, factory, owner, partyA } =
        await loadFixture(resolvingAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      // Factory (as itself) calls setResolution
      // We need to call from the factory address. Since factory is the caller,
      // we simulate bridge message via the factory's processBridgeMessage
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [await agreement.getAddress(), Verdict.TRUE_, "Statement is true"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [await agreement.getAddress(), resolutionData]
      );

      // Set owner as bridge receiver so we can call processBridgeMessage
      await factory.connect(owner).setBridgeReceiver(owner.address);

      await expect(
        factory.connect(owner).processBridgeMessage(1, owner.address, message)
      )
        .to.emit(agreement, "Resolved")
        .withArgs(Verdict.TRUE_, "Statement is true");

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);

      // Funds are pending (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(totalEscrow);

      // Party A claims funds
      const balanceBefore = await ethers.provider.getBalance(partyA.address);
      const txClaim = await agreement.connect(partyA).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
    });

    it("sets FALSE verdict -> escrow to party B", async function () {
      const { agreement, factory, owner, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const totalEscrow = ESCROW * 2n;

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [await agreement.getAddress(), Verdict.FALSE_, "Statement is false"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [await agreement.getAddress(), resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);
      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);

      // Funds are pending (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(totalEscrow);

      // Party B claims funds
      const balanceBefore = await ethers.provider.getBalance(partyB.address);
      const txClaim = await agreement.connect(partyB).claimFunds();
      const receiptClaim = await txClaim.wait();
      const gasClaim = receiptClaim!.gasUsed * receiptClaim!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceAfter).to.equal(balanceBefore - gasClaim + totalEscrow);
    });

    it("sets UNDETERMINED verdict -> escrow returned to both", async function () {
      const { agreement, factory, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [await agreement.getAddress(), Verdict.UNDETERMINED, "Insufficient evidence"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [await agreement.getAddress(), resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);
      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.UNDETERMINED);

      // Both parties have pending withdrawals (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Party A claims funds
      const balanceABefore = await ethers.provider.getBalance(partyA.address);
      const txClaimA = await agreement.connect(partyA).claimFunds();
      const receiptA = await txClaimA.wait();
      const gasA = receiptA!.gasUsed * receiptA!.gasPrice;
      const balanceAAfter = await ethers.provider.getBalance(partyA.address);
      expect(balanceAAfter).to.equal(balanceABefore - gasA + ESCROW);

      // Party B claims funds
      const balanceBBefore = await ethers.provider.getBalance(partyB.address);
      const txClaimB = await agreement.connect(partyB).claimFunds();
      const receiptB = await txClaimB.wait();
      const gasB = receiptB!.gasUsed * receiptB!.gasPrice;
      const balanceBAfter = await ethers.provider.getBalance(partyB.address);
      expect(balanceBAfter).to.equal(balanceBBefore - gasB + ESCROW);
    });

    it("reverts if not factory", async function () {
      const { agreement, outsider } =
        await loadFixture(resolvingAgreementFixture);

      await expect(
        agreement.connect(outsider).setResolution(1, "Reason")
      ).to.be.revertedWith("Only factory");
    });

    it("reverts if not in RESOLVING state", async function () {
      const { agreement, factory, owner } =
        await loadFixture(disputedAgreementFixture);

      // Agreement is in DISPUTED state, not RESOLVING
      // We need to call setResolution via factory as the factory address
      // Since we can't directly call from factory address, we test by
      // creating a scenario where factory tries to route to a non-RESOLVING agreement
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [await agreement.getAddress(), Verdict.TRUE_, "Reason"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [await agreement.getAddress(), resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);

      await expect(
        factory.connect(owner).processBridgeMessage(1, owner.address, message)
      ).to.be.revertedWith("Not in resolving state");
    });
  });

  // ─── cancel ────────────────────────────────────────

  describe("cancel", function () {
    it("party A cancels -> gets escrow back", async function () {
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

    it("reverts if not party A", async function () {
      const { agreement, partyB } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyB).cancel()
      ).to.be.revertedWith("Only party A");
    });

    it("reverts if not CREATED", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyA).cancel()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── claimFunds (pull-based withdrawal) ─────────────

  describe("claimFunds", function () {
    it("reverts if nothing to claim", async function () {
      const { agreement, partyA } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyA).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("reverts for outsider with no pending funds", async function () {
      const { agreement, outsider } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(outsider).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("emits FundsClaimed event", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      // Resolve via mutual agreement
      await agreement.connect(partyA).proposeOutcome(true);
      await agreement.connect(partyB).proposeOutcome(true);

      const totalEscrow = ESCROW * 2n;

      await expect(agreement.connect(partyA).claimFunds())
        .to.emit(agreement, "FundsClaimed")
        .withArgs(partyA.address, totalEscrow);
    });

    it("cannot claim twice", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      // Resolve via mutual agreement
      await agreement.connect(partyA).proposeOutcome(true);
      await agreement.connect(partyB).proposeOutcome(true);

      // First claim succeeds
      await agreement.connect(partyA).claimFunds();

      // Second claim reverts
      await expect(
        agreement.connect(partyA).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });
  });

  // ─── View methods ──────────────────────────────────

  describe("View methods", function () {
    it("getStatement returns correct value", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);
      expect(await agreement.getStatement()).to.equal(STATEMENT);
    });

    it("getGuidelines returns correct value", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);
      expect(await agreement.getGuidelines()).to.equal(GUIDELINES);
    });

    it("getEvidenceDefs returns correct value", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);
      expect(await agreement.getEvidenceDefs()).to.equal(EVIDENCE_DEFS);
    });

    it("getEvidenceA / getEvidenceB return evidence after submission", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("Evidence from A");
      await agreement.connect(partyB).submitEvidence("Evidence from B");

      expect(await agreement.getEvidenceA()).to.equal("Evidence from A");
      expect(await agreement.getEvidenceB()).to.equal("Evidence from B");
    });

    it("getPartyA / getPartyB return correct addresses", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(createAgreementFixture);

      expect(await agreement.getPartyA()).to.equal(partyA.address);
      expect(await agreement.getPartyB()).to.equal(partyB.address);
    });

    it("getTotalEscrow returns sum of both deposits", async function () {
      const { agreement } =
        await loadFixture(activeAgreementFixture);

      expect(await agreement.getTotalEscrow()).to.equal(ESCROW * 2n);
    });

    it("getTotalEscrow returns only party A's deposit before acceptance", async function () {
      const { agreement } =
        await loadFixture(createAgreementFixture);

      expect(await agreement.getTotalEscrow()).to.equal(ESCROW);
    });

    it("getEvidenceDeadline returns 0 before dispute", async function () {
      const { agreement } = await loadFixture(activeAgreementFixture);
      expect(await agreement.getEvidenceDeadline()).to.equal(0);
    });

    it("getEvidenceDeadline returns disputeTimestamp + deadlineSeconds after dispute", async function () {
      const { agreement } = await loadFixture(disputedAgreementFixture);
      const disputeTs = await agreement.disputeTimestamp();
      expect(await agreement.getEvidenceDeadline()).to.equal(
        disputeTs + BigInt(EVIDENCE_DEADLINE)
      );
    });
  });
});
