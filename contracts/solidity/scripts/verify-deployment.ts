import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Load deployed addresses from deployments.json
const deploymentsPath = path.resolve(__dirname, "../../../bridge/deployments.json");
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

const ADDRESSES = {
  factory: deployments.baseSepolia.factory,
  bridgeReceiver: deployments.baseSepolia.bridgeReceiver,
  bridgeForwarder: deployments.zkSyncSepolia.bridgeForwarder,
  mockUSDC: deployments.baseSepolia.mockUSDC,
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
