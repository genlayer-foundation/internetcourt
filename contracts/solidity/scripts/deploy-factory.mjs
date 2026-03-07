#!/usr/bin/env node
/**
 * deploy-factory.mjs
 * Deploys InternetCourtFactory to Base Sepolia using ethers.js directly.
 */
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT  = join(__dir, "..");

const RPC = "https://sepolia.base.org";
const BRIDGE_RECEIVER = "0xc3e6aE892A704c875bF74Df46eD873308db15d82";
const OWNER           = "0xe9630ba0e3cc2d3BFC58fbE1Bbde478f06E4CE87";

const rawKey = readFileSync(`${process.env.HOME}/.internetcourt/.exporter_key`, "utf8").trim();
const KEY = rawKey.startsWith("0x") ? rawKey : "0x" + rawKey;

const provider = new ethers.JsonRpcProvider(RPC);
const wallet   = new ethers.Wallet(KEY, provider);

const artifact = JSON.parse(readFileSync(
  join(ROOT, "artifacts/contracts/InternetCourtFactory.sol/InternetCourtFactory.json"),
  "utf8"
));

const bal = await provider.getBalance(wallet.address);
console.log(`Deployer: ${wallet.address}`);
console.log(`Balance:  ${ethers.formatEther(bal)} ETH`);

const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
console.log("\nDeploying InternetCourtFactory...");

const contract = await factory.deploy(BRIDGE_RECEIVER, OWNER);
console.log(`Tx:       ${contract.deploymentTransaction().hash}`);

await contract.waitForDeployment();
const addr = await contract.getAddress();
console.log(`Address:  ${addr}`);
console.log(`Basescan: https://sepolia.basescan.org/address/${addr}`);

// Verify
const br = await contract.bridgeReceiver();
console.log(`bridgeReceiver wired: ${br} ${br.toLowerCase() === BRIDGE_RECEIVER.toLowerCase() ? "✅" : "❌"}`);

// Save
const deployment = {
  InternetCourtFactory: addr,
  deployTx: contract.deploymentTransaction().hash,
  bridgeReceiver: BRIDGE_RECEIVER,
  owner: OWNER,
  chainId: 84532,
  network: "baseSepolia",
  deployedAt: new Date().toISOString(),
};
writeFileSync(join(ROOT, "../../bridge/deployments.json"),
  JSON.stringify(deployment, null, 2));
console.log(`\nSaved to bridge/deployments.json`);
