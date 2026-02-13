#!/usr/bin/env node
/**
 * Verify factory via genlayer-js SDK (same as frontend uses)
 */

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const NEW_FACTORY = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";
const OLD_FACTORY = "0xAA55c2768855A483b5D8C8926585Cdb940207898";

const client = createClient({ chain: studionet });

async function readView(address, fn, args = []) {
  try {
    const result = await client.readContract({ address, functionName: fn, args });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e.message?.substring(0, 200) };
  }
}

async function checkFactory(label, address) {
  console.log(`\n=== ${label}: ${address} ===`);

  const count = await readView(address, "get_contract_count");
  console.log("get_contract_count:", JSON.stringify(count, (_, v) => typeof v === "bigint" ? v.toString() : v));

  if (count.ok && Number(count.result) > 0) {
    const total = Number(count.result);
    for (let i = 1; i <= total; i++) {
      const c = await readView(address, "get_contract", [i]);
      console.log(`get_contract(${i}):`, JSON.stringify(c, (_, v) => typeof v === "bigint" ? v.toString() : v));
    }
  }

  const typeCheck = await readView(address, "is_type_registered", ["internetcourt"]);
  console.log('is_type_registered("internetcourt"):', JSON.stringify(typeCheck, (_, v) => typeof v === "bigint" ? v.toString() : v));

  if (count.ok && Number(count.result) > 0) {
    const byType = await readView(address, "get_contracts_by_type", ["internetcourt"]);
    console.log('get_contracts_by_type("internetcourt"):', JSON.stringify(byType, (_, v) => typeof v === "bigint" ? v.toString() : v));
  }
}

async function main() {
  await checkFactory("OLD FACTORY", OLD_FACTORY);
  await checkFactory("NEW FACTORY", NEW_FACTORY);
}

main().catch(console.error);
