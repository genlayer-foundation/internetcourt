import "dotenv/config";

/**
 * Bridge relay service configuration.
 *
 * All values are sourced from environment variables.
 * Required vars must be set before the service starts.
 * Optional vars have sensible defaults.
 */
export const config = {
  // ---------- GenLayer ----------
  /** GenLayer JSON-RPC endpoint (e.g. https://studio.genlayer.com/api) */
  GENLAYER_RPC_URL: process.env.GENLAYER_RPC_URL!,
  /** BridgeSender contract address on GenLayer */
  BRIDGE_SENDER: process.env.BRIDGE_SENDER_ADDRESS!,

  // ---------- zkSync Era ----------
  /** zkSync Era JSON-RPC endpoint */
  ZKSYNC_RPC_URL: process.env.ZKSYNC_RPC_URL!,
  /** BridgeForwarder contract address on zkSync */
  BRIDGE_FORWARDER: process.env.BRIDGE_FORWARDER_ADDRESS!,

  // ---------- Base ----------
  /** Base JSON-RPC endpoint */
  BASE_RPC_URL: process.env.BASE_RPC_URL!,
  /** InternetCourtFactory contract address on Base */
  FACTORY_ADDRESS: process.env.FACTORY_ADDRESS!,

  // ---------- LayerZero ----------
  /** LayerZero destination Endpoint ID (30184 = Base mainnet) */
  LZ_DST_EID: parseInt(process.env.LZ_DST_EID || "30184"),

  // ---------- Wallet ----------
  /**
   * Relay service private key.
   * This wallet must have:
   *  - CALLER_ROLE on the BridgeForwarder contract
   *  - ETH on zkSync Era for LayerZero fees and gas
   */
  RELAY_PRIVATE_KEY: process.env.RELAY_PRIVATE_KEY!,

  // ---------- Paths ----------
  /** Path to the case_resolution.py oracle contract source */
  ORACLE_CONTRACT_PATH:
    process.env.ORACLE_CONTRACT_PATH ||
    "./contracts/bridge/case_resolution.py",

  // ---------- Timing ----------
  /** How often to poll Base for DisputeRequested events (ms) */
  EVM_POLL_INTERVAL: parseInt(process.env.EVM_POLL_INTERVAL || "5000"),
  /** Cron expression for GenLayer -> EVM relay runs */
  GL_RELAY_CRON: process.env.GL_RELAY_CRON || "*/5 * * * *",
} as const;
