import { base, baseSepolia } from "wagmi/chains";

const rawEnv = (
  process.env.NEXT_PUBLIC_NETWORK_TYPE || ""
).trim().toLowerCase();

export const isMainnet = rawEnv === "mainnet";
export const baseChain = isMainnet ? base : baseSepolia;

export const BASE_CONFIG = {
  // TODO: move to env var once Vercel dashboard is updated
  FACTORY_CONTRACT: "0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E",
  CHAIN: baseChain,
  RPC_URL:
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"),
};
