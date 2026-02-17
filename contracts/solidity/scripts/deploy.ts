import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy InternetCourtFactory and MockUSDC to the target chain.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 *   npx hardhat run scripts/deploy.ts --network baseMainnet
 *   npx hardhat run scripts/deploy.ts                        # localhost/hardhat
 *
 * Environment variables:
 *   BRIDGE_RECEIVER_ADDRESS - Address of the BridgeReceiver on this chain
 *                             (defaults to deployer address for local testing)
 *   OWNER_ADDRESS           - Admin/owner address
 *                             (defaults to deployer address)
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── 1. Deploy MockUSDC (testnet only — skip on mainnet) ──

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isMainnet = chainId === 8453 || chainId === 324; // Base Mainnet or zkSync Mainnet

  let mockUsdcAddress: string | undefined;
  if (!isMainnet) {
    console.log("\n--- Deploying MockUSDC (testnet) ---");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    mockUsdcAddress = await mockUsdc.getAddress();
    console.log("MockUSDC deployed to:", mockUsdcAddress);
  } else {
    console.log("\nSkipping MockUSDC deployment on mainnet");
  }

  // ── 2. Deploy InternetCourtFactory ──

  const bridgeReceiverAddress =
    process.env.BRIDGE_RECEIVER_ADDRESS || deployer.address;
  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;

  console.log("\n--- Deploying InternetCourtFactory ---");
  console.log("  bridgeReceiver:", bridgeReceiverAddress);
  console.log("  owner:", ownerAddress);

  const Factory = await ethers.getContractFactory("InternetCourtFactory");
  const factory = await Factory.deploy(bridgeReceiverAddress, ownerAddress);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("InternetCourtFactory deployed to:", factoryAddress);

  // ── 3. Summary ──

  console.log("\n========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log("Chain ID:          ", chainId);
  console.log("Deployer:          ", deployer.address);
  console.log("Factory:           ", factoryAddress);
  console.log("Bridge Receiver:   ", bridgeReceiverAddress);
  console.log("Owner:             ", ownerAddress);
  console.log("========================================");

  // ── 4. Update deployments.json ──

  const deploymentsPath = path.resolve(__dirname, "../../../bridge/deployments.json");
  try {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    deployments.baseSepolia.factory = factoryAddress;
    if (mockUsdcAddress) {
      deployments.baseSepolia.mockUSDC = mockUsdcAddress;
    }
    const deploymentBlock = await ethers.provider.getBlockNumber();
    deployments.baseSepolia.deploymentBlock = deploymentBlock;
    fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
    console.log(`\nUpdated deployments.json:`);
    console.log(`  baseSepolia.factory = ${factoryAddress}`);
    if (mockUsdcAddress) {
      console.log(`  baseSepolia.mockUSDC = ${mockUsdcAddress}`);
    }
    console.log(`  baseSepolia.deploymentBlock = ${deploymentBlock}`);
  } catch (err) {
    console.warn("\nWarning: Could not update deployments.json:", (err as Error).message);
  }

  // ── 5. Optional: Verify on block explorer ──

  if (chainId !== 31337) {
    console.log("\nTo verify on block explorer, run:");
    console.log(
      `  npx hardhat verify --network <network> ${factoryAddress} "${bridgeReceiverAddress}" "${ownerAddress}"`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
