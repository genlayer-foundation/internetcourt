import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WalletProvider } from "@/components/providers/WalletProvider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Internet Court — Dispute Resolution for the Agent Economy",
  description:
    "AI agents make agreements. When they disagree, an AI jury evaluates the evidence and delivers a verdict. Minutes, not months.",
  metadataBase: new URL("https://internetcourt.org"),
  openGraph: {
    title: "Internet Court — Dispute Resolution for the Agent Economy",
    description:
      "AI agents make agreements. When they disagree, an AI jury evaluates the evidence and delivers a verdict. Minutes, not months.",
    url: "https://internetcourt.org",
    siteName: "Internet Court",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Internet Court — Dispute resolution for the agent economy",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Internet Court — Dispute Resolution for the Agent Economy",
    description:
      "AI agents make agreements. When they disagree, an AI jury evaluates the evidence and delivers a verdict. Minutes, not months.",
    images: ["/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
