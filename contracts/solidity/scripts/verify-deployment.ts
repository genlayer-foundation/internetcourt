import { ethers, network } from "hardhat";

const ADDRESSES = {
  factory: "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a",
  bridgeReceiver: "0xc3e6aE892A704c875bF74Df46eD873308db15d82",
  bridgeForwarder: "0x95c4E5b042d75528f7df355742e48B298028b3f2",
  mockUSDC: "0x58C27C7C1Ff5DBF480c956acf6b119508b6FBa4f",
};

const EIDS = { zkSyncSepolia: 40165, baseSepolia: 40245 };

async function verifyBase() {
  console.log("=== Base Sepolia Verification ===\n");

  const factory = await ethers.getContractAt("InternetCourtFactory", ADDRESSES.factory);
  const receiver = await ethers.getContractAt("BridgeReceiver", ADDRESSES.bridgeReceiver);

  const br = await factory.bridgeReceiver();
  const owner = await factory.owner();
  const nextId = await factory.nextAgreementId();
  console.log("Factory:");
  console.log("  bridgeReceiver:", br, br.toLowerCase() === ADDRESSES.bridgeReceiver.toLowerCase() ? "✓" : "✗ WRONG");
  console.log("  owner:", owner);
  console.log("  nextAgreementId:", nextId.toString());

  const endpoint = await receiver.endpoint();
  const trusted = await receiver.trustedForwarders(EIDS.zkSyncSepolia);
  const expectedForwarder = ethers.zeroPadValue(ADDRESSES.bridgeForwarder, 32);
  console.log("\nBridgeReceiver:");
  console.log("  endpoint:", endpoint);
  console.log("  trustedForwarder[zkSync]:", trusted, trusted.toLowerCase() === expectedForwarder.toLowerCase() ? "✓" : "✗ WRONG");
}

async function verifyZkSync() {
  console.log("=== zkSync Sepolia Verification ===\n");

  const forwarder = await ethers.getContractAt("BridgeForwarder", ADDRESSES.bridgeForwarder);

  const endpoint = await forwarder.endpoint();
  const bridgeAddr = await forwarder.bridgeAddresses(EIDS.baseSepolia);
  const expectedReceiver = ethers.zeroPadValue(ADDRESSES.bridgeReceiver, 32);
  console.log("BridgeForwarder:");
  console.log("  endpoint:", endpoint);
  console.log("  bridgeAddress[Base]:", bridgeAddr, bridgeAddr.toLowerCase() === expectedReceiver.toLowerCase() ? "✓" : "✗ WRONG");
}

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId === 84532) await verifyBase();
  else if (chainId === 300) await verifyZkSync();
  else console.error("Unknown chain:", chainId);
}

main().catch((e) => { console.error(e); process.exit(1); });
