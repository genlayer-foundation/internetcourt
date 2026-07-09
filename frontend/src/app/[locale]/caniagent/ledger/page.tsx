import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LedgerView from "@/components/caniagent/ledger/LedgerView";

export const metadata: Metadata = {
  title: "caniagent — Ledger — Internet Court",
  robots: { index: false, follow: false },
};

export default async function CaniagentLedgerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LedgerView />;
}
