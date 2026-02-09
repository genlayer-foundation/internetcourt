"use client";

import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { baseChain, BASE_CONFIG } from "./config";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "moltcourt-dev";

const connectors =
  typeof window !== "undefined"
    ? connectorsForWallets(
        [
          {
            groupName: "Recommended",
            wallets: [
              metaMaskWallet,
              coinbaseWallet,
              walletConnectWallet,
              rainbowWallet,
            ],
          },
        ],
        { appName: "moltcourt.ai", projectId },
      )
    : [];

export const wagmiConfig = createConfig({
  connectors,
  chains: [baseChain],
  transports: {
    [base.id]: http(BASE_CONFIG.RPC_URL),
    [baseSepolia.id]: http(BASE_CONFIG.RPC_URL),
  },
  ssr: true,
});
