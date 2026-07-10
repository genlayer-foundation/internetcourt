import type { Metadata } from "next";
import NextLink from "next/link";
import { DM_Sans, DM_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { Footer } from "@/components/layout/Footer";

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
  metadataBase: new URL("https://internetcourt.org"),
};

/**
 * Second root layout for the static, English-only `/privacy` route. This
 * segment lives OUTSIDE `[locale]`, so it renders its own `<html>`/`<body>`
 * (the "multiple root layouts" pattern). We force English (`setRequestLocale`
 * + the English message bundle) so the site `Footer` — which relies on
 * next-intl `getTranslations()` — resolves correctly.
 *
 * The full site `Header` is intentionally NOT reused here: its language toggle
 * (`MastheadLangToggle`) and nav chips use locale-aware navigation and would
 * emit links to nonexistent localized privacy URLs (`/es/privacy`, ...). We
 * render a minimal static header (the wordmark linking home) instead.
 */
export default async function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  setRequestLocale("en");
  const messages = await getMessages({ locale: "en" });
  const t = await getTranslations({ locale: "en", namespace: "nav" });

  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale="en" messages={messages}>
          <div className="flex min-h-screen flex-col">
            <header className="relative z-50 px-4 py-5 md:py-6">
              <div className="mx-auto flex max-w-[1200px] items-center justify-center">
                <NextLink
                  href="/"
                  aria-label={t("homeAriaLabel")}
                  className="flex items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red-border)] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7f4ec]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/tic-logo-red.svg"
                    alt={t("logoAlt")}
                    className="h-7 w-auto md:h-8"
                  />
                </NextLink>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
