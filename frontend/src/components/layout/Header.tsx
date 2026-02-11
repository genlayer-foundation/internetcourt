"use client";

import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS } from "@/lib/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="relative z-50 pt-4 px-4">
      <div className="bg-[#f7f7f7] rounded-2xl max-w-[1200px] mx-auto px-3 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logos/internetcourt-logo.jpg"
            alt="Internet Court logo"
            width={28}
            height={28}
            className="rounded"
            unoptimized
          />
          <span className="font-heading text-lg font-bold tracking-tight text-[#dc2626] hidden sm:inline">
            Internet Court
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="bg-white rounded-[10px] px-4 py-2.5">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
