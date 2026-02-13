import { ethers } from "hardhat";

/**
 * Deploy InternetCourtFactory and MockUSDL to the target chain.
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

  // ── 1. Deploy MockUSDL (testnet only — skip on mainnet) ──

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isMainnet = chainId === 8453 || chainId === 324; // Base Mainnet or zkSync Mainnet

  if (!isMainnet) {
    console.log("\n--- Deploying MockUSDL (testnet) ---");
    const MockUSDL = await ethers.getContractFactory("MockUSDL");
    const mockUsdl = await MockUSDL.deploy();
    await mockUsdl.waitForDeployment();
    console.log("MockUSDL deployed to:", await mockUsdl.getAddress());
  } else {
    console.log("\nSkipping MockUSDL deployment on mainnet");
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

  // ── 4. Optional: Verify on block explorer ──

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
