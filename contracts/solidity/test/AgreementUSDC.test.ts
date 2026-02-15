import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Tests for all NEW USDC escrow features in Agreement.sol:
 * - USDC transfer on creation
 * - Zero-escrow disputes
 * - Party B joins without depositing
 * - Join deadline enforcement
 * - reclaimOnExpiry
 * - Default judgment (resolveByDefault)
 * - Evidence max length constraints
 * - Payout rules (TRUE->partyA, FALSE->partyB, UNDETERMINED->partyA)
 * - Cancel returns USDC
 */
describe("Agreement — USDC Escrow Features", function () {
  const ESCROW = 1000_000000n; // 1000 USDC (6 decimals)
  const ONE_DAY = 86400;
  const ONE_HOUR = 3600;

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

  // ─── Fixtures ──────────────────────────────────────

  async function deployFixture() {
    const [owner, partyA, partyB, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(ethers.ZeroAddress, owner.address);

    // Mint USDC to partyA and approve the factory
    await usdc.mint(partyA.address, ESCROW * 10n);
    await usdc.connect(partyA).approve(await factory.getAddress(), ESCROW * 10n);

    return { usdc, factory, owner, partyA, partyB, other };
  }

  async function createAgreementFixture() {
    const base = await loadFixture(deployFixture);
    const { factory, partyA, partyB, usdc } = base;

    const joinDeadline = (await time.latest()) + ONE_DAY;
    const tx = await factory.connect(partyA).createAgreement(
      partyB.address,
      "Test statement",
      "Test guidelines",
      "{}",
      ONE_HOUR,
      await usdc.getAddress(),
      ESCROW,
      joinDeadline,
      10000,
      "Must be valid JSON"
    );
    const receipt = await tx.wait();

    // Find agreement address from AgreementCreated event
    const event = receipt!.logs.find((log: any) => {
      try {
        return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
      } catch {
        return false;
      }
    });
    const parsed = factory.interface.parseLog(event as any);
    const agreementAddr = parsed!.args[1]; // agreementAddress
    const agreement = await ethers.getContractAt("Agreement", agreementAddr);

    return { ...base, agreement, agreementAddr, joinDeadline };
  }

  async function activeAgreementFixture() {
    const base = await loadFixture(createAgreementFixture);
    const { agreement, partyB } = base;

    await agreement.connect(partyB).acceptAgreement();

    return base;
  }

  async function disputedAgreementFixture() {
    const base = await loadFixture(activeAgreementFixture);
    const { agreement, partyA } = base;

    await agreement.connect(partyA).raiseDispute();

    return base;
  }

  async function resolvingAgreementFixture() {
    const base = await loadFixture(disputedAgreementFixture);
    const { agreement, partyA, partyB } = base;

    await agreement.connect(partyA).submitEvidence("Party A evidence");
    await agreement.connect(partyB).submitEvidence("Party B evidence");

    return base;
  }

  // ─── USDC Transfer on Creation ──────────────────────

  describe("USDC transfer on creation", function () {
    it("transfers USDC from partyA to agreement contract on creation", async function () {
      const { agreement, agreementAddr, usdc, partyA } =
        await loadFixture(createAgreementFixture);

      // Agreement should hold the USDC escrow
      expect(await usdc.balanceOf(agreementAddr)).to.equal(ESCROW);

      // Party A's balance should have decreased
      expect(await usdc.balanceOf(partyA.address)).to.equal(ESCROW * 10n - ESCROW);
    });

    it("agreement has correct escrowAmount set", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);

      expect(await agreement.escrowAmount()).to.equal(ESCROW);
    });

    it("getTotalEscrow returns the escrow amount", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);

      expect(await agreement.getTotalEscrow()).to.equal(ESCROW);
    });
  });

  // ─── Zero-Escrow Disputes ───────────────────────────

  describe("Zero-escrow disputes", function () {
    it("allows zero-escrow agreement with ZeroAddress token", async function () {
      const { factory, partyA, partyB } = await loadFixture(deployFixture);

      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "Zero escrow statement",
        "Guidelines",
        "{}",
        ONE_HOUR,
        ethers.ZeroAddress, // no USDC token
        0n, // zero escrow
        0, // no join deadline
        0, // no max evidence length
        "" // no constraints
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args[1]);

      expect(await agreement.escrowAmount()).to.equal(0n);
      expect(await agreement.status()).to.equal(Status.CREATED);
    });

    it("reverts if nonzero escrow amount with ZeroAddress token", async function () {
      const { factory, partyA, partyB } = await loadFixture(deployFixture);

      await expect(
        factory.connect(partyA).createAgreement(
          partyB.address,
          "Statement",
          "Guidelines",
          "{}",
          ONE_HOUR,
          ethers.ZeroAddress, // no token
          ESCROW, // nonzero amount -> should revert
          0,
          0,
          ""
        )
      ).to.be.reverted; // "USDC token required for escrow" or transfer failure
    });
  });

  // ─── Party B Joins Without Depositing ───────────────

  describe("Party B joins without depositing", function () {
    it("party B accepts without USDC balance change", async function () {
      const { agreement, partyB, usdc } = await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).acceptAgreement();
      const balanceAfter = await usdc.balanceOf(partyB.address);

      expect(balanceAfter).to.equal(balanceBefore);
      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });
  });

  // ─── Join Deadline ──────────────────────────────────

  describe("Join deadline", function () {
    it("party B can accept before deadline", async function () {
      const { agreement, partyB } = await loadFixture(createAgreementFixture);

      await agreement.connect(partyB).acceptAgreement();
      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });

    it("reverts if party B tries to accept after deadline", async function () {
      const { agreement, partyB } = await loadFixture(createAgreementFixture);

      // Move time past the join deadline
      await time.increase(ONE_DAY + 1);

      await expect(
        agreement.connect(partyB).acceptAgreement()
      ).to.be.revertedWith("Join deadline passed");
    });

    it("agreement with no join deadline (0) has no expiry", async function () {
      const { factory, partyA, partyB, usdc } = await loadFixture(deployFixture);

      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "No deadline",
        "Guidelines",
        "{}",
        ONE_HOUR,
        await usdc.getAddress(),
        ESCROW,
        0, // no join deadline
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args[1]);

      // Move time forward a lot
      await time.increase(ONE_DAY * 365);

      // Should still work since no deadline
      await agreement.connect(partyB).acceptAgreement();
      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });
  });

  // ─── reclaimOnExpiry ────────────────────────────────

  describe("reclaimOnExpiry", function () {
    it("works after join deadline has passed", async function () {
      const { agreement, partyA, usdc } = await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyA.address);

      // Move past the join deadline
      await time.increase(ONE_DAY + 1);

      await agreement.reclaimOnExpiry();

      expect(await agreement.status()).to.equal(Status.CANCELLED);

      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("reverts before join deadline", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);

      await expect(
        agreement.reclaimOnExpiry()
      ).to.be.revertedWith("Deadline not passed");
    });

    it("reverts if no join deadline was set", async function () {
      const { factory, partyA, partyB, usdc } = await loadFixture(deployFixture);

      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "No deadline",
        "Guidelines",
        "{}",
        ONE_HOUR,
        await usdc.getAddress(),
        ESCROW,
        0, // no join deadline
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args[1]);

      await expect(
        agreement.reclaimOnExpiry()
      ).to.be.revertedWith("No join deadline set");
    });

    it("anyone can call reclaimOnExpiry (not just partyA)", async function () {
      const { agreement, other, partyA, usdc } = await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyA.address);

      await time.increase(ONE_DAY + 1);

      // Other (not partyA) calls reclaimOnExpiry
      await agreement.connect(other).reclaimOnExpiry();

      expect(await agreement.status()).to.equal(Status.CANCELLED);
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("reverts if agreement is not in CREATED status", async function () {
      const { agreement } = await loadFixture(activeAgreementFixture);

      await time.increase(ONE_DAY + 1);

      await expect(
        agreement.reclaimOnExpiry()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── Default Judgment ───────────────────────────────

  describe("resolveByDefault", function () {
    it("partyA initiates dispute, no evidence -> dispute initiator wins (TRUE_)", async function () {
      const { agreement, partyA, usdc } = await loadFixture(disputedAgreementFixture);

      // Move past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
      // Dispute initiator (partyA) wins -> escrow to partyA
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
    });

    it("partyB initiates dispute, no evidence -> dispute initiator wins (FALSE_)", async function () {
      const { agreement, partyA, partyB, usdc } = await loadFixture(activeAgreementFixture);

      // Party B raises the dispute
      await agreement.connect(partyB).raiseDispute();

      // Move past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
      // Dispute initiator (partyB) wins -> escrow to partyB
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);
    });

    it("reverts before evidence deadline", async function () {
      const { agreement } = await loadFixture(disputedAgreementFixture);

      await expect(
        agreement.resolveByDefault()
      ).to.be.revertedWith("Deadline not passed");
    });

    // NOTE: Contract was updated to handle single-party evidence submission in resolveByDefault.
    // Previously this test expected a revert with "Evidence was submitted" when only one party
    // submitted evidence. The current contract allows resolveByDefault when only one party
    // submitted (the submitter wins by default). It only reverts when BOTH parties submitted.
    it("resolves by default when only one party submitted evidence (initiator wins)", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      await agreement.connect(partyA).submitEvidence("Some evidence");

      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // partyA initiated and submitted, so partyA wins -> TRUE_
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
    });

    it("reverts if not in DISPUTED status", async function () {
      const { agreement } = await loadFixture(activeAgreementFixture);

      await expect(
        agreement.resolveByDefault()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── Evidence Max Length ────────────────────────────

  describe("Evidence max length constraint", function () {
    it("rejects evidence exceeding max length", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      // maxEvidenceLength is 10000. Create evidence longer than that.
      const longEvidence = "x".repeat(10001);

      await expect(
        agreement.connect(partyA).submitEvidence(longEvidence)
      ).to.be.revertedWith("Evidence exceeds max length");
    });

    it("accepts evidence within max length", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      const evidence = "x".repeat(10000);
      await agreement.connect(partyA).submitEvidence(evidence);

      expect(await agreement.evidenceASubmitted()).to.be.true;
    });

    it("maxEvidenceLength is stored correctly", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);

      expect(await agreement.maxEvidenceLength()).to.equal(10000);
    });

    it("constraints are stored correctly", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);

      expect(await agreement.constraints()).to.equal("Must be valid JSON");
    });
  });

  // ─── Payout Rules ──────────────────────────────────

  describe("Payout rules", function () {
    it("TRUE verdict -> all escrow to partyA", async function () {
      const { agreement, factory, owner, partyA, partyB, usdc, agreementAddr } =
        await loadFixture(resolvingAgreementFixture);

      // Set owner as bridge receiver so we can call processBridgeMessage
      await factory.connect(owner).setBridgeReceiver(owner.address);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Statement is true"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);

      // Party A claims
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("FALSE verdict -> all escrow to partyB", async function () {
      const { agreement, factory, owner, partyA, partyB, usdc, agreementAddr } =
        await loadFixture(resolvingAgreementFixture);

      await factory.connect(owner).setBridgeReceiver(owner.address);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.FALSE_, "Statement is false"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(ESCROW);

      // Party B claims
      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyB.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });

    it("UNDETERMINED verdict -> escrow refund to partyA (creator)", async function () {
      const { agreement, factory, owner, partyA, partyB, usdc, agreementAddr } =
        await loadFixture(resolvingAgreementFixture);

      await factory.connect(owner).setBridgeReceiver(owner.address);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.UNDETERMINED, "Insufficient evidence"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      // UNDETERMINED: all escrow refunded to partyA (the creator)
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(ESCROW);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);

      // Party A claims refund
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter).to.equal(balanceBefore + ESCROW);

      // Party B has nothing to claim
      await expect(
        agreement.connect(partyB).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });
  });

  // ─── Cancel Returns USDC ───────────────────────────

  describe("Cancel returns USDC to creator", function () {
    it("cancel returns USDC to partyA", async function () {
      const { agreement, partyA, usdc, agreementAddr } =
        await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyA.address);

      await agreement.connect(partyA).cancel();

      expect(await agreement.status()).to.equal(Status.CANCELLED);

      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);

      // Agreement should have 0 USDC
      expect(await usdc.balanceOf(agreementAddr)).to.equal(0);
    });

    it("cancel with zero escrow works without token transfer", async function () {
      const { factory, partyA, partyB } = await loadFixture(deployFixture);

      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "Zero escrow",
        "Guidelines",
        "{}",
        ONE_HOUR,
        ethers.ZeroAddress,
        0n,
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args[1]);

      await agreement.connect(partyA).cancel();
      expect(await agreement.status()).to.equal(Status.CANCELLED);
    });
  });

  // ─── disputeInitiator tracking ─────────────────────

  describe("disputeInitiator tracking", function () {
    it("tracks partyA as disputeInitiator when partyA raises dispute", async function () {
      const { agreement, partyA } = await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).raiseDispute();

      expect(await agreement.disputeInitiator()).to.equal(partyA.address);
    });

    it("tracks partyB as disputeInitiator when partyB raises dispute", async function () {
      const { agreement, partyB } = await loadFixture(activeAgreementFixture);

      await agreement.connect(partyB).raiseDispute();

      expect(await agreement.disputeInitiator()).to.equal(partyB.address);
    });
  });

  // ─── Zero-Escrow Full Lifecycle ───────────────────

  describe("Zero-escrow full lifecycle", function () {
    async function createZeroEscrowAgreementFixture() {
      const base = await loadFixture(deployFixture);
      const { factory, partyA, partyB } = base;

      const joinDeadline = (await time.latest()) + ONE_DAY;
      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "Zero escrow statement",
        "Guidelines",
        "{}",
        ONE_HOUR,
        ethers.ZeroAddress, // no USDC token
        0n,                 // zero escrow
        joinDeadline,
        10000,
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
      const agreementAddr = parsed!.args[1];
      const agreement = await ethers.getContractAt("Agreement", agreementAddr);

      return { ...base, agreement, agreementAddr, joinDeadline };
    }

    it("full lifecycle: create → accept → dispute → evidence → bridge resolution with zero escrow", async function () {
      const { agreement, agreementAddr, factory, owner, partyA, partyB } =
        await loadFixture(createZeroEscrowAgreementFixture);

      // Accept
      await agreement.connect(partyB).acceptAgreement();
      expect(await agreement.status()).to.equal(Status.ACTIVE);

      // Raise dispute
      await agreement.connect(partyA).raiseDispute();
      expect(await agreement.status()).to.equal(Status.DISPUTED);

      // Submit evidence from both sides
      await agreement.connect(partyA).submitEvidence("Party A evidence");
      await agreement.connect(partyB).submitEvidence("Party B evidence");
      expect(await agreement.status()).to.equal(Status.RESOLVING);

      // Bridge resolution
      await factory.connect(owner).setBridgeReceiver(owner.address);
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "Statement is true"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);

      // No pending withdrawals since escrow was zero
      expect(await agreement.pendingWithdrawals(partyA.address)).to.equal(0);
      expect(await agreement.pendingWithdrawals(partyB.address)).to.equal(0);
    });

    it("claimFunds reverts with zero escrow (nothing to claim)", async function () {
      const { agreement, factory, owner, partyA, partyB, agreementAddr } =
        await loadFixture(createZeroEscrowAgreementFixture);

      // Go through full lifecycle to RESOLVED
      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();
      await agreement.connect(partyA).submitEvidence("A evidence");
      await agreement.connect(partyB).submitEvidence("B evidence");

      await factory.connect(owner).setBridgeReceiver(owner.address);
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, Verdict.TRUE_, "True"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );
      await factory.connect(owner).processBridgeMessage(1, owner.address, message);

      // claimFunds should revert since pendingWithdrawals is 0
      await expect(
        agreement.connect(partyA).claimFunds()
      ).to.be.revertedWith("Nothing to claim");
    });

    it("reclaimOnExpiry works with zero escrow (no transfer, just state change)", async function () {
      const { agreement, partyA } =
        await loadFixture(createZeroEscrowAgreementFixture);

      // Move past the join deadline
      await time.increase(ONE_DAY + 1);

      await agreement.reclaimOnExpiry();

      expect(await agreement.status()).to.equal(Status.CANCELLED);
    });

    it("cancel works with zero escrow (no transfer, just state change)", async function () {
      const { agreement, partyA } =
        await loadFixture(createZeroEscrowAgreementFixture);

      await agreement.connect(partyA).cancel();

      expect(await agreement.status()).to.equal(Status.CANCELLED);
    });
  });

  // ─── reclaimOnExpiry Edge Cases ───────────────────

  describe("reclaimOnExpiry edge cases", function () {
    it("reverts when joinDeadline=0 (no deadline set)", async function () {
      const { factory, partyA, partyB, usdc } = await loadFixture(deployFixture);

      const tx = await factory.connect(partyA).createAgreement(
        partyB.address,
        "No deadline test",
        "Guidelines",
        "{}",
        ONE_HOUR,
        await usdc.getAddress(),
        ESCROW,
        0, // no join deadline
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
      const agreement = await ethers.getContractAt("Agreement", parsed!.args[1]);

      await expect(
        agreement.reclaimOnExpiry()
      ).to.be.revertedWith("No join deadline set");
    });

    it("reverts exactly at the joinDeadline timestamp (boundary)", async function () {
      const { agreement, joinDeadline } = await loadFixture(createAgreementFixture);

      // Advance to joinDeadline - 1 so the next transaction's block.timestamp is joinDeadline
      // (Hardhat increments timestamp by 1 for each new block after increaseTo)
      await time.increaseTo(joinDeadline - 1);

      // Contract requires block.timestamp > joinDeadline, so exactly AT deadline should revert
      await expect(
        agreement.reclaimOnExpiry()
      ).to.be.revertedWith("Deadline not passed");
    });

    it("succeeds one second after joinDeadline", async function () {
      const { agreement, partyA, usdc, joinDeadline } =
        await loadFixture(createAgreementFixture);

      const balanceBefore = await usdc.balanceOf(partyA.address);

      // Advance so the next transaction's block.timestamp is joinDeadline + 1
      await time.increaseTo(joinDeadline);

      await agreement.reclaimOnExpiry();

      expect(await agreement.status()).to.equal(Status.CANCELLED);
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter).to.equal(balanceBefore + ESCROW);
    });
  });

  // ─── resolveByDefault with Different Evidence Scenarios ─────

  describe("resolveByDefault with different evidence scenarios", function () {
    it("neither party submits evidence → dispute initiator wins", async function () {
      const { agreement, partyA, partyB } = await loadFixture(disputedAgreementFixture);

      // Move past evidence deadline without submitting any evidence
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // partyA initiated the dispute → TRUE_
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
    });

    it("only dispute initiator submits → initiator wins (partyA initiated)", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      // partyA initiated the dispute (from disputedAgreementFixture)
      // Only partyA submits evidence
      await agreement.connect(partyA).submitEvidence("Only initiator evidence");

      // Move past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // partyA is the initiator and submitted, so partyA wins → TRUE_
      expect(await agreement.verdict()).to.equal(Verdict.TRUE_);
    });

    it("only dispute initiator submits → initiator wins (partyB initiated)", async function () {
      const { agreement, partyA, partyB } = await loadFixture(activeAgreementFixture);

      // partyB raises the dispute
      await agreement.connect(partyB).raiseDispute();

      // Only partyB (the initiator) submits evidence
      await agreement.connect(partyB).submitEvidence("Only initiator evidence");

      // Move past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // partyB is the initiator and submitted, so partyB wins → FALSE_
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
    });

    it("only non-initiator submits → non-initiator wins", async function () {
      const { agreement, partyB } = await loadFixture(disputedAgreementFixture);

      // partyA initiated the dispute (from disputedAgreementFixture)
      // Only partyB (non-initiator) submits evidence
      await agreement.connect(partyB).submitEvidence("Only non-initiator evidence");

      // Move past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.resolveByDefault();

      expect(await agreement.status()).to.equal(Status.RESOLVED);
      // partyB is the non-initiator and submitted, so partyB wins → FALSE_
      expect(await agreement.verdict()).to.equal(Verdict.FALSE_);
    });

    it("both parties submit → resolveByDefault should revert", async function () {
      const { agreement, partyA, partyB } = await loadFixture(disputedAgreementFixture);

      // Both parties submit evidence — this triggers _triggerResolution and moves to RESOLVING
      await agreement.connect(partyA).submitEvidence("A evidence");
      await agreement.connect(partyB).submitEvidence("B evidence");

      // Status is now RESOLVING, not DISPUTED
      expect(await agreement.status()).to.equal(Status.RESOLVING);

      // resolveByDefault requires DISPUTED status, so it should revert
      await expect(
        agreement.resolveByDefault()
      ).to.be.revertedWith("Wrong status");
    });
  });

  // ─── joinDeadline Boundary Condition ──────────────

  describe("joinDeadline boundary condition", function () {
    it("acceptAgreement succeeds exactly at joinDeadline timestamp", async function () {
      const { agreement, partyB, joinDeadline } =
        await loadFixture(createAgreementFixture);

      // Advance to joinDeadline - 1 so the next transaction's block.timestamp is joinDeadline
      await time.increaseTo(joinDeadline - 1);

      // Contract checks block.timestamp <= joinDeadline, so exactly AT deadline should succeed
      await agreement.connect(partyB).acceptAgreement();

      expect(await agreement.status()).to.equal(Status.ACTIVE);
    });

    it("acceptAgreement reverts one second after joinDeadline", async function () {
      const { agreement, partyB, joinDeadline } =
        await loadFixture(createAgreementFixture);

      // Advance so the next transaction's block.timestamp is joinDeadline + 1
      await time.increaseTo(joinDeadline);

      await expect(
        agreement.connect(partyB).acceptAgreement()
      ).to.be.revertedWith("Join deadline passed");
    });
  });

  // ─── Evidence Submission Edge Cases ───────────────

  describe("Evidence submission edge cases", function () {
    it("submit evidence at exactly maxEvidenceLength — should succeed", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      // maxEvidenceLength is 10000 in the fixture
      const evidence = "x".repeat(10000);
      await agreement.connect(partyA).submitEvidence(evidence);

      expect(await agreement.evidenceASubmitted()).to.be.true;
    });

    it("submit evidence at maxEvidenceLength + 1 — should revert", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      // maxEvidenceLength is 10000 in the fixture
      const evidence = "x".repeat(10001);
      await expect(
        agreement.connect(partyA).submitEvidence(evidence)
      ).to.be.revertedWith("Evidence exceeds max length");
    });

    it("submit empty evidence — should revert", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);

      // Contract requires bytes(evidence).length > 0
      await expect(
        agreement.connect(partyA).submitEvidence("")
      ).to.be.revertedWith("Empty evidence");
    });
  });
});
