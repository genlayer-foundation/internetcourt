#!/usr/bin/env node
/**
 * Quick check of factory state — what types and contracts are registered?
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const FACTORY = "0xAA55c2768855A483b5D8C8926585Cdb940207898";

const account = createAccount(generatePrivateKey());
const client = createClient({ chain: studionet, account });

async function read(fn, args = []) {
  try {
    return await client.readContract({ address: FACTORY, functionName: fn, args });
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

async function main() {
  console.log("Factory:", FACTORY);
  console.log();

  // Check contract count
  const count = await read("get_contract_count");
  console.log("Contract count:", count);

  // Check various type strings
  for (const type of ["internetcourt", "InternetCourt", "internetcourt-v1", "internet-court"]) {
    const registered = await read("is_type_registered", [type]);
    console.log(`Type "${type}" registered:`, registered);
  }

  // List all contracts
  console.log("\nAll contracts in factory:");
  const total = Number(count);
  for (let i = 1; i <= total; i++) {
    const contract = await read("get_contract", [i]);
    console.log(`  #${i}:`, JSON.stringify(contract));
  }

  // Try to get contracts by type
  console.log("\nContracts by type 'internetcourt':");
  const byType = await read("get_contracts_by_type", ["internetcourt"]);
  console.log("  Result:", JSON.stringify(byType));

  console.log("\nContracts by type 'InternetCourt':");
  const byType2 = await read("get_contracts_by_type", ["InternetCourt"]);
  console.log("  Result:", JSON.stringify(byType2));
}

main().catch(console.error);
