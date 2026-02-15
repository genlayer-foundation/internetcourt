/**
 * GenLayerToEvm relay — GenLayer -> Base direction.
 *
 * Polls the BridgeSender contract on GenLayer for message hashes.
 * For each hash that has not yet been relayed (checked via
 * BridgeForwarder.isHashUsed on zkSync), the relay:
 *   1. Fetches the full message data from BridgeSender.
 *   2. Builds LayerZero V2 executor options (1M gas, 0 native value).
 *   3. Quotes the LayerZero fee via BridgeForwarder.
 *   4. Sends the message via BridgeForwarder.callRemoteArbitrary on zkSync.
 *
 * The BridgeForwarder marks the hash as used (replay protection), then
 * LayerZero carries the message from zkSync to Base where BridgeReceiver
 * delivers it to InternetCourtFactory.processBridgeMessage.
 */

import { ethers } from "ethers";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { CalldataEncodable } from "genlayer-js/types";
import { config } from "../config.js";

// ----- ABIs -----

const FORWARDER_ABI = [
  "function callRemoteArbitrary(bytes32 _txHash, uint32 _dstEid, bytes calldata _data, bytes calldata _options) payable",
  "function quoteCallRemoteArbitrary(uint32 _dstEid, bytes calldata _data, bytes calldata _options) view returns (uint256 nativeFee, uint256 lzTokenFee)",
  "function isHashUsed(bytes32 _txHash) view returns (bool)",
];

// ----- LayerZero V2 Options Encoding -----

/**
 * Build LayerZero V2 executor options bytes manually.
 *
 * Format (LZ V2 Options spec):
 *   - 2 bytes: options type (0x0003 for V2)
 *   - For each option:
 *     - 2 bytes: worker ID (0x0001 for executor)
 *     - 2 bytes: option length
 *     - 1 byte:  option type (0x01 = lzReceive)
 *     - option data:
 *       - 16 bytes: gas limit (uint128)
 *       - 16 bytes: native value (uint128)
 *
 * This avoids a dependency on @layerzerolabs/lz-v2-utilities which can
 * have installation issues.
 */
function buildLzOptions(gasLimit: bigint, nativeValue: bigint): Uint8Array {
  const buf = new Uint8Array(2 + 2 + 2 + 1 + 16 + 16); // 39 bytes total
  const view = new DataView(buf.buffer);

  let offset = 0;

  // Options type: 0x0003 (TYPE_3)
  view.setUint16(offset, 3);
  offset += 2;

  // Worker ID: 0x0001 (executor)
  view.setUint16(offset, 1);
  offset += 2;

  // Option data length: 1 (type) + 16 (gas) + 16 (value) = 33
  view.setUint16(offset, 33);
  offset += 2;

  // Option type: 0x01 (lzReceive)
  buf[offset] = 1;
  offset += 1;

  // Gas limit as uint128 (big-endian, 16 bytes)
  const gasBytes = bigintToBytes16(gasLimit);
  buf.set(gasBytes, offset);
  offset += 16;

  // Native value as uint128 (big-endian, 16 bytes)
  const valueBytes = bigintToBytes16(nativeValue);
  buf.set(valueBytes, offset);

  return buf;
}

