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

    it("sets deploymentBlock to the block when factory was deployed", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      const deploymentBlock = await factory.deploymentBlock();
      expect(deploymentBlock).to.be.greaterThan(0);
    });

    it("deploymentBlock is immutable and matches actual deployment block", async function () {
      const [owner, bridgeReceiver] = await ethers.getSigners();

      const Factory = await ethers.getContractFactory("InternetCourtFactory");
      const factory = await Factory.deploy(bridgeReceiver.address, owner.address);
      const deployTx = factory.deploymentTransaction();
      const receipt = await deployTx!.wait();

      const deploymentBlock = await factory.deploymentBlock();
      expect(deploymentBlock).to.equal(receipt!.blockNumber);
    });
  });

  // ─── Multiple Concurrent Agreements ─────────────

  describe("Multiple concurrent factory agreements", function () {
    it("creates 3 agreements in sequence with unique IDs and addresses", async function () {
      const { factory, usdc, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      const usdcAddr = await usdc.getAddress();
      const addresses: string[] = [];

      for (let i = 0; i < 3; i++) {
        const tx = await factory
          .connect(partyA)
          .createAgreement(
            partyB.address,
            `Statement ${i}`,
            GUIDELINES,
            EVIDENCE_DEFS,
            EVIDENCE_DEADLINE,
            usdcAddr,
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
        addresses.push(parsed!.args.agreementAddress);
      }

      // Each gets a unique address
      expect(addresses[0]).to.not.equal(addresses[1]);
      expect(addresses[1]).to.not.equal(addresses[2]);
      expect(addresses[0]).to.not.equal(addresses[2]);

      // Each gets the correct ID in the agreements mapping
      expect(await factory.agreements(0)).to.equal(addresses[0]);
      expect(await factory.agreements(1)).to.equal(addresses[1]);
      expect(await factory.agreements(2)).to.equal(addresses[2]);

      // All are tracked as deployed
      expect(await factory.deployedAgreements(addresses[0])).to.be.true;
      expect(await factory.deployedAgreements(addresses[1])).to.be.true;
      expect(await factory.deployedAgreements(addresses[2])).to.be.true;
    });

    it("query agreements by different parties — correct filtering via deployedAgreements", async function () {
      const { factory, usdc, partyA, partyB, outsider } =
        await loadFixture(deployFactoryFixture);

      const usdcAddr = await usdc.getAddress();

      // Mint and approve USDC for outsider to create an agreement too
      await usdc.mint(outsider.address, ESCROW * 10n);
      await usdc.connect(outsider).approve(await factory.getAddress(), ESCROW * 10n);

      // partyA creates agreement with partyB
      const tx1 = await factory
        .connect(partyA)
        .createAgreement(
          partyB.address,
          "Agreement by partyA",
          GUIDELINES,
          EVIDENCE_DEFS,
          EVIDENCE_DEADLINE,
          usdcAddr,
          ESCROW,
          0,
          0,
          ""
        );
      const receipt1 = await tx1.wait();
      const event1 = receipt1!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
        } catch {
          return false;
        }
      });
      const addr1 = factory.interface.parseLog(event1 as any)!.args.agreementAddress;

      // outsider creates agreement with partyA
      const tx2 = await factory
        .connect(outsider)
        .createAgreement(
          partyA.address,
          "Agreement by outsider",
          GUIDELINES,
          EVIDENCE_DEFS,
          EVIDENCE_DEADLINE,
          usdcAddr,
          ESCROW,
          0,
          0,
          ""
        );
      const receipt2 = await tx2.wait();
      const event2 = receipt2!.logs.find((log: any) => {
        try {
          return factory.interface.parseLog(log as any)?.name === "AgreementCreated";
        } catch {
          return false;
        }
      });
      const addr2 = factory.interface.parseLog(event2 as any)!.args.agreementAddress;

      // Verify both are different agreements deployed by the factory
      expect(addr1).to.not.equal(addr2);
      expect(await factory.deployedAgreements(addr1)).to.be.true;
      expect(await factory.deployedAgreements(addr2)).to.be.true;

      // Verify partyA roles differ in each agreement
      const agreement1 = await ethers.getContractAt("Agreement", addr1);
      const agreement2 = await ethers.getContractAt("Agreement", addr2);

      expect(await agreement1.partyA()).to.equal(partyA.address);
      expect(await agreement1.partyB()).to.equal(partyB.address);
      expect(await agreement2.partyA()).to.equal(outsider.address);
      expect(await agreement2.partyB()).to.equal(partyA.address);
    });

    it("nextAgreementId increments correctly across 3 agreements", async function () {
      const { factory, usdc, partyA, partyB } =
        await loadFixture(deployFactoryFixture);

      const usdcAddr = await usdc.getAddress();

      expect(await factory.nextAgreementId()).to.equal(0);

      await factory.connect(partyA).createAgreement(
        partyB.address, "S1", GUIDELINES, EVIDENCE_DEFS, EVIDENCE_DEADLINE,
        usdcAddr, ESCROW, 0, 0, ""
      );
      expect(await factory.nextAgreementId()).to.equal(1);

      await factory.connect(partyA).createAgreement(
        partyB.address, "S2", GUIDELINES, EVIDENCE_DEFS, EVIDENCE_DEADLINE,
        usdcAddr, ESCROW, 0, 0, ""
      );
      expect(await factory.nextAgreementId()).to.equal(2);

      await factory.connect(partyA).createAgreement(
        partyB.address, "S3", GUIDELINES, EVIDENCE_DEFS, EVIDENCE_DEADLINE,
        usdcAddr, ESCROW, 0, 0, ""
      );
      expect(await factory.nextAgreementId()).to.equal(3);
    });
  });
});
