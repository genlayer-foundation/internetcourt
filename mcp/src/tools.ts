import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPublicClient, http, zeroAddress, encodeFunctionData, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";
import { z } from "zod";

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || "0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E") as `0x${string}`;
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

const USDC_ADDRESS = (process.env.USDC_ADDRESS || "0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3") as `0x${string}`;

const FACTORY_WRITE_ABI = parseAbi([
  "function createAgreement(address,string,string,string,uint256,address,uint256,uint256,uint256,string) returns (address)",
]);

const AGREEMENT_WRITE_ABI = parseAbi([
  "function acceptAgreement()",
  "function submitEvidence(string)",
  "function proposeOutcome(uint8)",
  "function raiseDispute()",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

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

  // ──── Write Tools (return prepared transaction data) ────

  // Tool 4: prepare_create_case
  server.tool(
    "prepare_create_case",
    "Prepare transactions to create a new Internet Court case with USDC escrow",
    {
      party_b: z.string().describe("Address of the counterparty (0x...)"),
      statement: z.string().describe("The claim to be evaluated as true/false"),
      guidelines: z.string().describe("Rules for how the AI jury should evaluate"),
      evidence_defs: z.string().describe("JSON string of evidence type definitions"),
      evidence_deadline_seconds: z.number().default(86400).describe("Evidence submission window in seconds (default: 24h)"),
      escrow_amount: z.string().default("0").describe("USDC escrow amount in base units (6 decimals, e.g. '1000000000' for 1000 USDC)"),
      join_deadline: z.number().default(0).describe("Unix timestamp by which party B must accept (0 = no deadline)"),
      max_evidence_length: z.number().default(0).describe("Max evidence length in bytes (0 = no limit)"),
      constraints: z.string().default("").describe("Additional constraints string"),
    },
    async ({ party_b, statement, guidelines, evidence_defs, evidence_deadline_seconds, escrow_amount, join_deadline, max_evidence_length, constraints }) => {
      const transactions: { step: number; description: string; to: string; data: string; value: string }[] = [];
      const escrow = BigInt(escrow_amount);

      if (escrow > 0n) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [FACTORY_ADDRESS, escrow],
        });
        transactions.push({
          step: 1,
          description: "Approve USDC spending by factory",
          to: USDC_ADDRESS,
          data: approveData,
          value: "0",
        });
      }

      const createData = encodeFunctionData({
        abi: FACTORY_WRITE_ABI,
        functionName: "createAgreement",
        args: [
          party_b as `0x${string}`,
          statement,
          guidelines,
          evidence_defs,
          BigInt(evidence_deadline_seconds),
          escrow > 0n ? USDC_ADDRESS : zeroAddress,
          escrow,
          BigInt(join_deadline),
          BigInt(max_evidence_length),
          constraints,
        ],
      });
      transactions.push({
        step: transactions.length + 1,
        description: "Create the agreement",
        to: FACTORY_ADDRESS,
        data: createData,
        value: "0",
      });

      return { content: [{ type: "text" as const, text: JSON.stringify({ transactions }, null, 2) }] };
    }
  );

  // Tool 5: prepare_join_case
  server.tool(
    "prepare_join_case",
    "Prepare transaction to join an existing case as Party B",
    { case_id: z.number().describe("The case ID to join") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });
      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const data = encodeFunctionData({
        abi: AGREEMENT_WRITE_ABI,
        functionName: "acceptAgreement",
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          transactions: [{ step: 1, description: "Join the agreement as Party B", to: addr, data, value: "0" }],
        }, null, 2) }],
      };
    }
  );

  // Tool 6: prepare_submit_evidence
  server.tool(
    "prepare_submit_evidence",
    "Prepare transaction to submit evidence to a case",
    {
      case_id: z.number().describe("The case ID"),
      evidence: z.string().describe("The evidence string to submit"),
    },
    async ({ case_id, evidence }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });
      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const data = encodeFunctionData({
        abi: AGREEMENT_WRITE_ABI,
        functionName: "submitEvidence",
        args: [evidence],
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          transactions: [{ step: 1, description: "Submit evidence to the agreement", to: addr, data, value: "0" }],
        }, null, 2) }],
      };
    }
  );

  // Tool 7: prepare_propose_outcome
  server.tool(
    "prepare_propose_outcome",
    "Prepare transaction to propose an outcome for a case (1=TRUE, 2=FALSE)",
    {
      case_id: z.number().describe("The case ID"),
      verdict: z.number().min(1).max(2).describe("Proposed verdict: 1=TRUE, 2=FALSE"),
    },
    async ({ case_id, verdict }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });
      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const data = encodeFunctionData({
        abi: AGREEMENT_WRITE_ABI,
        functionName: "proposeOutcome",
        args: [verdict],
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          transactions: [{ step: 1, description: `Propose outcome ${VERDICT_NAMES[verdict]} for the case`, to: addr, data, value: "0" }],
        }, null, 2) }],
      };
    }
  );

  // Tool 8: prepare_raise_dispute
  server.tool(
    "prepare_raise_dispute",
    "Prepare transaction to raise a dispute on a case",
    { case_id: z.number().describe("The case ID") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });
      if (addr === zeroAddress) {
        return { content: [{ type: "text" as const, text: `Error: case ${case_id} does not exist` }], isError: true };
      }

      const data = encodeFunctionData({
        abi: AGREEMENT_WRITE_ABI,
        functionName: "raiseDispute",
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          transactions: [{ step: 1, description: "Raise a dispute on the agreement", to: addr, data, value: "0" }],
        }, null, 2) }],
      };
    }
  );
}
