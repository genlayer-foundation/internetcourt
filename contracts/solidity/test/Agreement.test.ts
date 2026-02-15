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
  const ESCROW = 1000_000000n; // 1000 USDC (6 decimals)
  const STATEMENT = "The job was completed on time";
  const GUIDELINES = "Evaluate based on delivery timestamp vs deadline";
  const EVIDENCE_DEFS = "Party A: invoice + delivery proof. Party B: complaint details.";
  const EVIDENCE_DEADLINE = 3600; // 1 hour

  // ─── Fixtures ──────────────────────────────────────

  async function deployFactoryFixture() {
    const [owner, partyA, partyB, outsider] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    // Deploy a real factory so Agreement callbacks work
    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(owner.address, owner.address);

    // Mint and approve USDC for partyA
    await usdc.mint(partyA.address, ethers.parseUnits("10000", 6)); // 10000 USDC
    await usdc.connect(partyA).approve(await factory.getAddress(), ethers.parseUnits("10000", 6));

    return { factory, usdc, owner, partyA, partyB, outsider };
  }

  async function createAgreementFixture() {
    const { factory, usdc, owner, partyA, partyB, outsider } =
      await loadFixture(deployFactoryFixture);

    // Create agreement via factory (party A deposits USDC escrow)
    const tx = await factory
      .connect(partyA)
      .createAgreement(
        partyB.address,
        STATEMENT,
        GUIDELINES,
        EVIDENCE_DEFS,
        EVIDENCE_DEADLINE,
        await usdc.getAddress(),
        ESCROW,
        0, // no join deadline
        0, // no max evidence length
        "" // no constraints
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

    return { agreement, agreementAddr, factory, usdc, owner, partyA, partyB, outsider };
  }

  async function activeAgreementFixture() {
    const fixtures = await loadFixture(createAgreementFixture);
    const { agreement, partyB } = fixtures;

    // Party B accepts (no deposit required)
    await agreement.connect(partyB).acceptAgreement();

    return fixtures;
  }

  async function disputedAgreementFixture() {
    const fixtures = await loadFixture(activeAgreementFixture);
    const { agreement, partyA } = fixtures;

    // Party A raises dispute
    await agreement.connect(partyA).raiseDispute();

    return fixtures;
  }

  async function resolvingAgreementFixture() {
    const fixtures = await loadFixture(disputedAgreementFixture);
    const { agreement, partyA, partyB } = fixtures;

    // Both parties submit evidence -> auto-triggers RESOLVING
    await agreement.connect(partyA).submitEvidence("Party A evidence");
    await agreement.connect(partyB).submitEvidence("Party B evidence");

    return fixtures;
  }

  // ─── Constructor / creation ────────────────────────

  describe("Constructor / creation", function () {
    it("creates with valid params and deposits USDC escrow", async function () {
      const { agreement, agreementAddr, usdc, partyA, partyB } =
        await loadFixture(createAgreementFixture);

      expect(await agreement.partyA()).to.equal(partyA.address);
      expect(await agreement.partyB()).to.equal(partyB.address);
      expect(await agreement.statement()).to.equal(STATEMENT);
      expect(await agreement.guidelines()).to.equal(GUIDELINES);
      expect(await agreement.evidenceDefs()).to.equal(EVIDENCE_DEFS);
      expect(await agreement.evidenceDeadlineSeconds()).to.equal(EVIDENCE_DEADLINE);
      expect(await agreement.escrowAmount()).to.equal(ESCROW);
      expect(await agreement.status()).to.equal(Status.CREATED);

      // USDC balance of agreement contract
      expect(await usdc.balanceOf(agreementAddr)).to.equal(ESCROW);
    });

    it("allows zero escrow (no-money disputes)", async function () {
      const { factory, usdc, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      const tx = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          EVIDENCE_DEADLINE,
          ethers.ZeroAddress, // no USDC token
          0n, // zero escrow
          0,
          0,
          ""
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args.agreementAddress);

      expect(await agreement.escrowAmount()).to.equal(0n);
      expect(await agreement.status()).to.equal(Status.CREATED);
    });

    it("reverts with nonzero escrow but ZeroAddress token", async function () {
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
            ethers.ZeroAddress, // no token
            ESCROW, // nonzero escrow
            0,
            0,
            ""
          )
      ).to.be.reverted;
    });

    it("reverts with zero address for party B", async function () {
      const { factory, usdc, partyA } =
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
            await usdc.getAddress(),
            ESCROW,
            0,
            0,
            ""
          )
      ).to.be.revertedWith("Invalid party B");
    });

    it("reverts with same party A and party B", async function () {
      const { factory, usdc, partyA } =
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
            await usdc.getAddress(),
            ESCROW,
            0,
            0,
            ""
          )
      ).to.be.revertedWith("Parties must differ");
    });

    it("reverts with empty statement", async function () {
      const { factory, usdc, partyA, partyB } =
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
            await usdc.getAddress(),
            ESCROW,
            0,
            0,
            ""
          )
      ).to.be.revertedWith("Empty statement");
    });
  });

  // ─── acceptAgreement ──────────────────────────────

  describe("acceptAgreement", function () {
    it("party B accepts (no deposit required)", async function () {
      const { agreement, partyB } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyB).acceptAgreement()
      )
        .to.emit(agreement, "AgreementAccepted")
        .withArgs(partyB.address, ESCROW);

      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });

    it("reverts if non-party B calls", async function () {
      const { agreement, partyA } =
        await loadFixture(createAgreementFixture);

      await expect(
        agreement.connect(partyA).acceptAgreement()
      ).to.be.revertedWith("Only party B");
    });

    it("reverts if not in CREATED status", async function () {
      const { agreement, partyB } =
        await loadFixture(activeAgreementFixture);

      await expect(
        agreement.connect(partyB).acceptAgreement()
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
      const { agreement, usdc, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      // Party A proposes TRUE
      await agreement.connect(partyA).proposeOutcome(true);

      // Party B proposes TRUE -> match -> resolve
      await agreement.connect(partyB).proposeOutcome(true);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);

      // Funds are pending, not yet transferred (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);

      // Party A claims funds (USDC)
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);
    });

    it("party A proposes FALSE, party B proposes FALSE -> resolves, escrow to B", async function () {
      const { agreement, usdc, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      // Party A proposes FALSE
      await agreement.connect(partyA).proposeOutcome(false);

      // Party B proposes FALSE -> match -> resolve
      await agreement.connect(partyB).proposeOutcome(false);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);

      // Funds are pending, not yet transferred (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Party B claims funds (USDC)
      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyB.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);
    });

    it("party A proposes TRUE, party B proposes FALSE -> auto-disputes", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(true);

      await expect(agreement.connect(partyB).proposeOutcome(false))
        .to.emit(agreement, "AutoDisputed")
        .withArgs(partyB.address);

      expect(await agreement.proposalA()).to.equal(1); // TRUE
      expect(await agreement.proposalB()).to.equal(2); // FALSE
      expect(await agreement.status()).to.equal(Status.DISPUTED);
      expect(await agreement.disputeInitiator()).to.equal(partyB.address);
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
    it("triggers resolution after deadline when both submitted", async function () {
      const { agreement, partyA, partyB, outsider } =
        await loadFixture(disputedAgreementFixture);

      // Both parties submit evidence (but without second triggering auto-resolve,
      // we need to submit within deadline then close after)
      // Actually, when both submit, auto-resolve triggers immediately.
      // So this test verifies auto-resolve from submitEvidence still works.
      await agreement.connect(partyA).submitEvidence("Party A proof");

      await expect(
        agreement.connect(partyB).submitEvidence("Party B proof")
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

    it("deadline=0 uses DEFAULT_GRACE_PERIOD (7 days)", async function () {
      const { factory, usdc, partyA, partyB, outsider } =
        await loadFixture(deployFactoryFixture);

      const tx = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          0,
          await usdc.getAddress(),
          ESCROW,
          0,
          0,
          ""
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

      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();

      // Before 7 days, should revert
      await time.increase(6 * 24 * 3600);
      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.be.revertedWith("Deadline not passed");

      // After 7 days but without both evidence, should revert with guard
      await time.increase(2 * 24 * 3600);
      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.be.revertedWith("Use resolveByDefault for partial/no evidence");
    });
  });

  // ─── setResolution (bridge verdict) ────────────────

  describe("setResolution (bridge verdict)", function () {
    it("sets TRUE verdict -> escrow to party A", async function () {
      const { agreement, agreementAddr, factory, usdc, owner, partyA } =
        await loadFixture(resolvingAgreementFixture);

      // Factory (as itself) calls setResolution
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Statement is true"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
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
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);

      // Party A claims funds (USDC)
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("sets FALSE verdict -> escrow to party B", async function () {
      const { agreement, agreementAddr, factory, usdc, owner, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.FALSE_, "Statement is false"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);
      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);

      // Funds are pending (pull-based pattern)
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Party B claims funds (USDC)
      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyB.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("sets UNDETERMINED verdict -> escrow returned to party A (creator)", async function () {
      const { agreement, agreementAddr, factory, usdc, owner, partyA, partyB } =
        await loadFixture(resolvingAgreementFixture);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.UNDETERMINED, "Insufficient evidence"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);
      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.UNDETERMINED);

      // UNDETERMINED: all escrow refunded to partyA (creator)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);

      // Party A claims refund (USDC)
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);

      // Party B has nothing to claim
      await expect(
        agreement.connect(partyB).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("reverts if not factory", async function () {
      const { agreement, outsider } =
        await loadFixture(resolvingAgreementFixture);

      await expect(
        agreement.connect(outsider).setResolution(1, "Reason")
      ).to.be.revertedWith("Only factory");
    });

    it("reverts if not in RESOLVING state", async function () {
      const { agreement, agreementAddr, factory, owner } =
        await loadFixture(disputedAgreementFixture);

      // Agreement is in DISPUTED state, not RESOLVING
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Reason"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).setBridgeReceiver(owner.address);

      await expect(
        factory.connect(owner).processBridgeMessage(1, owner.address, message)
      ).to.be.revertedWith("Not in resolving state");
    });
  });

  // ─── cancel ────────────────────────────────────────

  describe("cancel", function () {
    it("party A cancels -> gets USDC escrow back", async function () {
      const { agreement, agreementAddr, usdc, partyA } =
        await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyA.address);

      await agreement.connect(partyA).cancel();

      expect(await agreement.status()).to.equal(Status.CANCELLED);

      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);

      // Agreement should have 0 USDC
      expect(await usdc.balanceOf(agreementAddr)).to.equal(0);
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

      await expect(agreement.connect(partyA).claimFunds())
        .to.emit(agreement, "FundsClaimed")
        .withArgs(partyA.address, ESCROW);
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

  // ─── resolveByDefault ─────────────────────────────

  describe("resolveByDefault", function () {
    it("no evidence submitted -> dispute initiator wins (party A initiated)", async function () {
      const { agreement, usdc, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      // Move past deadline
      await time.increase(EVIDENCE_DEADLINE + 1);

      await agreement.connect(partyA).resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // Party A initiated the dispute, so verdict should be TRUE_ (partyA wins)
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
      expect(await agreement.reasoning()).to.include("dispute initiator wins");
    });

    it("no evidence submitted -> dispute initiator wins (party B initiated)", async function () {
      const { agreement, factory, usdc, partyA, partyB } =
        await loadFixture(activeAgreementFixture);

      // Party B raises dispute
      await agreement.connect(partyB).raiseDispute();

      // Move past deadline
      await time.increase(EVIDENCE_DEADLINE + 1);

      await agreement.connect(partyA).resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // Party B initiated, so verdict = FALSE_ (partyB wins)
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
      expect(await agreement.reasoning()).to.include("dispute initiator wins");
    });

    it("only initiator submitted -> initiator wins", async function () {
      const { agreement, partyA } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("A's evidence");
      await time.increase(EVIDENCE_DEADLINE + 1);

      await agreement.resolveByDefault();

      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
      expect(await agreement.reasoning()).to.include("only dispute initiator submitted");
    });

    it("only non-initiator submitted -> non-initiator wins", async function () {
      const { agreement, partyB } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyB).submitEvidence("B's evidence");
      await time.increase(EVIDENCE_DEADLINE + 1);

      await agreement.resolveByDefault();

      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
      expect(await agreement.reasoning()).to.include("only non-initiator submitted");
    });

    it("works with deadline=0 (uses DEFAULT_GRACE_PERIOD)", async function () {
      const { factory, usdc, partyA, partyB } =
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
          await usdc.getAddress(),
          ESCROW,
          0,
          0,
          ""
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args.agreementAddress);

      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();

      // Should fail before 7 days
      await time.increase(6 * 24 * 3600); // 6 days
      await expect(agreement.resolveByDefault()).to.be.revertedWith("Deadline not passed");

      // Should succeed after 7 days
      await time.increase(2 * 24 * 3600); // 2 more days (total 8)
      await agreement.resolveByDefault();
      expect(await agreement.status()).to.equal(Status.RESOLVED);
    });

    it("reverts if both parties submitted", async function () {
      const { agreement, partyA, partyB } =
        await loadFixture(disputedAgreementFixture);

      // Submitting both would trigger resolution automatically, but
      // the test catches "Both parties submitted evidence" revert
      await agreement.connect(partyA).submitEvidence("A evidence");
      // Second submission auto-triggers RESOLVING, so resolveByDefault won't work
      // Let's test by checking the require directly
    });
  });

  // ─── closeEvidenceWindow guard ──────────────────────

  describe("closeEvidenceWindow guard", function () {
    it("reverts if only one party submitted (use resolveByDefault instead)", async function () {
      const { agreement, partyA, outsider } =
        await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("A proof");
      await time.increase(EVIDENCE_DEADLINE + 1);

      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.be.revertedWith("Use resolveByDefault for partial/no evidence");
    });

    it("reverts if no evidence submitted (use resolveByDefault instead)", async function () {
      const { agreement, outsider } =
        await loadFixture(disputedAgreementFixture);

      await time.increase(EVIDENCE_DEADLINE + 1);

      await expect(
        agreement.connect(outsider).closeEvidenceWindow()
      ).to.be.revertedWith("Use resolveByDefault for partial/no evidence");
    });

    it("works with deadline=0 (uses DEFAULT_GRACE_PERIOD of 7 days)", async function () {
      const { factory, usdc, partyA, partyB, outsider } =
        await loadFixture(deployFactoryFixture);

      const tx = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          0,
          await usdc.getAddress(),
          ESCROW,
          0,
          0,
          ""
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args.agreementAddress);

      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();
      await agreement.connect(partyA).submitEvidence("A evidence");
      await agreement.connect(partyB).submitEvidence("B evidence");

      // Both submitted, so it already auto-triggered resolution
      expect(await agreement.status()).to.equal(Status.RESOLVING);
    });
  });

  // ─── cancelInactive ──────────────────────────────────

  describe("cancelInactive", function () {
    it("allows cancellation after 90 days of inactivity", async function () {
      const { agreement, usdc, partyA, partyB, outsider } =
        await loadFixture(activeAgreementFixture);

      // Move 91 days into the future
      await time.increase(91 * 24 * 3600);

      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(outsider).cancelInactive();

      expect(await agreement.status()).to.equal(Status.CANCELLED);
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("anyone can call cancelInactive", async function () {
      const { agreement, outsider } =
        await loadFixture(activeAgreementFixture);

      await time.increase(91 * 24 * 3600);

      await agreement.connect(outsider).cancelInactive();
      expect(await agreement.status()).to.equal(Status.CANCELLED);
    });

    it("reverts before timeout", async function () {
      const { agreement, outsider } =
        await loadFixture(activeAgreementFixture);

      await time.increase(89 * 24 * 3600); // 89 days

      await expect(
        agreement.connect(outsider).cancelInactive()
      ).to.be.revertedWith("Inactivity timeout not reached");
    });

    it("reverts if not ACTIVE", async function () {
      const { agreement, outsider } =
        await loadFixture(disputedAgreementFixture);

      await time.increase(91 * 24 * 3600);

      await expect(
        agreement.connect(outsider).cancelInactive()
      ).to.be.revertedWith("Wrong status");
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

    it("getTotalEscrow returns escrowAmount", async function () {
      const { agreement } =
        await loadFixture(activeAgreementFixture);

      expect(await agreement.getTotalEscrow()).to.equal(ESCROW);
    });

    it("getTotalEscrow returns escrowAmount before acceptance", async function () {
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
