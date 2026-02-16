import { createPublicClient, http, parseAbi } from "viem";
import { base, baseSepolia } from "viem/chains";
import {
  BASE_FACTORY_ADDRESS,
  MOCK_USDC_ADDRESS,
} from "./constants";

export const FACTORY_ADDRESS = BASE_FACTORY_ADDRESS;
export const USDC_ADDRESS = MOCK_USDC_ADDRESS;

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
  "function deploymentBlock() view returns (uint256)",
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

// Re-exported from constants for backward compatibility
export { STATUS_NAMES, VERDICT_NAMES } from "./constants";
