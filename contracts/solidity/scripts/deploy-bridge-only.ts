import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Known LayerZero V2 endpoints
const LZ_ENDPOINTS: Record<number, string> = {
  300: "0xe2Ef622A13e71D9Dd2BBd12cd4b27e1516FA8a09",   // zkSync Sepolia
  324: "0xd07C30aF3Ff30D96BDc9c6044958230Eb5629649",   // zkSync Mainnet
  84532: "0x6EDCE65403992e310A62460808c4b910D972f10f", // Base Sepolia
  8453: "0x1a44076050125825900e736c501f859c50fE728c",   // Base Mainnet
};

// LayerZero Endpoint IDs (query via endpoint.eid())
const LZ_EIDS: Record<number, number> = {
  300: 40305,    // zkSync Sepolia
  324: 30165,    // zkSync Mainnet
  84532: 40245,  // Base Sepolia
  8453: 30184,   // Base Mainnet
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("Chain ID:", chainId);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH\n");

  const endpoint = LZ_ENDPOINTS[chainId];
  if (!endpoint) {
    console.error("No LZ endpoint for chain", chainId);
    process.exit(1);
  }
  console.log("LZ Endpoint:", endpoint);

  // Deploy BridgeForwarder
  const Forwarder = await ethers.getContractFactory("BridgeForwarder");
  const forwarder = await Forwarder.deploy(endpoint, deployer.address);
  await forwarder.waitForDeployment();
  const forwarderAddr = await forwarder.getAddress();
  console.log("BridgeForwarder deployed to:", forwarderAddr);

  console.log("\n--- Addresses ---");
  console.log("BridgeForwarder:", forwarderAddr);
  console.log("LZ Endpoint:", endpoint);
  console.log("Chain EID:", LZ_EIDS[chainId]);

  // Update deployments.json
  const deploymentsPath = path.resolve(__dirname, "../../../bridge/deployments.json");
  try {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    deployments.zkSyncSepolia.bridgeForwarder = forwarderAddr;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
    console.log(`\nUpdated deployments.json:`);
    console.log(`  zkSyncSepolia.bridgeForwarder = ${forwarderAddr}`);
  } catch (err) {
    console.warn("\nWarning: Could not update deployments.json:", (err as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
