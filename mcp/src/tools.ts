import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPublicClient, http, zeroAddress } from "viem";
import { base, baseSepolia } from "viem/chains";
import { z } from "zod";

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || "0x0cE49079fB4b0EDE327F2b8919f7aaD9C7dabE41") as `0x${string}`;
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
const chain = process.env.CHAIN === "base" ? base : baseSepolia;

const client = createPublicClient({ chain, transport: http(RPC_URL) });

const FACTORY_ABI = [
  { name: "nextAgreementId", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "agreements", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
] as const;

const AGREEMENT_ABI = [
  { name: "status", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "partyA", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "partyB", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "statement", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "guidelines", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "verdict", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { name: "reasoning", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "escrowAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "joinDeadline", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "evidenceDeadlineSeconds", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "disputeTimestamp", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "evidenceA", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "evidenceB", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "evidenceASubmitted", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "evidenceBSubmitted", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "maxEvidenceLength", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "constraints", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
  { name: "evidenceDefs", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "string" }] },
] as const;

const STATUS_NAMES = ["CREATED", "ACTIVE", "DISPUTED", "RESOLVING", "RESOLVED", "CANCELLED"];
const VERDICT_NAMES = ["UNDETERMINED", "TRUE", "FALSE"];

export function registerTools(server: McpServer) {
  // Tool 1: get_case
  server.tool(
    "get_case",
    "Get details of a specific Internet Court case by ID",
    { case_id: z.number().describe("The case ID (integer)") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });

      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const fields = ["status", "partyA", "partyB", "statement", "guidelines", "verdict", "reasoning",
        "escrowAmount", "joinDeadline", "evidenceDeadlineSeconds", "disputeTimestamp",
        "evidenceA", "evidenceB", "evidenceASubmitted", "evidenceBSubmitted",
        "maxEvidenceLength", "constraints", "evidenceDefs"] as const;

      const results = await Promise.all(
        fields.map(f => client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: f }))
      );

      const caseData: Record<string, any> = { id: case_id, address: addr };
      fields.forEach((f, i) => {
        const val = results[i];
        if (typeof val === "bigint") caseData[f] = val.toString();
        else caseData[f] = val;
      });
      caseData.statusName = STATUS_NAMES[Number(caseData.status)] || "UNKNOWN";
      caseData.verdictName = VERDICT_NAMES[Number(caseData.verdict)] || "UNKNOWN";

      return { content: [{ type: "text" as const, text: JSON.stringify(caseData, null, 2) }] };
    }
  );

  // Tool 2: list_cases
  server.tool(
    "list_cases",
    "List Internet Court cases with optional filtering",
    {
      page: z.number().optional().default(1).describe("Page number"),
      limit: z.number().optional().default(10).describe("Cases per page"),
      party: z.string().optional().describe("Filter by party address"),
    },
    async ({ page, limit, party }) => {
      const total = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "nextAgreementId",
      });
      const totalNum = Number(total);
      const start = Math.max(0, totalNum - page * limit);
      const end = Math.max(0, totalNum - (page - 1) * limit);

      const cases = [];
      for (let i = end - 1; i >= start; i--) {
        const addr = await client.readContract({
          address: FACTORY_ADDRESS, abi: FACTORY_ABI,
          functionName: "agreements", args: [BigInt(i)],
        });
        const [status, pA, pB, stmt, escrow] = await Promise.all([
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyA" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyB" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "statement" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "escrowAmount" }),
        ]);
        if (party && pA.toLowerCase() !== party.toLowerCase() && pB.toLowerCase() !== party.toLowerCase()) continue;
        cases.push({
          id: i, address: addr,
          status: Number(status), statusName: STATUS_NAMES[Number(status)],
          partyA: pA, partyB: pB, statement: stmt,
          escrowAmount: escrow.toString(),
        });
      }

      return { content: [{ type: "text" as const, text: JSON.stringify({ cases, total: totalNum, page, limit }, null, 2) }] };
    }
  );

  // Tool 3: check_deadline
  server.tool(
    "check_deadline",
    "Check if join or evidence deadline has passed for a case",
    { case_id: z.number().describe("The case ID") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });

      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const [status, joinDl, evidenceDl, disputeTs] = await Promise.all([
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "joinDeadline" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "disputeTimestamp" }),
      ]);
      const now = Math.floor(Date.now() / 1000);
      const result: Record<string, any> = { status: STATUS_NAMES[Number(status)] };
      const jd = Number(joinDl);
      if (jd > 0) {
        result.joinDeadline = { timestamp: jd, passed: now > jd, remainingSeconds: Math.max(0, jd - now) };
      }
      const ed = Number(evidenceDl);
      const dt = Number(disputeTs);
      if (ed > 0 && dt > 0) {
        const deadline = dt + ed;
        result.evidenceDeadline = { timestamp: deadline, passed: now > deadline, remainingSeconds: Math.max(0, deadline - now) };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
