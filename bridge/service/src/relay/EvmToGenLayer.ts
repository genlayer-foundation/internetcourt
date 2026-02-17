/**
 * EvmToGenLayer relay — Base -> GenLayer direction.
 *
 * Polls the InternetCourtFactory on Base for DisputeRequested events.
 * When a new dispute is detected:
 *   1. Fetches all case data from the Agreement contract via free view calls.
 *   2. Deploys a single-use case_resolution.py oracle to GenLayer with the
 *      case data as constructor arguments.
 *   3. Waits for the oracle to finalize (up to 3 minutes).
 *
 * Processed disputes are persisted to a JSON file (bridge/service/data/processed.json)
 * so they survive service restarts. The in-memory Set is loaded from the file
 * on startup and written back after each successful processing.
 */

import { ethers } from "ethers";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { TransactionHash } from "genlayer-js/types";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

// ----- Persistence paths -----

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const PROCESSED_FILE = path.join(DATA_DIR, "processed.json");

// ----- ABIs (human-readable, ethers v6) -----

const AGREEMENT_ABI = [
  "function getStatement() view returns (string)",
  "function getGuidelines() view returns (string)",
  "function getEvidenceDefs() view returns (string)",
  "function getEvidenceA() view returns (string)",
  "function getEvidenceB() view returns (string)",
  "function getPartyA() view returns (address)",
  "function getPartyB() view returns (address)",
  "function statement() view returns (string)",
  "function escrowAmount() view returns (uint256)",
];

const FACTORY_ABI = [
  "event DisputeRequested(address indexed agreementAddress, uint256 timestamp)",
  "event AgreementCreated(uint256 indexed id, address agreementAddress, address partyA, address partyB)",
];

// ----- Constants -----

/** How far back to look on first run (~30 min of Base blocks at 2s/block) */
const INITIAL_LOOKBACK_BLOCKS = 1000;

/** Maximum time to wait for oracle finalization (ms) */
const MAX_FINALIZATION_WAIT_MS = 3 * 60 * 1000; // 3 minutes

/** Polling interval when waiting for finalization (ms) */
const FINALIZATION_POLL_MS = 3000;

// ----- Class -----

export class EvmToGenLayer {
  private baseProvider: ethers.JsonRpcProvider;
  private factory: ethers.Contract;
  private glClient: ReturnType<typeof createClient>;
  private lastBlock: number = 0;
  private processedDisputes: Set<string>;
  private registeredCases: Set<string> = new Set();

  constructor() {
    this.baseProvider = new ethers.JsonRpcProvider(config.BASE_RPC_URL);
    this.factory = new ethers.Contract(
      config.FACTORY_ADDRESS,
      FACTORY_ABI,
      this.baseProvider,
    );

    // Build GenLayer client with the relay wallet account so we can deploy
    const account = createAccount(config.RELAY_PRIVATE_KEY as `0x${string}`);
    this.glClient = createClient({
      chain: studionet,
      endpoint: config.GENLAYER_RPC_URL,
      account,
    });

    // Load previously processed disputes from disk
    this.processedDisputes = this.loadProcessed();
  }

  // ----- Persistence helpers -----

  /**
   * Load processed dispute addresses from the JSON file on disk.
   * Returns an empty Set if the file doesn't exist or is corrupt.
   */
  private loadProcessed(): Set<string> {
    try {
      if (fs.existsSync(PROCESSED_FILE)) {
        const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8"));
        console.log(
          `[EvmToGenLayer] Loaded ${data.length} processed disputes from ${PROCESSED_FILE}`,
        );
        return new Set(data);
      }
    } catch (e) {
      console.warn(
        "[EvmToGenLayer] Could not load processed file, starting fresh:",
        e,
      );
    }
    return new Set();
  }

