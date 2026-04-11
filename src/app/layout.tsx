import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSiteUrl } from "@/lib/site";
import { SupabaseAuthHashCleanup } from "@/components/SupabaseAuthHashCleanup";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const siteTitle = "FREE Mandarin HSK Flashcards";
const siteDescription =
  "Practice Chinese vocabulary with HSK-level flashcards, multiple-choice modes, a leaderboard, and a personal review list for words you miss.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Laoshi Xu",
  },
  description: siteDescription,
  keywords: [
    "Mandarin",
    "Chinese",
    "HSK",
    "flashcards",
    "learn Chinese",
    "vocabulary",
    "Laoshi Xu",
  ],
  authors: [{ name: "Laoshi Xu" }],
  creator: "Laoshi Xu",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Laoshi Xu",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: siteUrl },
  // Favicons: use `app/icon.png` + `app/apple-icon.png` (Laoshi Xu logo) so the tab icon isn’t the Vercel default.
  icons: {
    icon: [{ url: "/laoshi-xu-logo.png", type: "image/png", sizes: "250x250" }],
    apple: [{ url: "/laoshi-xu-logo.png", type: "image/png", sizes: "250x250" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Laoshi Xu",
    description: siteDescription,
    url: siteUrl,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50"
        suppressHydrationWarning
      >
        <JsonLd />
        <SupabaseAuthHashCleanup />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        <footer className="shrink-0 py-2 text-center text-[10px] text-zinc-500 dark:text-zinc-600">
          (c) copyrights by stefiokurniadi
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
