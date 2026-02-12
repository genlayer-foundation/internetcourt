"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div
            {...(!mounted
              ? {
                  "aria-hidden": true,
                  style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
                }
              : { className: "contents" })}
          >
            {connected ? (
              <button
                onClick={openAccountModal}
                className="bg-white rounded-lg px-4 py-2.5 font-mono text-sm text-foreground flex items-center gap-3 transition-colors hover:bg-[#DC2626] hover:text-white"
              >
                <span className="text-muted-foreground">{account.displayBalance}</span>
                <span className="flex items-center gap-1.5">
                  {account.ensAvatar && (
                    <img src={account.ensAvatar} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  {account.displayName}
                </span>
              </button>
            ) : (
              <button
                onClick={openConnectModal}
                className="bg-white rounded-lg px-4 py-2.5 font-mono text-base text-foreground transition-colors hover:bg-[#DC2626] hover:text-white"
              >
                Connect Wallet
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
