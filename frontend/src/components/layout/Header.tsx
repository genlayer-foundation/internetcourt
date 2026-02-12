"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";

const WalletButton = dynamic(() => import("./WalletButton"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg px-4 py-2.5 font-mono text-base text-foreground">
      Connect Wallet
    </div>
  ),
});

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close menu on click outside
  useEffect(() => {
    if (!mobileOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileOpen]);

  return (
    <header className="relative z-50 pt-4 px-4">
      <div ref={menuRef}>
        <div className="bg-[#f7f7f7] rounded-[12px] max-w-[1200px] mx-auto h-14 pl-3 pr-2 py-2 flex items-center justify-between overflow-hidden">
          <Link href="/" className="flex items-center gap-2 shrink min-w-0">
            <img src="/logos/tic-logo-red.svg" alt="InternetCourt" className="h-[29px] w-[160px] md:w-[220px]" />
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

            {/* Wallet button: hidden on mobile, visible on desktop */}
            <div className="hidden md:block">
              <WalletButton />
            </div>

            {/* Hamburger button: visible on mobile, hidden on desktop */}
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white transition-colors hover:bg-[#DC2626] hover:text-white text-foreground"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#f7f7f7] rounded-[12px] max-w-[1200px] mx-auto mt-2 px-4 py-4 flex flex-col gap-4">
            <nav className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-mono text-base text-foreground transition-colors hover:text-[#dc2626] py-1"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-black/10 pt-3">
              <WalletButton />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
