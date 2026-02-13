/**
 * debug-bridge.ts — Cross-chain bridge state inspector.
 *
 * Checks:
 *  - BridgeSender message count on GenLayer
 *  - BridgeForwarder used hashes on zkSync
 *  - Factory agreement count on Base
 *
 * Usage:
 *   npm run debug-bridge
 *
 * Requires env vars: GENLAYER_RPC_URL, BRIDGE_SENDER_ADDRESS,
 *   ZKSYNC_RPC_URL, BRIDGE_FORWARDER_ADDRESS,
 *   BASE_RPC_URL, FACTORY_ADDRESS
 */

import { ethers } from "ethers";
import { createClient } from "genlayer-js";
import type { CalldataEncodable } from "genlayer-js/types";

const GENLAYER_RPC = process.env.GENLAYER_RPC_URL;
const BRIDGE_SENDER = process.env.BRIDGE_SENDER_ADDRESS;
const ZKSYNC_RPC = process.env.ZKSYNC_RPC_URL;
const BRIDGE_FORWARDER = process.env.BRIDGE_FORWARDER_ADDRESS;
const BASE_RPC = process.env.BASE_RPC_URL;
const FACTORY = process.env.FACTORY_ADDRESS;

const FORWARDER_ABI = [
  "function isHashUsed(bytes32) view returns (bool)",
];

async function main() {
  console.log("Bridge State Inspector");
  console.log("=".repeat(50));

  if (
    !GENLAYER_RPC ||
    !BRIDGE_SENDER ||
    !ZKSYNC_RPC ||
    !BRIDGE_FORWARDER ||
    !BASE_RPC ||
    !FACTORY
  ) {
    console.error(
      "Missing env vars. Need: GENLAYER_RPC_URL, BRIDGE_SENDER_ADDRESS, " +
        "ZKSYNC_RPC_URL, BRIDGE_FORWARDER_ADDRESS, BASE_RPC_URL, FACTORY_ADDRESS",
    );
    process.exit(1);
  }

  // 1. Check BridgeSender on GenLayer
  console.log("\n--- BridgeSender (GenLayer) ---");
  console.log(`Address: ${BRIDGE_SENDER}`);

  const glClient = createClient({ endpoint: GENLAYER_RPC });

  try {
    const hashesRaw: CalldataEncodable = await glClient.readContract({
      address: BRIDGE_SENDER as `0x${string}`,
      functionName: "get_message_hashes",
      args: [],
    });

    const hashes = (hashesRaw as string[]) || [];
    console.log(`Total messages: ${hashes.length}`);

    if (hashes.length > 0) {
      console.log("Message hashes:");
      for (const h of hashes.slice(0, 10)) {
        console.log(`  ${h}`);
      }
      if (hashes.length > 10) {
        console.log(`  ... and ${hashes.length - 10} more`);
      }
    }
  } catch (err) {
    console.error("Failed to read BridgeSender:", err);
  }

  // 2. Check BridgeForwarder used hashes
  console.log("\n--- BridgeForwarder (zkSync) ---");
  console.log(`Address: ${BRIDGE_FORWARDER}`);

  const zkProvider = new ethers.JsonRpcProvider(ZKSYNC_RPC);
  const forwarder = new ethers.Contract(
    BRIDGE_FORWARDER,
    FORWARDER_ABI,
    zkProvider,
  );

  // Re-read hashes to check which are relayed
  try {
    const hashesRaw: CalldataEncodable = await glClient.readContract({
      address: BRIDGE_SENDER as `0x${string}`,
      functionName: "get_message_hashes",
      args: [],
    });

    const hashes = (hashesRaw as string[]) || [];
    let relayed = 0;
    let pending = 0;

    for (const hash of hashes) {
      const hashBytes32 = ethers.zeroPadValue(
        hash.startsWith("0x") ? hash : `0x${hash}`,
        32,
      );
      const isUsed = await forwarder.isHashUsed(hashBytes32);
      if (isUsed) {
        relayed++;
      } else {
        pending++;
        console.log(`  Pending: ${hash}`);
      }
    }

    console.log(`Relayed: ${relayed}, Pending: ${pending}`);
  } catch (err) {
    console.error("Failed to check BridgeForwarder:", err);
  }

  // 3. Check Factory on Base
  console.log("\n--- InternetCourtFactory (Base) ---");
  console.log(`Address: ${FACTORY}`);

  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);

  try {
    // Check if the contract exists
    const code = await baseProvider.getCode(FACTORY);
    console.log(
      `Contract deployed: ${code !== "0x" ? "Yes" : "No (no code at address)"}`,
    );
  } catch (err) {
    console.error("Failed to check Factory:", err);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Debug complete.");
}

main().catch(console.error);
