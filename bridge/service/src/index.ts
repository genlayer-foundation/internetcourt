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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ----- Express server -----

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Minimal GenLayer metadata endpoint for docket fetching
// Reads bridge/service/data/genlayer.json written by EvmToGenLayer when an oracle finalizes
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const GL_META_FILE = path.join(DATA_DIR, "genlayer.json");

app.get("/cases/:agreement/gl", (req, res) => {
  try {
    const addr = String(req.params.agreement || "").toLowerCase();
    if (!addr || !addr.startsWith("0x") || addr.length !== 42) {
      return res.status(400).json({ error: "Invalid agreement address" });
    }
    if (!fs.existsSync(GL_META_FILE)) {
      return res.json({ entries: [] });
    }
    const raw = fs.readFileSync(GL_META_FILE, "utf-8");
    const map = JSON.parse(raw) as Record<string, any>;
    const m = map[addr];
    if (!m) return res.json({ entries: [] });

    const ts = Number(m.timestamp || Math.floor(Date.now() / 1000));
    const txHash = String(m.oracleTxHash || "");
    const verdict = String(m.verdict || "");
    const reasoning = String(m.reasoning || "");

    // Build minimal, readable entries (at most 3), consistent with existing UI
    const entries = [
      {
        action: "AI jury oracle deployed on GenLayer",
        txHash,
        blockNumber: 0,
        timestamp: ts,
        actor: null,
        details: null,
        evidence: null,
        source: "GenLayer",
        links: [] as Array<{ label: string; url: string }>,
      },
    ];

    if (verdict) {
      entries.push({
        action: `AI jury verdict: ${verdict}`,
        txHash,
        blockNumber: 0,
        timestamp: ts,
        actor: null,
        details: reasoning ? truncate(reasoning, 400) : null,
        evidence: null,
        source: "GenLayer",
        links: [],
      });
    }

    entries.push({
      action: "Verdict dispatched to bridge",
      txHash,
      blockNumber: 0,
      timestamp: ts,
      actor: null,
      details: "Message stored for relay to Base.",
      evidence: null,
      source: "GenLayer",
      links: [],
    });

    return res.json({ entries });
  } catch (e) {
    console.error("[/cases/:agreement/gl] error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
});

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

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
