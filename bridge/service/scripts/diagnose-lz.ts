/**
 * diagnose-lz.ts — LayerZero configuration diagnostics.
 *
 * Checks:
 *  - BridgeForwarder on zkSync: bridgeAddresses for the destination EID
 *  - BridgeReceiver on Base: trustedForwarders for the source EID
 *
 * Usage:
 *   npm run diagnose-lz
 *
 * Requires env vars: ZKSYNC_RPC_URL, BASE_RPC_URL,
 *   BRIDGE_FORWARDER_ADDRESS, BRIDGE_RECEIVER_ADDRESS
 */

import { ethers } from "ethers";

const ZKSYNC_RPC = process.env.ZKSYNC_RPC_URL;
const BASE_RPC = process.env.BASE_RPC_URL;
const BRIDGE_FORWARDER = process.env.BRIDGE_FORWARDER_ADDRESS;
const BRIDGE_RECEIVER = process.env.BRIDGE_RECEIVER_ADDRESS;

// LayerZero EIDs
const ZKSYNC_EID = 40165;
const BASE_EID = 40245;

const FORWARDER_ABI = [
  "function bridgeAddresses(uint32) view returns (bytes32)",
  "function endpoint() view returns (address)",
];

const RECEIVER_ABI = [
  "function trustedForwarders(uint32) view returns (bytes32)",
  "function endpoint() view returns (address)",
];

async function main() {
  console.log("LayerZero Configuration Diagnostics");
  console.log("=".repeat(50));

  if (!ZKSYNC_RPC || !BASE_RPC || !BRIDGE_FORWARDER || !BRIDGE_RECEIVER) {
    console.error(
      "Missing env vars. Need: ZKSYNC_RPC_URL, BASE_RPC_URL, BRIDGE_FORWARDER_ADDRESS, BRIDGE_RECEIVER_ADDRESS",
    );
    process.exit(1);
  }

  // Check BridgeForwarder on zkSync
  console.log("\n--- BridgeForwarder (zkSync) ---");
  console.log(`Address: ${BRIDGE_FORWARDER}`);

  const zkProvider = new ethers.JsonRpcProvider(ZKSYNC_RPC);
  const forwarder = new ethers.Contract(
    BRIDGE_FORWARDER,
    FORWARDER_ABI,
    zkProvider,
  );

  try {
    const endpoint = await forwarder.endpoint();
    console.log(`LZ Endpoint: ${endpoint}`);

    const bridgeAddr = await forwarder.bridgeAddresses(BASE_EID);
    console.log(`bridgeAddresses[${BASE_EID}] (Base): ${bridgeAddr}`);

    if (bridgeAddr === ethers.ZeroHash) {
      console.warn(
        "WARNING: No BridgeReceiver configured for Base EID. Messages will fail.",
      );
    } else {
      // Extract address from bytes32 (last 20 bytes)
      const addrFromBytes32 = ethers.getAddress(
        "0x" + bridgeAddr.slice(26),
      );
      console.log(`  -> Decoded address: ${addrFromBytes32}`);
    }
  } catch (err) {
    console.error("Failed to read BridgeForwarder:", err);
  }

  // Check BridgeReceiver on Base
  console.log("\n--- BridgeReceiver (Base) ---");
  console.log(`Address: ${BRIDGE_RECEIVER}`);

  const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
  const receiver = new ethers.Contract(
    BRIDGE_RECEIVER,
    RECEIVER_ABI,
    baseProvider,
  );

  try {
    const endpoint = await receiver.endpoint();
    console.log(`LZ Endpoint: ${endpoint}`);

    const trustedForwarder = await receiver.trustedForwarders(ZKSYNC_EID);
    console.log(
      `trustedForwarders[${ZKSYNC_EID}] (zkSync): ${trustedForwarder}`,
    );

    if (trustedForwarder === ethers.ZeroHash) {
      console.warn(
        "WARNING: No trusted forwarder configured for zkSync EID. Messages will be rejected.",
      );
    } else {
      const addrFromBytes32 = ethers.getAddress(
        "0x" + trustedForwarder.slice(26),
      );
      console.log(`  -> Decoded address: ${addrFromBytes32}`);
    }
  } catch (err) {
    console.error("Failed to read BridgeReceiver:", err);
  }

  console.log("\n" + "=".repeat(50));
  console.log("Diagnostics complete.");
}

main().catch(console.error);
