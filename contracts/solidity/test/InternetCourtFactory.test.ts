import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("InternetCourtFactory", function () {
  const ESCROW = 1000_000000n; // 1000 USDC (6 decimals)
  const STATEMENT = "The deliverable met specifications";
  const GUIDELINES = "Check against the spec document";
  const EVIDENCE_DEFS = "Files, screenshots, logs";
  const EVIDENCE_DEADLINE = 3600;

  // ─── Fixtures ──────────────────────────────────────

  async function deployFactoryFixture() {
    const [owner, bridgeReceiver, partyA, partyB, outsider] =
      await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(
      bridgeReceiver.address,
      owner.address
    );

    // Mint and approve USDC for partyA
    await usdc.mint(partyA.address, ethers.parseUnits("100000", 6));
    await usdc.connect(partyA).approve(await factory.getAddress(), ethers.parseUnits("100000", 6));

    return { factory, usdc, owner, bridgeReceiver, partyA, partyB, outsider };
  }

  async function factoryWithAgreementFixture() {
    const { factory, usdc, owner, bridgeReceiver, partyA, partyB, outsider } =
      await loadFixture(deployFactoryFixture);

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

    return {
      factory,
      usdc,
      agreement,
      agreementAddr,
      owner,
      bridgeReceiver,
      partyA,
      partyB,
      outsider,
    };
  }

  // ─── createAgreement ──────────────────────────────

  describe("createAgreement", function () {
    it("creates agreement with correct params", async function () {
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
      const agreementAddr = parsed!.args.agreementAddress;
      const agreement = await ethers.getContractAt("Agreement", agreementAddr);

      expect(await agreement.partyA()).to.equal(partyA.address);
      expect(await agreement.partyB()).to.equal(partyB.address);
      expect(await agreement.statement()).to.equal(STATEMENT);
      expect(await agreement.factory()).to.equal(await factory.getAddress());
    });

    it("transfers USDC escrow to agreement contract", async function () {
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
      const agreementAddr = parsed!.args.agreementAddress;

      // The agreement contract should hold the USDC escrow
      const balance = await usdc.balanceOf(agreementAddr);
      expect(balance).to.equal(ESCROW);
    });

    it("increments nextAgreementId", async function () {
      const { factory, usdc, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      expect(await factory.nextAgreementId()).to.equal(0);

      await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          EVIDENCE_DEADLINE,
          await usdc.getAddress(),
          ESCROW,
          0,
          0,
          ""
        );

      expect(await factory.nextAgreementId()).to.equal(1);

      await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          STATEMENT,
          GUIDELINES,
          EVIDENCE_DEFS,
          EVIDENCE_DEADLINE,
          await usdc.getAddress(),
          ESCROW,
          0,
          0,
          ""
        );

      expect(await factory.nextAgreementId()).to.equal(2);
    });

    it("stores in agreements mapping", async function () {
      const { factory, agreementAddr } =
        await loadFixture(factoryWithAgreementFixture);

      expect(await factory.agreements(0)).to.equal(agreementAddr);
    });

    it("stores in deployedAgreements mapping", async function () {
      const { factory, agreementAddr } =
        await loadFixture(factoryWithAgreementFixture);

      expect(await factory.deployedAgreements(agreementAddr)).to.be.true;
    });

    it("emits AgreementCreated event", async function () {
      const { factory, usdc, partyA, partyB } =
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
            await usdc.getAddress(),
            ESCROW,
            0,
            0,
            ""
          )
      ).to.emit(factory, "AgreementCreated");
    });
  });

  // ─── processBridgeMessage ─────────────────────────

  describe("processBridgeMessage", function () {
    it("correctly decodes and routes verdict to agreement", async function () {
      const {
        factory,
        agreement,
        agreementAddr,
        owner,
        bridgeReceiver,
        partyA,
        partyB,
      } = await loadFixture(factoryWithAgreementFixture);

      // Setup: accept, dispute, submit evidence -> RESOLVING
      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();
      await agreement.connect(partyA).submitEvidence("A evidence");
      await agreement.connect(partyB).submitEvidence("B evidence");
      expect(await agreement.status()).to.equal(3); // RESOLVING

      // Build bridge message
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, 1, "Statement verified as true"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      // Call from bridge receiver
      await factory
        .connect(bridgeReceiver)
        .processBridgeMessage(1, bridgeReceiver.address, message);

      expect(await agreement.status()).to.equal(4); // RESOLVED
      expect(await agreement.verdict()).to.equal(1); // TRUE_
    });

    it("emits VerdictReceived event", async function () {
      const {
        factory,
        agreement,
        agreementAddr,
        bridgeReceiver,
        partyA,
        partyB,
      } = await loadFixture(factoryWithAgreementFixture);

      // Setup to RESOLVING
      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();
      await agreement.connect(partyA).submitEvidence("A evidence");
      await agreement.connect(partyB).submitEvidence("B evidence");

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, 1, "Verified"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await expect(
        factory
          .connect(bridgeReceiver)
          .processBridgeMessage(1, bridgeReceiver.address, message)
      )
        .to.emit(factory, "VerdictReceived")
        .withArgs(agreementAddr, 1);
    });

    it("reverts if not bridgeReceiver", async function () {
      const { factory, agreementAddr, outsider } =
        await loadFixture(factoryWithAgreementFixture);

      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [agreementAddr, 1, "Reason"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [agreementAddr, resolutionData]
      );

      await expect(
        factory
          .connect(outsider)
          .processBridgeMessage(1, outsider.address, message)
      ).to.be.revertedWith("Only bridge receiver");
    });

    it("reverts if unknown agreement address", async function () {
      const { factory, bridgeReceiver, outsider } =
        await loadFixture(factoryWithAgreementFixture);

      const fakeAddr = outsider.address; // Not a deployed agreement
      const resolutionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "string"],
        [fakeAddr, 1, "Reason"]
      );
      const message = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "bytes"],
        [fakeAddr, resolutionData]
      );

      await expect(
        factory
          .connect(bridgeReceiver)
          .processBridgeMessage(1, bridgeReceiver.address, message)
      ).to.be.revertedWith("Unknown agreement");
    });
  });

  // ─── requestDispute ───────────────────────────────

  describe("requestDispute", function () {
    it("emits DisputeRequested event when agreement triggers resolution", async function () {
      const {
        factory,
        agreement,
        agreementAddr,
        partyA,
        partyB,
      } = await loadFixture(factoryWithAgreementFixture);

      // Setup
      await agreement.connect(partyB).acceptAgreement();
      await agreement.connect(partyA).raiseDispute();
      await agreement.connect(partyA).submitEvidence("A evidence");

      // When party B submits evidence, both have submitted -> _triggerResolution
      // which calls factory.requestDispute
      await expect(
        agreement.connect(partyB).submitEvidence("B evidence")
      ).to.emit(factory, "DisputeRequested");
    });

    it("reverts if unknown agreement", async function () {
      const { factory, outsider } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(outsider).requestDispute(outsider.address)
      ).to.be.revertedWith("Unknown agreement");
    });

    it("reverts if caller is not the agreement contract", async function () {
      const { factory, agreementAddr, outsider } =
        await loadFixture(factoryWithAgreementFixture);

      // outsider tries to call requestDispute for a known agreement
      await expect(
        factory.connect(outsider).requestDispute(agreementAddr)
      ).to.be.revertedWith("Only agreement can request");
    });
  });

  // ─── setBridgeReceiver ────────────────────────────

  describe("setBridgeReceiver", function () {
    it("owner can set bridge receiver", async function () {
      const { factory, owner, outsider } =
        await loadFixture(deployFactoryFixture);

      await factory.connect(owner).setBridgeReceiver(outsider.address);
      expect(await factory.bridgeReceiver()).to.equal(outsider.address);
    });

    it("reverts if not owner", async function () {
      const { factory, outsider } =
        await loadFixture(deployFactoryFixture);

      await expect(
        factory.connect(outsider).setBridgeReceiver(outsider.address)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Constructor ──────────────────────────────────

  describe("Constructor", function () {
    it("sets bridgeReceiver correctly", async function () {
      const { factory, bridgeReceiver } =
        await loadFixture(deployFactoryFixture);

      expect(await factory.bridgeReceiver()).to.equal(bridgeReceiver.address);
    });

    it("sets owner correctly", async function () {
      const { factory, owner } =
        await loadFixture(deployFactoryFixture);

      expect(await factory.owner()).to.equal(owner.address);
    });

    it("initializes nextAgreementId to 0", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      expect(await factory.nextAgreementId()).to.equal(0);
    });
  });
});
