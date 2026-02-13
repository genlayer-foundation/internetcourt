import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("BridgeForwarder", function () {
  const LOCAL_EID = 30101; // simulated local chain EID
  const REMOTE_EID = 30184; // simulated remote chain EID

  // ─── Fixtures ──────────────────────────────────────

  async function deployBridgeForwarderFixture() {
    const [owner, caller, outsider] = await ethers.getSigners();

    // Deploy mock LZ endpoint
    const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");
    const endpoint = await MockEndpoint.deploy(LOCAL_EID);

    // Deploy BridgeForwarder
    const BridgeForwarder = await ethers.getContractFactory("BridgeForwarder");
    const forwarder = await BridgeForwarder.deploy(
      await endpoint.getAddress(),
      owner.address
    );

    // Grant CALLER_ROLE to caller
    const CALLER_ROLE = await forwarder.CALLER_ROLE();
    await forwarder.connect(owner).grantRole(CALLER_ROLE, caller.address);

    // Deploy mock bridge target for local dispatch tests
    const MockTarget = await ethers.getContractFactory("MockBridgeTarget");
    const target = await MockTarget.deploy();

    return { forwarder, endpoint, target, owner, caller, outsider, CALLER_ROLE };
  }

  // ─── Constructor ──────────────────────────────────

  describe("Constructor", function () {
    it("sets endpoint correctly", async function () {
      const { forwarder, endpoint } =
        await loadFixture(deployBridgeForwarderFixture);

      expect(await forwarder.endpoint()).to.equal(await endpoint.getAddress());
    });

    it("owner has OWNER_ROLE", async function () {
      const { forwarder, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      const OWNER_ROLE = await forwarder.OWNER_ROLE();
      expect(await forwarder.hasRole(OWNER_ROLE, owner.address)).to.be.true;
    });

    it("owner has CALLER_ROLE", async function () {
      const { forwarder, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      const CALLER_ROLE = await forwarder.CALLER_ROLE();
      expect(await forwarder.hasRole(CALLER_ROLE, owner.address)).to.be.true;
    });
  });

  // ─── callRemoteArbitrary ──────────────────────────

  describe("callRemoteArbitrary", function () {
    it("sends cross-chain message via LayerZero endpoint", async function () {
      const { forwarder, endpoint, caller } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [1, caller.address, caller.address, "0x1234"]
      );
      const options = "0x";

      // Set bridge address for remote EID
      const remoteAddr = ethers.zeroPadValue(caller.address, 32);
      await forwarder.connect(await ethers.getSigner((await ethers.getSigners())[0].address))
        .setBridgeAddress(REMOTE_EID, remoteAddr);

      await forwarder
        .connect(caller)
        .callRemoteArbitrary(txHash, REMOTE_EID, data, options, {
          value: ethers.parseEther("0.01"),
        });

      expect(await endpoint.sendCallCount()).to.equal(1);
    });

    it("reverts without CALLER_ROLE", async function () {
      const { forwarder, outsider } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("tx1"));
      const data = "0x1234";
      const options = "0x";

      await expect(
        forwarder
          .connect(outsider)
          .callRemoteArbitrary(txHash, REMOTE_EID, data, options)
      ).to.be.revertedWithCustomError(forwarder, "AccessControlUnauthorizedAccount");
    });

    it("replay protection: reverts on same hash", async function () {
      const { forwarder, endpoint, caller, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("replay-test"));
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [1, caller.address, caller.address, "0x1234"]
      );
      const options = "0x";

      // Set bridge address
      const remoteAddr = ethers.zeroPadValue(caller.address, 32);
      await forwarder.connect(owner).setBridgeAddress(REMOTE_EID, remoteAddr);

      // First call succeeds
      await forwarder
        .connect(caller)
        .callRemoteArbitrary(txHash, REMOTE_EID, data, options, {
          value: ethers.parseEther("0.01"),
        });

      // Second call with same hash reverts
      await expect(
        forwarder
          .connect(caller)
          .callRemoteArbitrary(txHash, REMOTE_EID, data, options, {
            value: ethers.parseEther("0.01"),
          })
      ).to.be.revertedWith("BridgeForwarder: txHash already used");
    });

    it("local dispatch: calls processBridgeMessage directly when dstEid matches", async function () {
      const { forwarder, target, caller } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("local-dispatch"));
      const innerMessage = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["Hello from bridge"]
      );
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [42, caller.address, await target.getAddress(), innerMessage]
      );
      const options = "0x";

      // Use LOCAL_EID as destination -> should trigger local dispatch
      await forwarder
        .connect(caller)
        .callRemoteArbitrary(txHash, LOCAL_EID, data, options);

      // Verify the mock target was called
      expect(await target.callCount()).to.equal(1);
      expect(await target.lastSrcChainId()).to.equal(42);
      expect(await target.lastSrcSender()).to.equal(caller.address);
    });

    it("local dispatch does not call LayerZero endpoint", async function () {
      const { forwarder, endpoint, target, caller } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("local-no-lz"));
      const innerMessage = "0x";
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [42, caller.address, await target.getAddress(), innerMessage]
      );

      await forwarder
        .connect(caller)
        .callRemoteArbitrary(txHash, LOCAL_EID, data, "0x");

      // LZ endpoint should NOT have been called
      expect(await endpoint.sendCallCount()).to.equal(0);
    });
  });

  // ─── quoteCallRemoteArbitrary ─────────────────────

  describe("quoteCallRemoteArbitrary", function () {
    it("returns fee from endpoint mock", async function () {
      const { forwarder } =
        await loadFixture(deployBridgeForwarderFixture);

      const data = "0x1234";
      const options = "0x";

      const [nativeFee, lzTokenFee] =
        await forwarder.quoteCallRemoteArbitrary(REMOTE_EID, data, options);

      // Mock endpoint returns 0.001 ether as nativeFee
      expect(nativeFee).to.equal(ethers.parseEther("0.001"));
      expect(lzTokenFee).to.equal(0);
    });
  });

  // ─── setBridgeAddress ─────────────────────────────

  describe("setBridgeAddress", function () {
    it("owner can set bridge address", async function () {
      const { forwarder, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      const addr = ethers.zeroPadValue("0x1234567890123456789012345678901234567890", 32);
      await forwarder.connect(owner).setBridgeAddress(REMOTE_EID, addr);

      expect(await forwarder.bridgeAddresses(REMOTE_EID)).to.equal(addr);
    });

    it("reverts without OWNER_ROLE", async function () {
      const { forwarder, outsider } =
        await loadFixture(deployBridgeForwarderFixture);

      const addr = ethers.zeroPadValue("0x1234567890123456789012345678901234567890", 32);

      await expect(
        forwarder.connect(outsider).setBridgeAddress(REMOTE_EID, addr)
      ).to.be.revertedWithCustomError(forwarder, "AccessControlUnauthorizedAccount");
    });
  });

  // ─── isHashUsed ───────────────────────────────────

  describe("isHashUsed", function () {
    it("returns false for unused hash", async function () {
      const { forwarder } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("unused"));
      expect(await forwarder.isHashUsed(txHash)).to.be.false;
    });

    it("returns true after hash is used", async function () {
      const { forwarder, target, caller, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      const txHash = ethers.keccak256(ethers.toUtf8Bytes("used-hash"));
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint32", "address", "address", "bytes"],
        [42, caller.address, await target.getAddress(), "0x"]
      );

      // Use local dispatch to avoid needing LZ setup
      await forwarder
        .connect(caller)
        .callRemoteArbitrary(txHash, LOCAL_EID, data, "0x");

      expect(await forwarder.isHashUsed(txHash)).to.be.true;
    });
  });

  // ─── receive() ────────────────────────────────────

  describe("receive", function () {
    it("accepts ETH transfers", async function () {
      const { forwarder, owner } =
        await loadFixture(deployBridgeForwarderFixture);

      await owner.sendTransaction({
        to: await forwarder.getAddress(),
        value: ethers.parseEther("1"),
      });

      const balance = await ethers.provider.getBalance(
        await forwarder.getAddress()
      );
      expect(balance).to.equal(ethers.parseEther("1"));
    });
  });
});
