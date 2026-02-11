"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { NAV_LINKS } from "@/lib/constants";

const WalletButton = dynamic(() => import("./WalletButton"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-[10px] px-4 py-2.5 font-mono text-base text-foreground">
      Connect Wallet
    </div>
  ),
});

export function Header() {
  return (
    <header className="relative z-50 pt-4 px-4">
      <div className="bg-[#f7f7f7] rounded-2xl max-w-[1200px] mx-auto pl-3 pr-2 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/favicon.svg" alt="Internet Court" className="h-7 w-8 md:hidden" />
          <img src="/logos/tic-logo-red.svg" alt="Internet Court" className="h-7 hidden md:block" />
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-base text-foreground transition-colors hover:text-[#dc2626]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}
