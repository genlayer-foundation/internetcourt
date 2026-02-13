/**
 * Bridge Relay Service — entry point.
 *
 * Runs two subsystems:
 *   1. EvmToGenLayer — polls Base every N seconds for DisputeRequested events,
 *      deploys oracle contracts to GenLayer for AI jury evaluation.
 *   2. GenLayerToEvm — runs on a cron schedule, polls BridgeSender on GenLayer
 *      for new verdict messages and relays them through BridgeForwarder on
 *      zkSync to Base via LayerZero V2.
 *
 * Also exposes a minimal Express HTTP server with:
 *   GET /health — health check for Railway / uptime monitors
 */

import cron from "node-cron";
import express from "express";
import { EvmToGenLayer } from "./relay/EvmToGenLayer.js";
import { GenLayerToEvm } from "./relay/GenLayerToEvm.js";
import { config } from "./config.js";

// ----- Express server -----

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ----- Relay subsystems -----

const evmToGl = new EvmToGenLayer();
const glToEvm = new GenLayerToEvm();

// EvmToGenLayer: poll Base for DisputeRequested events on an interval
let evmPollRunning = false;

const evmPollTimer = setInterval(async () => {
  if (evmPollRunning) return; // Skip if previous poll still in progress
  evmPollRunning = true;
  try {
    await evmToGl.poll();
  } catch (err) {
    console.error("[EvmToGenLayer] Poll error:", err);
  } finally {
    evmPollRunning = false;
  }
}, config.EVM_POLL_INTERVAL);

// GenLayerToEvm: relay verdict messages on a cron schedule
const glRelayCron = cron.schedule(config.GL_RELAY_CRON, async () => {
  try {
    await glToEvm.relay();
  } catch (err) {
    console.error("[GenLayerToEvm] Relay error:", err);
  }
});

// ----- Start -----

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, () => {
  console.log("=".repeat(60));
  console.log("  Internet Court Bridge Relay Service");
  console.log("=".repeat(60));
  console.log(`  HTTP server:      http://0.0.0.0:${PORT}`);
  console.log(`  EVM poll:         every ${config.EVM_POLL_INTERVAL}ms`);
  console.log(`  GL relay cron:    ${config.GL_RELAY_CRON}`);
  console.log(`  Factory (Base):   ${config.FACTORY_ADDRESS}`);
  console.log(`  BridgeSender (GL): ${config.BRIDGE_SENDER}`);
  console.log(`  BridgeForwarder:  ${config.BRIDGE_FORWARDER}`);
  console.log(`  LZ dst EID:       ${config.LZ_DST_EID}`);
  console.log("=".repeat(60));
});

// ----- Graceful shutdown -----

function shutdown() {
  console.log("\n[Bridge] Shutting down...");
  clearInterval(evmPollTimer);
  glRelayCron.stop();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
