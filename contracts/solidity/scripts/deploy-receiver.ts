import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const LZ_ENDPOINTS: Record<number, string> = {
  84532: "0x6EDCE65403992e310A62460808c4b910D972f10f", // Base Sepolia
  8453: "0x1a44076050125825900e736c501f859c50fE728c",   // Base Mainnet
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

  const Receiver = await ethers.getContractFactory("BridgeReceiver");
  const receiver = await Receiver.deploy(endpoint, deployer.address);
  await receiver.waitForDeployment();
  const receiverAddr = await receiver.getAddress();
  console.log("BridgeReceiver deployed to:", receiverAddr);

  // Update deployments.json
  const deploymentsPath = path.resolve(__dirname, "../../../bridge/deployments.json");
  try {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    deployments.baseSepolia.bridgeReceiver = receiverAddr;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
    console.log(`\nUpdated deployments.json:`);
    console.log(`  baseSepolia.bridgeReceiver = ${receiverAddr}`);
  } catch (err) {
    console.warn("\nWarning: Could not update deployments.json:", (err as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
