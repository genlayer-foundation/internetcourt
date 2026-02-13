#!/usr/bin/env node
/**
 * Verify factory using raw JSON-RPC (same method as the frontend API route)
 */

const RPC = "https://studio.genlayer.com/api";
const NEW_FACTORY = "0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738";
const OLD_FACTORY = "0xAA55c2768855A483b5D8C8926585Cdb940207898";

let rpcId = 0;
async function callView(address, method, args = []) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "gen_call",
      params: [{ to_address: address, function_name: method, function_args: args }],
      id: ++rpcId,
    }),
  });
  const data = await res.json();
  return data;
}

async function checkFactory(label, address) {
  console.log(`\n=== ${label}: ${address} ===`);

  const countRes = await callView(address, "get_contract_count", []);
  console.log("get_contract_count:", JSON.stringify(countRes.result ?? countRes.error));

  const count = countRes.result;
  if (count && Number(count) > 0) {
    for (let i = 1; i <= Number(count); i++) {
      const contractRes = await callView(address, "get_contract", [i]);
      console.log(`get_contract(${i}):`, JSON.stringify(contractRes.result ?? contractRes.error));
    }
  }

  const typeRes = await callView(address, "is_type_registered", ["internetcourt"]);
  console.log('is_type_registered("internetcourt"):', JSON.stringify(typeRes.result ?? typeRes.error));
}

async function main() {
  await checkFactory("OLD FACTORY", OLD_FACTORY);
  await checkFactory("NEW FACTORY", NEW_FACTORY);
}

main().catch(console.error);
