import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=== Deploy BridgeSender to GenLayer Studionet ===\n");

  // Create account
  const privateKey = generatePrivateKey();
  const account = createAccount(privateKey);
  console.log("Account:", account.address);

  const client = createClient({ chain: studionet, account });

  // Fund on studionet
  console.log("Funding account on studionet...");
  const fundResp = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "sim_fundAccount",
      params: [account.address, 10_000_000],
      id: 1,
    }),
  });
  const fundResult = await fundResp.json();
  console.log("Fund result:", JSON.stringify(fundResult));

  // Initialize consensus (required before first tx)
  console.log("Initializing consensus...");
  try {
    await client.initializeConsensusSmartContract();
    console.log("Consensus initialized");
  } catch (e) {
    console.log("Consensus init:", e.message || "already initialized");
  }

  // Read BridgeSender.py
  const code = readFileSync(join(__dirname, "BridgeSender.py"), "utf-8");
  console.log("\nDeploying BridgeSender (" + code.length + " bytes)...");

  const deployHash = await client.deployContract({
    code,
    args: [],
  });
  console.log("Deploy tx:", deployHash);

  console.log("Waiting for confirmation (up to 6 min)...");
  const receipt = await client.waitForTransactionReceipt({
    hash: deployHash,
    status: "ACCEPTED",
    retries: 120,
    interval: 3000,
  });

  const contractAddress = receipt?.data?.contract_address || receipt?.to_address;
  if (contractAddress) {
    console.log("\n=== BridgeSender Deployed ===");
    console.log("Address:", contractAddress);
    console.log("\nFor relay service .env:");
    console.log("  BRIDGE_SENDER_ADDRESS=" + contractAddress);

    // Update deployments.json
    const deploymentsPath = join(__dirname, "../../bridge/deployments.json");
    try {
      const deployments = JSON.parse(readFileSync(deploymentsPath, "utf-8"));
      deployments.genlayer.bridgeSender = contractAddress;
      writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
      console.log(`\nUpdated deployments.json:`);
      console.log(`  genlayer.bridgeSender = ${contractAddress}`);
    } catch (err) {
      console.warn("\nWarning: Could not update deployments.json:", err.message);
    }
  } else {
    console.log("Receipt:", JSON.stringify(receipt, null, 2));
    console.error("No contract address found in receipt");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error:", e.message || e);
  process.exit(1);
});