/** Convert a bigint to a big-endian 16-byte Uint8Array. */
function bigintToBytes16(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(32, "0");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ----- Class -----

export class GenLayerToEvm {
  private glClient: ReturnType<typeof createClient>;
  private zkSyncProvider: ethers.JsonRpcProvider;
  private zkSyncWallet: ethers.Wallet;
  private forwarder: ethers.Contract;

  constructor() {
    this.glClient = createClient({
      chain: studionet,
      endpoint: config.GENLAYER_RPC_URL,
    });

    this.zkSyncProvider = new ethers.JsonRpcProvider(config.ZKSYNC_RPC_URL);
    this.zkSyncWallet = new ethers.Wallet(
      config.RELAY_PRIVATE_KEY,
      this.zkSyncProvider,
    );
    this.forwarder = new ethers.Contract(
      config.BRIDGE_FORWARDER,
      FORWARDER_ABI,
      this.zkSyncWallet,
    );
  }

  /**
   * Single relay iteration. Called on a cron schedule from the entry point.
   */
  async relay(): Promise<void> {
    // Step 1: Get all message hashes from BridgeSender on GenLayer
    const hashesRaw: CalldataEncodable = await this.glClient.readContract({
      address: config.BRIDGE_SENDER as `0x${string}`,
      functionName: "get_message_hashes",
      args: [],
    });

    const hashes = hashesRaw as string[];

    if (!hashes || hashes.length === 0) {
      console.log("[GenLayerToEvm] No messages in BridgeSender.");
      return;
    }

    console.log(
      `[GenLayerToEvm] Found ${hashes.length} message(s) in BridgeSender.`,
    );

    for (const hash of hashes) {
      try {
        await this.relayMessage(hash);
      } catch (err) {
        console.error(`[GenLayerToEvm] Failed to relay hash ${hash}:`, err);
      }
    }
  }

  /**
   * Relay a single message from GenLayer to zkSync (then onward to Base via LZ).
   */
  private async relayMessage(hash: string): Promise<void> {
    // Convert the hex hash string to a bytes32 for the Solidity contract.
    // BridgeSender stores hashes as hex strings (e.g. "abcdef1234...").
    // BridgeForwarder expects bytes32.
    const hashBytes32 = ethers.zeroPadValue(
      hash.startsWith("0x") ? hash : `0x${hash}`,
      32,
    );

    // Step 2: Check if this hash has already been relayed
    const isUsed: boolean = await this.forwarder.isHashUsed(hashBytes32);
    if (isUsed) return; // Already relayed, skip

    console.log(`[GenLayerToEvm] New message to relay: ${hash}`);

    // Step 3: Fetch full message data from BridgeSender
    const messageRaw: CalldataEncodable = await this.glClient.readContract({
      address: config.BRIDGE_SENDER as `0x${string}`,
      functionName: "get_message",
      args: [hash],
    });

    const message = messageRaw as {
      target_chain_id: number;
      target_contract: string;
      data: Uint8Array | string;
    };

    // Only process messages targeting our configured destination chain
    if (message.target_chain_id !== config.LZ_DST_EID) {
      console.log(
        `[GenLayerToEvm] Skipping hash ${hash}: target_chain_id=${message.target_chain_id} != ${config.LZ_DST_EID}`,
      );
      return;
    }

    // The message data is the ABI-encoded bridge envelope from BridgeSender.
    // It needs to be forwarded as-is through BridgeForwarder -> LZ -> BridgeReceiver.
    const messageData =
      message.data instanceof Uint8Array
        ? ethers.hexlify(message.data)
        : message.data;

    // Step 4: Build LayerZero V2 executor options
    // 1M gas for execution on Base, 0 native value forwarded
    const options = buildLzOptions(1_000_000n, 0n);
    const optionsHex = ethers.hexlify(options);

    // Step 5: Quote the LayerZero fee
    const [nativeFee] = await this.forwarder.quoteCallRemoteArbitrary(
      config.LZ_DST_EID,
      messageData,
      optionsHex,
    );

    console.log(
      `[GenLayerToEvm] LZ fee: ${ethers.formatEther(nativeFee)} ETH`,
    );

    // Step 6: Send via BridgeForwarder on zkSync
    const tx = await this.forwarder.callRemoteArbitrary(
      hashBytes32,
      config.LZ_DST_EID,
      messageData,
      optionsHex,
      { value: nativeFee },
    );

    console.log(`[GenLayerToEvm] Relayed tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(
      `[GenLayerToEvm] Confirmed in block ${receipt?.blockNumber}. Gas used: ${receipt?.gasUsed}`,
    );
  }
}
