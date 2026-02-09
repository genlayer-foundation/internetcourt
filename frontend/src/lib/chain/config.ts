import { base, baseSepolia } from "wagmi/chains";

const rawEnv = (
  process.env.NEXT_PUBLIC_NETWORK_TYPE || ""
).trim().toLowerCase();

export const isMainnet = rawEnv === "mainnet";
export const baseChain = isMainnet ? base : baseSepolia;

export const BASE_CONFIG = {
  FACTORY_CONTRACT: process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS || "",
  CHAIN: baseChain,
  RPC_URL:
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"),
};
