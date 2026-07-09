import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StrataView } from "@/components/caniagent/strata/StrataView";

export const metadata: Metadata = {
  title: "caniagent — Strata (preview)",
  robots: { index: false, follow: false },
};

export default async function StrataPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StrataView />;
}
