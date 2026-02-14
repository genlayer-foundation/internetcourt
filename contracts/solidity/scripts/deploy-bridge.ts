import { ethers } from "hardhat";

/**
 * Deploy BridgeForwarder and BridgeReceiver, then configure trust relationships.
 *
 * In production, these two contracts live on different chains:
 *   - BridgeForwarder on zkSync (where GenLayer sends verdicts)
 *   - BridgeReceiver on Base (where InternetCourtFactory lives)
 *
 * For local testing, both are deployed to the same Hardhat network.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-bridge.ts                 # localhost/hardhat
 *   npx hardhat run scripts/deploy-bridge.ts --network baseSepolia
 *
 * Environment variables:
 *   LZ_ENDPOINT_ZKSYNC   - LayerZero V2 endpoint on zkSync (for BridgeForwarder)
 *   LZ_ENDPOINT_BASE     - LayerZero V2 endpoint on Base (for BridgeReceiver)
 *   OWNER_ADDRESS         - Admin/owner address (defaults to deployer)
 *   FACTORY_ADDRESS       - Already deployed InternetCourtFactory address
 *                           (if set, will configure BridgeReceiver as bridge receiver on factory)
 *
 * Known LayerZero V2 Endpoints:
 *   zkSync Sepolia: 0x6EDCE65403992e310A62460808c4b910D972f10f  (EID: 40165)
 *   Base Sepolia:   0x6EDCE65403992e310A62460808c4b910D972f10f  (EID: 40245)
 *   zkSync Mainnet: 0xd07C30aF3Ff30D96BDc9c6044958230Eb5b32a6c  (EID: 30165)
 *   Base Mainnet:   0x1a44076050125825900e736c501f859c50fE728c  (EID: 30184)
 */

// LayerZero Endpoint IDs
const EID_ZKSYNC_SEPOLIA = 40165;
const EID_BASE_SEPOLIA = 40245;

async function main() {
  const [deployer] = await ethers.getSigners();
  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("Deploying bridge contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("Chain ID:", chainId);

  // ── Determine LZ endpoints ──

  // For local testing, we deploy a MockLZEndpoint
  const isLocal = chainId === 31337;

  let lzEndpointForwarder: string;
  let lzEndpointReceiver: string;

  if (isLocal) {
    console.log("\n--- Deploying MockLZEndpoint (local testing) ---");
    const MockEndpoint = await ethers.getContractFactory("MockLZEndpoint");

    const endpointForwarder = await MockEndpoint.deploy(EID_ZKSYNC_SEPOLIA);
    await endpointForwarder.waitForDeployment();
    lzEndpointForwarder = await endpointForwarder.getAddress();
    console.log("MockLZEndpoint (Forwarder/zkSync):", lzEndpointForwarder);

    const endpointReceiver = await MockEndpoint.deploy(EID_BASE_SEPOLIA);
    await endpointReceiver.waitForDeployment();
    lzEndpointReceiver = await endpointReceiver.getAddress();
    console.log("MockLZEndpoint (Receiver/Base):", lzEndpointReceiver);
  } else {
    lzEndpointForwarder =
      process.env.LZ_ENDPOINT_ZKSYNC ||
      "0x6EDCE65403992e310A62460808c4b910D972f10f";
    lzEndpointReceiver =
      process.env.LZ_ENDPOINT_BASE ||
      "0x6EDCE65403992e310A62460808c4b910D972f10f";
    console.log("\nUsing LZ Endpoint (Forwarder):", lzEndpointForwarder);
    console.log("Using LZ Endpoint (Receiver):", lzEndpointReceiver);
  }

  // ── 1. Deploy BridgeForwarder (zkSync side) ──

  console.log("\n--- Deploying BridgeForwarder ---");
  const BridgeForwarder = await ethers.getContractFactory("BridgeForwarder");
  const forwarder = await BridgeForwarder.deploy(
    lzEndpointForwarder,
    ownerAddress
  );
  await forwarder.waitForDeployment();
  const forwarderAddress = await forwarder.getAddress();
  console.log("BridgeForwarder deployed to:", forwarderAddress);

  // ── 2. Deploy BridgeReceiver (Base side) ──

  console.log("\n--- Deploying BridgeReceiver ---");
  const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
  const receiver = await BridgeReceiver.deploy(
    lzEndpointReceiver,
    ownerAddress
  );
  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();
  console.log("BridgeReceiver deployed to:", receiverAddress);

  // ── 3. Configure trust relationships ──

  console.log("\n--- Configuring trust relationships ---");

  // BridgeForwarder: set BridgeReceiver address for the Base EID
  const receiverAsBytes32 = ethers.zeroPadValue(receiverAddress, 32);
  await forwarder.setBridgeAddress(EID_BASE_SEPOLIA, receiverAsBytes32);
  console.log(
    "BridgeForwarder: setBridgeAddress(Base EID) ->",
    receiverAddress
  );

  // BridgeReceiver: trust the BridgeForwarder from zkSync EID
  const forwarderAsBytes32 = ethers.zeroPadValue(forwarderAddress, 32);
  await receiver.setTrustedForwarder(EID_ZKSYNC_SEPOLIA, forwarderAsBytes32);
  console.log(
    "BridgeReceiver: setTrustedForwarder(zkSync EID) ->",
    forwarderAddress
  );

  // ── 4. Optionally configure Factory ──

  const factoryAddress = process.env.FACTORY_ADDRESS;
  if (factoryAddress) {
    console.log("\n--- Configuring InternetCourtFactory ---");
    const factory = await ethers.getContractAt(
      "InternetCourtFactory",
      factoryAddress
    );
    await factory.setBridgeReceiver(receiverAddress);
    console.log(
      "Factory: setBridgeReceiver ->",
      receiverAddress
    );
  }

  // ── 5. Summary ──

  console.log("\n========================================");
  console.log("Bridge Deployment Summary");
  console.log("========================================");
  console.log("Chain ID:           ", chainId);
  console.log("Deployer:           ", deployer.address);
  console.log("Owner:              ", ownerAddress);
  console.log("BridgeForwarder:    ", forwarderAddress);
  console.log("BridgeReceiver:     ", receiverAddress);
  console.log("LZ Endpoint (Fwd):  ", lzEndpointForwarder);
  console.log("LZ Endpoint (Rcv):  ", lzEndpointReceiver);
  if (factoryAddress) {
    console.log("Factory:            ", factoryAddress);
  }
  console.log("========================================");

  // ── 6. Verification commands ──

  if (!isLocal) {
    console.log("\nTo verify on block explorer, run:");
    console.log(
      `  npx hardhat verify --network <network> ${forwarderAddress} "${lzEndpointForwarder}" "${ownerAddress}"`
    );
    console.log(
      `  npx hardhat verify --network <network> ${receiverAddress} "${lzEndpointReceiver}" "${ownerAddress}"`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
