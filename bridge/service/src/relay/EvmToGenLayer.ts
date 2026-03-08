/**
 * EvmToGenLayer relay — Base → GenLayer direction.
 *
 * Polls InternetCourtFactory on Base for DisputeRequested events.
 * For each new case:
 *   1. Reads IResolutionTarget.getOracleType() from the case contract.
 *   2. Looks up the oracle source + arg decoder in ORACLE_REGISTRY.
 *   3. Reads IResolutionTarget.getOracleArgs() and decodes per-type.
 *   4. Deploys the oracle to GenLayer with the decoded args + bridge config.
 *   5. Waits for finalization (up to MAX_FINALIZATION_WAIT_MS).
 *
 * Adding a new case type requires only:
 *   - A new entry in ORACLE_REGISTRY (oracle source path + arg decoder)
 *   - No changes to the relay's core dispatch logic
 */

import { ethers } from "ethers";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR       = path.resolve(__dirname, "../../data");
const PROCESSED_FILE = path.join(DATA_DIR, "processed.json");
const GL_META_FILE   = path.join(DATA_DIR, "genlayer.json");

// ── Oracle type identifiers — must match keccak256() in Solidity ──────────────

const ORACLE_TYPE_AGENT_DISPUTE  = ethers.id("AGENT_DISPUTE_V1");
const ORACLE_TYPE_TRADE_FINANCE  = ethers.id("TRADE_FINANCE_V1");

// ── Oracle registry ───────────────────────────────────────────────────────────
//
// Each entry maps an oracle type bytes32 → {
//   sourcePath: path to the GenLayer Python oracle (relative to service root)
//   decodeArgs: function that ABI-decodes getOracleArgs() bytes into a plain array
//               suitable for glClient.deployContract({ args: [...] })
// }
//
// The relay appends bridge_sender, target_chain_eid, and target_contract
// (the factory address) to every oracle's args from config. Each oracle's
// __init__ must accept these as its final three parameters.

type OracleEntry = {
  sourcePath: string;
  decodeArgs: (encoded: string) => unknown[];
};

const ORACLE_REGISTRY: Record<string, OracleEntry> = {

  // ── Agent dispute — deploys case_resolution.py ────────────────────────────
  // getOracleArgs() returns: abi.encode(address agreementAddress, string statement,
  //   string guidelines, string evidenceA, string evidenceB, string evidenceDefs)
  [ORACLE_TYPE_AGENT_DISPUTE]: {
    sourcePath: "./contracts/bridge/case_resolution.py",
    decodeArgs: (encoded) => {
      const [agreementAddress, statement, guidelines, evidenceA, evidenceB, evidenceDefs] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["address", "string", "string", "string", "string", "string"],
          encoded,
        );
      return [agreementAddress, statement, guidelines, evidenceA, evidenceB, evidenceDefs];
    },
  },

  // ── Trade Finance — deploys ShipmentDeadlineCourt.py ─────────────────────
  // getOracleArgs() returns: abi.encode(string caseId, address settlementContract,
  //   string statement, string guidelineVersion, string sheetACid, string sheetBCid)
  [ORACLE_TYPE_TRADE_FINANCE]: {
    sourcePath: "./contracts/bridge/ShipmentDeadlineCourt.py",
    decodeArgs: (encoded) => {
      const [caseId, settlementContract, statement, guidelineVersion, sheetACid, sheetBCid] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["string", "address", "string", "string", "string", "string"],
          encoded,
        );
      return [caseId, settlementContract, statement, guidelineVersion, sheetACid, sheetBCid];
    },
  },
};

// ── ABIs ──────────────────────────────────────────────────────────────────────

const FACTORY_ABI = [
  "event DisputeRequested(address indexed agreementAddress, uint256 timestamp)",
];

const RESOLUTION_TARGET_ABI = [
  "function getOracleType() view returns (bytes32)",
  "function getOracleArgs() view returns (bytes)",
];

// ── Timing ────────────────────────────────────────────────────────────────────

const INITIAL_LOOKBACK_BLOCKS  = 2000;  // ~60 min of Base blocks at 2s/block
const MAX_FINALIZATION_WAIT_MS = 6 * 60 * 1000; // 6 minutes
const FINALIZATION_POLL_MS     = 5000;

// ── Class ─────────────────────────────────────────────────────────────────────

export class EvmToGenLayer {
  private baseProvider: ethers.JsonRpcProvider;
  private factory: ethers.Contract;
  private glClient: ReturnType<typeof createClient>;
  private lastBlock: number = 0;
  private processedDisputes: Set<string>;

