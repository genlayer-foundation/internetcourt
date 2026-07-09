import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LanesView } from "@/components/caniagent/lanes/LanesView";

export const metadata: Metadata = {
  title: "caniagent — Lanes (preview)",
  robots: { index: false, follow: false },
};

export default async function LanesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LanesView />;
}
