import { base, baseSepolia } from "wagmi/chains";
import deployments from "../../../../bridge/deployments.json";

const rawEnv = (
  process.env.NEXT_PUBLIC_NETWORK_TYPE || ""
).trim().toLowerCase();

export const isMainnet = rawEnv === "mainnet";
export const baseChain = isMainnet ? base : baseSepolia;

export const BASE_CONFIG = {
  // TODO: move to env var once Vercel dashboard is updated
  FACTORY_CONTRACT: "0xb981298fb5E1D27ade6f88014C2f24c30137BC9a",
  CHAIN: baseChain,
  RPC_URL:
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    (isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org"),
};
