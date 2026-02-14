import { ethers, network } from "hardhat";

const ADDRESSES = {
  factory: "0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E",
  bridgeReceiver: "0x347FbC76104588dF52b85b7c840a4a8a891E2cf2",
  bridgeForwarder: "0xa94cc270C23789550F22d545d64691b958b9F1cb",
  mockUSDC: "0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3",
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