  /**
   * Persist the current set of processed dispute addresses to disk.
   * Creates the data directory if it doesn't exist.
   */
  private saveProcessed(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      PROCESSED_FILE,
      JSON.stringify([...this.processedDisputes], null, 2),
    );
  }

  /**
   * Single poll iteration. Called on a setInterval from the entry point.
   */
  async poll(): Promise<void> {
    const currentBlock = await this.baseProvider.getBlockNumber();

    if (this.lastBlock === 0) {
      // On first run, look back a reasonable distance
      this.lastBlock = Math.max(0, currentBlock - INITIAL_LOOKBACK_BLOCKS);
    }

    if (currentBlock < this.lastBlock) return; // chain re-org safety

    // Query for DisputeRequested events in the block range
    const filter = this.factory.filters.DisputeRequested();
    const events = await this.factory.queryFilter(
      filter,
      this.lastBlock,
      currentBlock,
    );

    for (const event of events) {
      const log = event as ethers.EventLog;
      const agreementAddress: string = log.args[0];

      if (this.processedDisputes.has(agreementAddress)) continue;

      console.log(
        `[EvmToGenLayer] New dispute detected: ${agreementAddress} (block ${log.blockNumber})`,
      );

      try {
        await this.processDispute(agreementAddress);
        this.processedDisputes.add(agreementAddress);
        this.saveProcessed();
      } catch (err) {
        console.error(
          `[EvmToGenLayer] Failed to process dispute ${agreementAddress}:`,
          err,
        );
      }
    }

    // Query for AgreementCreated events in the same block range
    const createdFilter = this.factory.filters.AgreementCreated();
    const createdEvents = await this.factory.queryFilter(
      createdFilter,
      this.lastBlock,
      currentBlock,
    );

    for (const event of createdEvents) {
      const log = event as ethers.EventLog;
      const caseId = Number(log.args[0]);
      const agreementAddress: string = log.args[1];
      const partyA: string = log.args[2];
      const partyB: string = log.args[3];

      if (this.registeredCases.has(agreementAddress)) continue;

      console.log(
        `[EvmToGenLayer] New agreement detected: ${agreementAddress} (case #${caseId}, block ${log.blockNumber})`,
      );

      try {
        await this.registerCase(caseId, agreementAddress, partyA, partyB);
        this.registeredCases.add(agreementAddress);
      } catch (err) {
        console.error(
          `[EvmToGenLayer] Failed to register case ${agreementAddress}:`,
          err,
        );
      }
    }

    this.lastBlock = currentBlock + 1;
  }

  /**
   * Fetch case data from Base and deploy the oracle to GenLayer.
   */
  private async processDispute(agreementAddress: string): Promise<void> {
    const agreement = new ethers.Contract(
      agreementAddress,
      AGREEMENT_ABI,
      this.baseProvider,
    );

    // Fetch all case data via free view calls (zero gas cost)
    console.log(`[EvmToGenLayer] Fetching case data for ${agreementAddress}...`);

    const [statement, guidelines, evidenceDefs, evidenceA, evidenceB] =
      await Promise.all([
        agreement.getStatement() as Promise<string>,
        agreement.getGuidelines() as Promise<string>,
        agreement.getEvidenceDefs() as Promise<string>,
        agreement.getEvidenceA() as Promise<string>,
        agreement.getEvidenceB() as Promise<string>,
      ]);

    console.log(
      `[EvmToGenLayer] Case data fetched. Statement: "${statement.slice(0, 80)}..."`,
    );

    // Read the oracle contract source
    const oracleCode = fs.readFileSync(config.ORACLE_CONTRACT_PATH, "utf-8");

    // Deploy single-use oracle to GenLayer.
    // Constructor args must match case_resolution.py __init__ signature:
    //   agreement_address, statement, guidelines, evidence_a, evidence_b,
    //   evidence_defs, bridge_sender, target_chain_eid, target_contract
    console.log(
      `[EvmToGenLayer] Deploying oracle to GenLayer for ${agreementAddress}...`,
    );

    const txHash = await this.glClient.deployContract({
      code: oracleCode,
      args: [
        agreementAddress, // agreement_address (str)
        statement, // statement (str)
        guidelines, // guidelines (str)
        evidenceA, // evidence_a (str)
        evidenceB, // evidence_b (str)
        evidenceDefs, // evidence_defs (str)
        config.BRIDGE_SENDER, // bridge_sender (str)
        config.LZ_DST_EID, // target_chain_eid (int)
        config.FACTORY_ADDRESS, // target_contract (str)
      ],
    });

    console.log(`[EvmToGenLayer] Oracle deploy tx: ${txHash}`);

    // Wait for the oracle transaction to finalize (up to 3 minutes).
    // The oracle runs its AI evaluation in the constructor, so finalization
    // means the verdict has been produced and sent to BridgeSender.
    const maxIterations = Math.ceil(
      MAX_FINALIZATION_WAIT_MS / FINALIZATION_POLL_MS,
    );

    for (let i = 0; i < maxIterations; i++) {
      try {
        const tx = await this.glClient.getTransaction({ hash: txHash as TransactionHash });

        if (tx.statusName === "FINALIZED") {
          console.log(`[EvmToGenLayer] Oracle finalized: ${txHash}`);
          return;
        }

        if (tx.statusName === "CANCELED") {
          console.error(`[EvmToGenLayer] Oracle was canceled: ${txHash}`);
          return;
        }

        // Check for terminal failure states
        if (
          tx.statusName === "UNDETERMINED" ||
          tx.resultName === "FAILURE" ||
          tx.resultName === "DISAGREE" ||
          tx.resultName === "DETERMINISTIC_VIOLATION"
        ) {
          console.error(
            `[EvmToGenLayer] Oracle failed with status=${tx.statusName} result=${tx.resultName}: ${txHash}`,
          );
          return;
        }
      } catch {
        // getTransaction may throw if the tx is too new
      }

      await new Promise((r) => setTimeout(r, FINALIZATION_POLL_MS));
    }

    console.error(
      `[EvmToGenLayer] Oracle did not finalize within ${MAX_FINALIZATION_WAIT_MS / 1000}s: ${txHash}`,
    );
  }

  /**
   * Read case data from Base and register it on the GenLayer factory.
   */
  private async registerCase(
    caseId: number,
    agreementAddress: string,
    partyA: string,
    partyB: string,
  ): Promise<void> {
    // Read case data from Base
    const agreement = new ethers.Contract(
      agreementAddress,
      AGREEMENT_ABI,
      this.baseProvider,
    );

    const [statement, escrowAmount] = await Promise.all([
      agreement.statement() as Promise<string>,
      agreement.escrowAmount() as Promise<bigint>,
    ]);

    // Register on GenLayer factory
    const params = JSON.stringify({
      chain_id: 84532,
      chain_name: "base-sepolia",
      base_factory: config.FACTORY_ADDRESS,
      factory_id: caseId,
      statement,
      party_a: partyA,
      party_b: partyB,
      escrow_amount: escrowAmount.toString(),
    });

    console.log(
      `[EvmToGenLayer] Registering case ${caseId} on GenLayer: ${agreementAddress}`,
    );

    const txHash = await this.glClient.writeContract({
      address: config.GL_FACTORY_ADDRESS as `0x${string}`,
      functionName: "register_contract",
      args: [agreementAddress, "internetcourt", params],
      value: 0n,
    });

    console.log(`[EvmToGenLayer] Registration tx: ${txHash}`);
  }
}
