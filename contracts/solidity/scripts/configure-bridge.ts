import { ethers, network } from "hardhat";

// Deployed addresses
const ADDRESSES = {
  // Base Sepolia
  factory: "0x0cE49079fB4b0EDE327F2b8919f7aaD9C7dabE41",
  bridgeReceiver: "0x88A3d88Fe1141bB1833E22c208b497d5949C865e",
  // zkSync Sepolia
  bridgeForwarder: "0xa94cc270C23789550F22d545d64691b958b9F1cb",
};

// LayerZero EIDs
const EIDS = {
  zkSyncSepolia: 40165,
  baseSepolia: 40245,
};

async function configureBaseSepolia() {
  const [deployer] = await ethers.getSigners();
  console.log("Configuring Base Sepolia with account:", deployer.address);

  // 1. Set bridgeReceiver on Factory
  const factory = await ethers.getContractAt("InternetCourtFactory", ADDRESSES.factory);
  const currentBR = await factory.bridgeReceiver();
  console.log("Current bridgeReceiver:", currentBR);

  if (currentBR.toLowerCase() !== ADDRESSES.bridgeReceiver.toLowerCase()) {
    const tx1 = await factory.setBridgeReceiver(ADDRESSES.bridgeReceiver);
    await tx1.wait();
    console.log("Factory.setBridgeReceiver ->", ADDRESSES.bridgeReceiver);
  } else {
    console.log("Factory bridgeReceiver already set correctly");
  }

  // 2. Set trusted forwarder on BridgeReceiver (trust the zkSync forwarder)
  const receiver = await ethers.getContractAt("BridgeReceiver", ADDRESSES.bridgeReceiver);

  // Convert forwarder address to bytes32 (left-padded)
  const forwarderBytes32 = ethers.zeroPadValue(ADDRESSES.bridgeForwarder, 32);

  const currentForwarder = await receiver.trustedForwarders(EIDS.zkSyncSepolia);
  console.log("Current trusted forwarder for zkSync EID:", currentForwarder);

  if (currentForwarder.toLowerCase() !== forwarderBytes32.toLowerCase()) {
    const tx2 = await receiver.setTrustedForwarder(EIDS.zkSyncSepolia, forwarderBytes32);
    await tx2.wait();
    console.log("BridgeReceiver.setTrustedForwarder ->", forwarderBytes32);
  } else {
    console.log("Trusted forwarder already set correctly");
  }

  console.log("\n--- Base Sepolia Configuration Complete ---");
}

async function configureZkSyncSepolia() {
  const [deployer] = await ethers.getSigners();
  console.log("Configuring zkSync Sepolia with account:", deployer.address);

  // Set bridge address on Forwarder (receiver on Base Sepolia)
  const forwarder = await ethers.getContractAt("BridgeForwarder", ADDRESSES.bridgeForwarder);

  // Convert receiver address to bytes32 (left-padded)
  const receiverBytes32 = ethers.zeroPadValue(ADDRESSES.bridgeReceiver, 32);

  const currentBridge = await forwarder.bridgeAddresses(EIDS.baseSepolia);
  console.log("Current bridge address for Base EID:", currentBridge);

  if (currentBridge.toLowerCase() !== receiverBytes32.toLowerCase()) {
    const tx = await forwarder.setBridgeAddress(EIDS.baseSepolia, receiverBytes32);
    await tx.wait();
    console.log("BridgeForwarder.setBridgeAddress ->", receiverBytes32);
  } else {
    console.log("Bridge address already set correctly");
  }

  console.log("\n--- zkSync Sepolia Configuration Complete ---");
}

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  if (chainId === 84532) {
    await configureBaseSepolia();
  } else if (chainId === 300) {
    await configureZkSyncSepolia();
  } else {
    console.error("Unknown chain ID:", chainId);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
