import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ThermalView } from "@/components/caniagent/thermal/ThermalView";

export const metadata: Metadata = {
  title: "caniagent — Thermal (preview)",
  robots: { index: false, follow: false },
};

export default async function ThermalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ThermalView />;
}
