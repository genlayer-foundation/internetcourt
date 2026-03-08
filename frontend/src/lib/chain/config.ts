import { base, baseSepolia } from "wagmi/chains";
import deployments from "../../../../bridge/deployments.json";

const rawEnv = (
  process.env.NEXT_PUBLIC_NETWORK_TYPE || ""
).trim().toLowerCase();

export const isMainnet = rawEnv === "mainnet";
export const baseChain = isMainnet ? base : baseSepolia;

export const BASE_CONFIG = {
  CHAIN: baseChain,
  RPC_URL:
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"),
};
