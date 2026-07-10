import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, DM_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { routing } from "@/i18n/routing";
import {
  buildAlternates,
  buildOpenGraphLocale,
  localizedUrl,
} from "@/lib/i18n-metadata";
import {
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
} from "@/lib/structured-data";

const GA_MEASUREMENT_ID =
  process.env.VERCEL_ENV === "production"
    ? "G-89MRCLMMC5"
    : process.env.VERCEL_ENV === "preview"
      ? "G-XGHQ9399SG"
      : null;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  const title = t("title");
  const description = t("description");
  const ogImageAlt = t("ogImageAlt");
  const ogLocale = buildOpenGraphLocale(locale);

  return {
    title,
    description,
    metadataBase: new URL("https://internetcourt.org"),
    alternates: buildAlternates("/", locale),
    openGraph: {
      title,
      description,
      url: localizedUrl("/", locale),
      siteName: t("ogSiteName"),
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      locale: ogLocale.locale,
      alternateLocale: ogLocale.alternateLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.jpg"],
    },
    icons: {
      icon: "/favicon.svg",
      apple: "/apple-icon.png",
    },
    other: {
      robots:
        "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
  };
}

export function generateViewport(): Viewport {
  return { themeColor: "#1c1a16" };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "metadata" });

  return (
    <html lang={locale} style={{ backgroundColor: "#f7f4ec", colorScheme: "light" }}>
      <body
        className={`${dmSans.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <JsonLd
          data={[
            organizationSchema(),
            websiteSchema(locale),
            softwareApplicationSchema(locale, { description: t("description") }),
          ]}
        />
        <NextIntlClientProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
              }}
            />
          </>
        )}
        <Analytics />
      </body>
    </html>
  );
}