  constructor() {
    this.baseProvider = new ethers.JsonRpcProvider(config.BASE_RPC_URL);
    this.factory = new ethers.Contract(config.FACTORY_ADDRESS, FACTORY_ABI, this.baseProvider);

    const account = createAccount(config.RELAY_PRIVATE_KEY as `0x${string}`);
    this.glClient = createClient({ chain: studionet, endpoint: config.GENLAYER_RPC_URL, account });

    this.processedDisputes = this.loadProcessed();
  }

  // ── Poll ─────────────────────────────────────────────────────────────────

  async poll(): Promise<void> {
    const currentBlock = await this.baseProvider.getBlockNumber();

    if (this.lastBlock === 0) {
      this.lastBlock = Math.max(0, currentBlock - INITIAL_LOOKBACK_BLOCKS);
    }
    if (currentBlock < this.lastBlock) return;

    const events = await this.factory.queryFilter(
      this.factory.filters.DisputeRequested(),
      this.lastBlock,
      currentBlock,
    );

    for (const event of events) {
      const log = event as ethers.EventLog;
      const caseAddress: string = log.args[0];

      if (this.processedDisputes.has(caseAddress.toLowerCase())) continue;

      console.log(`[EvmToGenLayer] DisputeRequested: ${caseAddress} (block ${log.blockNumber})`);

      try {
        await this.processCase(caseAddress);
        this.processedDisputes.add(caseAddress.toLowerCase());
        this.saveProcessed();
      } catch (err) {
        console.error(`[EvmToGenLayer] Failed to process ${caseAddress}:`, err);
      }
    }

    this.lastBlock = currentBlock + 1;
  }

  // ── Core dispatch ─────────────────────────────────────────────────────────

  private async processCase(caseAddress: string): Promise<void> {
    const caseContract = new ethers.Contract(caseAddress, RESOLUTION_TARGET_ABI, this.baseProvider);

    // 1. Read oracle type
    const oracleType: string = await caseContract.getOracleType();
    const entry = ORACLE_REGISTRY[oracleType];

    if (!entry) {
      console.error(
        `[EvmToGenLayer] Unknown oracle type ${oracleType} for ${caseAddress}. ` +
        `Add it to ORACLE_REGISTRY. Skipping.`,
      );
      return;
    }

    console.log(`[EvmToGenLayer] Oracle type: ${oracleType === ORACLE_TYPE_TRADE_FINANCE
      ? "TRADE_FINANCE_V1" : "AGENT_DISPUTE_V1"}`);

    // 2. Read encoded oracle args from case contract
    const encodedArgs: string = await caseContract.getOracleArgs();

    // 3. Decode per oracle type
    const caseArgs = entry.decodeArgs(encodedArgs);

    // 4. Load oracle source
    const oraclePath = path.resolve(__dirname, "../..", entry.sourcePath);
    const oracleCode = fs.readFileSync(oraclePath, "utf-8");

    // 5. Build final args: [...caseArgs, bridge_sender, target_chain_eid, target_contract]
    //    All oracle __init__ functions accept these three as their last parameters.
    const fullArgs = [
      ...caseArgs,
      config.BRIDGE_SENDER,   // bridge_sender (str)
      config.LZ_DST_EID,      // target_chain_eid (int)
      config.FACTORY_ADDRESS, // target_contract — factory receives the verdict
    ];

    console.log(`[EvmToGenLayer] Deploying oracle for ${caseAddress}...`);
    console.log(`[EvmToGenLayer] Oracle: ${path.basename(entry.sourcePath)}`);

    // 6. Deploy to GenLayer
    const txHash = await this.glClient.deployContract({
      code: oracleCode,
      args: fullArgs as any,
      leaderOnly: false,
    });

    console.log(`[EvmToGenLayer] Deploy tx: ${txHash}`);
    console.log(`[EvmToGenLayer] Explorer: https://explorer-studio.genlayer.com/transactions/${txHash}`);
    console.log(`[EvmToGenLayer] Waiting for AI jury consensus...`);

    // 7. Wait for finalization
    await this.waitForFinalization(txHash as TransactionHash, caseAddress);
  }

  // ── Finalization wait ─────────────────────────────────────────────────────

