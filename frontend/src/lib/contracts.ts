import { createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS ||
  "0x0cE49079fB4b0EDE327F2b8919f7aaD9C7dabE41") as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x16F8984440E9951eF3f54Da176A3F431E827e086") as `0x${string}`;

// Human-readable ABI fragments used by viem
export const AGREEMENT_ABI = parseAbi([
  "function status() view returns (uint8)",
  "function partyA() view returns (address)",
  "function partyB() view returns (address)",
  "function statement() view returns (string)",
  "function guidelines() view returns (string)",
  "function evidenceDefs() view returns (string)",
  "function evidenceA() view returns (string)",
  "function evidenceB() view returns (string)",
  "function evidenceASubmitted() view returns (bool)",
  "function evidenceBSubmitted() view returns (bool)",
  "function verdict() view returns (uint8)",
  "function reasoning() view returns (string)",
  "function escrowAmount() view returns (uint256)",
  "function joinDeadline() view returns (uint256)",
  "function evidenceDeadlineSeconds() view returns (uint256)",
  "function disputeTimestamp() view returns (uint256)",
  "function maxEvidenceLength() view returns (uint256)",
  "function constraints() view returns (string)",
  "function acceptAgreement()",
  "function submitEvidence(string)",
]);

export const FACTORY_ABI = parseAbi([
  "function createAgreement(address,string,string,string,uint256,address,uint256,uint256,uint256,string) returns (address)",
  "function nextAgreementId() view returns (uint256)",
  "function agreements(uint256) view returns (address)",
]);

export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const chain =
  process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export const STATUS_NAMES = [
  "CREATED",
  "ACTIVE",
  "DISPUTED",
  "RESOLVING",
  "RESOLVED",
  "CANCELLED",
];
export const VERDICT_NAMES = ["UNDETERMINED", "TRUE", "FALSE"];
