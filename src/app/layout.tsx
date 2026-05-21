import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { buildOrganizationJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://artemis-tokyo.vercel.app"),
  title: {
    default: "ARTEMIS TOKYO — The Artemis era, curated from Tokyo",
    template: "%s · ARTEMIS TOKYO"
  },
  description:
    "ARTEMIS TOKYO is a bilingual curation magazine following the Artemis Program and the international conversation around the 2040s human migration to space — edited from Tokyo.",
  keywords: [
    "Artemis Program",
    "Artemis",
    "NASA",
    "ESA",
    "JAXA",
    "SpaceX",
    "lunar migration",
    "Mars",
    "2040s",
    "space migration",
    "off-world",
    "curation",
    "Tokyo"
  ],
  openGraph: {
    title: "ARTEMIS TOKYO",
    description: "The Artemis era, curated from Tokyo. A bilingual magazine on the 2040s migration off-world.",
    url: "/",
    siteName: "ARTEMIS TOKYO",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ARTEMIS TOKYO",
    description: "The Artemis era, curated from Tokyo. A bilingual magazine on the 2040s migration off-world."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = buildOrganizationJsonLd();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-paper text-ink antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <LanguageProvider initialLang="en">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