  private async waitForFinalization(txHash: TransactionHash, caseAddress: string): Promise<void> {
    const maxIter = Math.ceil(MAX_FINALIZATION_WAIT_MS / FINALIZATION_POLL_MS);

    for (let i = 0; i < maxIter; i++) {
      await sleep(FINALIZATION_POLL_MS);

      try {
        const tx = await this.glClient.getTransaction({ hash: txHash });

        if (tx.statusName === "FINALIZED") {
          console.log(`[EvmToGenLayer] ✅ Oracle finalized: ${txHash}`);
          await this.persistGlMeta(txHash as string, tx, caseAddress);
          return;
        }

        if (tx.statusName === "CANCELED") {
          console.error(`[EvmToGenLayer] Oracle canceled: ${txHash}`);
          return;
        }

        if (["UNDETERMINED", "FAILURE", "DISAGREE", "DETERMINISTIC_VIOLATION"].includes(
          tx.statusName ?? tx.resultName ?? "",
        )) {
          console.error(
            `[EvmToGenLayer] Oracle failed: status=${tx.statusName} result=${tx.resultName}`,
          );
          return;
        }

        if (i % 6 === 0) {
          console.log(`[EvmToGenLayer]   [${i * FINALIZATION_POLL_MS / 1000}s] status=${tx.statusName}`);
        }
      } catch {
        // tx may not be indexed yet — keep polling
      }
    }

    console.error(
      `[EvmToGenLayer] Oracle did not finalize within ${MAX_FINALIZATION_WAIT_MS / 1000}s: ${txHash}`,
    );
  }

  // ── Metadata persistence ──────────────────────────────────────────────────

  private async persistGlMeta(txHash: string, tx: any, caseAddress: string): Promise<void> {
    try {
      // Oracle address is in tx.data.contract_address
      const oracleAddress: string | null =
        tx?.data?.contract_address ?? tx?.to_address ?? null;

      // Read verdict from oracle contract state.
      // gen_call with empty msgpack dict (0x80) triggers a controlled error whose
      // error.data.receipt.contract_state contains the full class variable state.
      let verdict = "";
      let reasoning = "";
      if (oracleAddress) {
        try {
          const res = await fetch(
            process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0", id: 1,
                method: "gen_call",
                params: [{ type: "read", to: oracleAddress, from: "0x0000000000000000000000000000000000000000", data: "0x80" }],
              }),
              signal: AbortSignal.timeout(15_000),
            },
          );
          const data = await res.json() as any;
          // Contract state comes back in error.data.receipt.contract_state (base64-encoded values)
          const contractState: Record<string, string> =
            data?.error?.data?.receipt?.contract_state ?? {};

          for (const encoded of Object.values(contractState)) {
            try {
              const decoded = Buffer.from(encoded, "base64").toString("utf-8").replace(/\0/g, "").trim();
              if (decoded === "TIMELY" || decoded === "LATE" || decoded === "UNDETERMINED") {
                verdict = decoded;
              } else if (decoded.length > 20 && !decoded.startsWith("#") && !decoded.startsWith("0x") && !decoded.startsWith("Qm") && !decoded.startsWith("shipment")) {
                // Heuristic: long readable string that isn't code/CID/metadata = reasoning
                if (decoded.length > reasoning.length) reasoning = decoded;
              }
            } catch { /* skip non-utf8 */ }
          }
        } catch (e) {
          console.warn("[EvmToGenLayer] Could not read oracle state:", e);
        }
      }

      const meta = this.loadGlMeta();
      meta[caseAddress.toLowerCase()] = {
        oracleTxHash:  txHash,
        oracleAddress: oracleAddress ?? null,
        verdict:       verdict || null,
        reasoning:     reasoning || null,
        timestamp:     Math.floor(Date.now() / 1000),
      };
      this.saveGlMeta(meta);
      console.log(`[EvmToGenLayer] Saved GL metadata for ${caseAddress}`);
    } catch (e) {
      console.warn("[EvmToGenLayer] Could not persist GL metadata:", e);
    }
  }

  // ── Disk persistence ──────────────────────────────────────────────────────

  private loadProcessed(): Set<string> {
    try {
      if (fs.existsSync(PROCESSED_FILE)) {
        const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8"));
        console.log(`[EvmToGenLayer] Loaded ${data.length} processed cases`);
        return new Set(data);
      }
    } catch (e) {
      console.warn("[EvmToGenLayer] Could not load processed file, starting fresh:", e);
    }
    return new Set();
  }

  private saveProcessed(): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...this.processedDisputes], null, 2));
  }

  private loadGlMeta(): Record<string, any> {
    try {
      if (fs.existsSync(GL_META_FILE)) {
        return JSON.parse(fs.readFileSync(GL_META_FILE, "utf-8"));
      }
    } catch { /* empty */ }
    return {};
  }

  private saveGlMeta(meta: Record<string, any>): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = GL_META_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2));
    fs.renameSync(tmp, GL_META_FILE);
  }
}

// ── GenLayer raw JSON-RPC ─────────────────────────────────────────────────────

async function glCall<T = unknown>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(
      process.env.GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.result as T) ?? null;
  } catch {
    return null;
  }
}
