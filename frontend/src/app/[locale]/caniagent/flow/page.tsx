import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { FlowView } from "@/components/caniagent/flow/FlowView";

export const metadata: Metadata = {
  title: "caniagent — Flow (preview)",
  robots: { index: false, follow: false },
};

export default async function FlowPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <FlowView />;
}
