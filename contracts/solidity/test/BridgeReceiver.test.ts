import { expect } from "chai";
import { ethers } from "hardhat";
import {
  loadFixture,
  setBalance,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("BridgeReceiver", function () {
  const LOCAL_EID = 30101;
  const REMOTE_EID = 30184;

  // ─── Fixtures ──────────────────────────────────────

  async function deployBridgeReceiverFixture() {
    const [owner, outsider] = await ethers.getSigners();

    // Deploy mock LZ endpoint
    const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");
    const endpoint = await MockEndpoint.deploy(LOCAL_EID);

    // Deploy BridgeReceiver
    const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
    const receiver = await BridgeReceiver.deploy(
      await endpoint.getAddress(),
      owner.address
    );

    // Deploy mock bridge target
    const MockTarget = await ethers.getContractFactory("MockBridgeTarget");
    const target = await MockTarget.deploy();

    // Set up a trusted forwarder for REMOTE_EID
    const trustedForwarder = ethers.zeroPadValue(outsider.address, 32);
    await receiver.connect(owner).setTrustedForwarder(REMOTE_EID, trustedForwarder);

    return { receiver, endpoint, target, owner, outsider, trustedForwarder };
  }

  // Helper to build a valid Origin struct
  function buildOrigin(srcEid: number, sender: string, nonce: number) {
    return {
      srcEid,
      sender: ethers.zeroPadValue(sender, 32),
      nonce,
    };
  }

  // Helper to build the bridge message envelope
  function buildMessage(
    srcChainId: number,
    srcSender: string,
    localContract: string,
    innerMessage: string
  ) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint32", "address", "address", "bytes"],
      [srcChainId, srcSender, localContract, innerMessage]
    );
  }

  // ─── Constructor ──────────────────────────────────

  describe("Constructor", function () {
    it("sets endpoint correctly", async function () {
      const { receiver, endpoint } =
        await loadFixture(deployBridgeReceiverFixture);

      expect(await receiver.endpoint()).to.equal(await endpoint.getAddress());
    });

    it("sets owner correctly", async function () {
      const { receiver, owner } =
        await loadFixture(deployBridgeReceiverFixture);

      expect(await receiver.owner()).to.equal(owner.address);
    });
  });

  // ─── lzReceive ──────────────────────────────────────

  describe("lzReceive", function () {
    it("dispatches message to target contract via endpoint", async function () {
      const { receiver, endpoint, target, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const innerMessage = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["Hello from bridge"]
      );
      const message = buildMessage(
        42,
        outsider.address,
        await target.getAddress(),
        innerMessage
      );
      const origin = buildOrigin(REMOTE_EID, outsider.address, 1);
      const guid = ethers.keccak256(ethers.toUtf8Bytes("guid1"));

      // Call lzReceive from the endpoint address (impersonate)
      const endpointAddr = await endpoint.getAddress();
      const endpointSigner = await ethers.getImpersonatedSigner(endpointAddr);

      // Fund the endpoint so it can send transactions
      await setBalance(endpointAddr, ethers.parseEther("1"));

      await receiver
        .connect(endpointSigner)
        .lzReceive(origin, guid, message, outsider.address, "0x");

      // Verify the mock target was called
      expect(await target.callCount()).to.equal(1);
      expect(await target.lastSrcChainId()).to.equal(42);
      expect(await target.lastSrcSender()).to.equal(outsider.address);
    });

    it("correctly decodes and forwards the inner message", async function () {
      const { receiver, endpoint, target, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const innerPayload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bool"],
        [12345, true]
      );
      const message = buildMessage(
        99,
        outsider.address,
        await target.getAddress(),
        innerPayload
      );
      const origin = buildOrigin(REMOTE_EID, outsider.address, 2);
      const guid = ethers.keccak256(ethers.toUtf8Bytes("guid2"));

      const endpointAddr = await endpoint.getAddress();
      const endpointSigner = await ethers.getImpersonatedSigner(endpointAddr);
      await setBalance(endpointAddr, ethers.parseEther("1"));

      await receiver
        .connect(endpointSigner)
        .lzReceive(origin, guid, message, outsider.address, "0x");

      // Verify the inner message was forwarded correctly
      const lastMessage = await target.lastMessage();
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "bool"],
        lastMessage
      );
      expect(decoded[0]).to.equal(12345);
      expect(decoded[1]).to.equal(true);
    });

    it("rejects calls from non-endpoint address", async function () {
      const { receiver, target, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const message = buildMessage(
        42,
        outsider.address,
        await target.getAddress(),
        "0x"
      );
      const origin = buildOrigin(REMOTE_EID, outsider.address, 1);
      const guid = ethers.keccak256(ethers.toUtf8Bytes("guid3"));

      // Call from outsider (not the endpoint)
      await expect(
        receiver
          .connect(outsider)
          .lzReceive(origin, guid, message, outsider.address, "0x")
      ).to.be.revertedWith("BridgeReceiver: only Endpoint can call");
    });

    it("rejects messages from untrusted forwarders", async function () {
      const { receiver, endpoint, target, owner, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const message = buildMessage(
        42,
        owner.address,
        await target.getAddress(),
        "0x"
      );
      // Use an origin with a different sender than the trusted forwarder
      const untrustedSender = owner.address;
      const origin = buildOrigin(REMOTE_EID, untrustedSender, 1);
      const guid = ethers.keccak256(ethers.toUtf8Bytes("guid4"));

      const endpointAddr = await endpoint.getAddress();
      const endpointSigner = await ethers.getImpersonatedSigner(endpointAddr);
      await setBalance(endpointAddr, ethers.parseEther("1"));

      await expect(
        receiver
          .connect(endpointSigner)
          .lzReceive(origin, guid, message, outsider.address, "0x")
      ).to.be.revertedWith("BridgeReceiver: untrusted forwarder");
    });

    it("rejects messages from an EID with no trusted forwarder set", async function () {
      const { receiver, endpoint, target, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const unknownEid = 99999;
      const message = buildMessage(
        42,
        outsider.address,
        await target.getAddress(),
        "0x"
      );
      const origin = buildOrigin(unknownEid, outsider.address, 1);
      const guid = ethers.keccak256(ethers.toUtf8Bytes("guid5"));

      const endpointAddr = await endpoint.getAddress();
      const endpointSigner = await ethers.getImpersonatedSigner(endpointAddr);
      await setBalance(endpointAddr, ethers.parseEther("1"));

      await expect(
        receiver
          .connect(endpointSigner)
          .lzReceive(origin, guid, message, outsider.address, "0x")
      ).to.be.revertedWith("BridgeReceiver: untrusted forwarder");
    });
  });

  // ─── setTrustedForwarder ───────────────────────────

  describe("setTrustedForwarder", function () {
    it("owner can set trusted forwarder", async function () {
      const { receiver, owner } =
        await loadFixture(deployBridgeReceiverFixture);

      const newForwarder = ethers.zeroPadValue(
        "0x1234567890123456789012345678901234567890",
        32
      );
      await receiver.connect(owner).setTrustedForwarder(12345, newForwarder);

      expect(await receiver.trustedForwarders(12345)).to.equal(newForwarder);
    });

    it("owner can update existing trusted forwarder", async function () {
      const { receiver, owner } =
        await loadFixture(deployBridgeReceiverFixture);

      const newForwarder = ethers.zeroPadValue(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        32
      );
      await receiver.connect(owner).setTrustedForwarder(REMOTE_EID, newForwarder);

      expect(await receiver.trustedForwarders(REMOTE_EID)).to.equal(newForwarder);
    });

    it("reverts if not owner", async function () {
      const { receiver, outsider } =
        await loadFixture(deployBridgeReceiverFixture);

      const forwarder = ethers.zeroPadValue(outsider.address, 32);

      await expect(
        receiver.connect(outsider).setTrustedForwarder(REMOTE_EID, forwarder)
      ).to.be.revertedWithCustomError(receiver, "OwnableUnauthorizedAccount");
    });
  });
});
