import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Nonce:", await deployer.getNonce());
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH");

  const Factory = await ethers.getContractFactory("InternetCourtFactory");
  // bridgeReceiver will be updated later once BridgeReceiver is deployed
  const factory = await Factory.deploy(deployer.address, deployer.address);
  await factory.waitForDeployment();
  const addr = await factory.getAddress();
  console.log("\nInternetCourtFactory deployed to:", addr);
  console.log("\nVerify: npx hardhat verify --network baseSepolia", addr, deployer.address, deployer.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
