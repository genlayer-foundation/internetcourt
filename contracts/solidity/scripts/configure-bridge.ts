import { ethers, network } from "hardhat";

const ADDRESSES = {
  // Base Sepolia
  factory: "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a",
  bridgeReceiver: "0xc3e6aE892A704c875bF74Df46eD873308db15d82",
  // zkSync Sepolia
  bridgeForwarder: "0x95c4E5b042d75528f7df355742e48B298028b3f2",
};

// LayerZero EIDs
const EIDS = {
  zkSyncSepolia: 40305,
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
