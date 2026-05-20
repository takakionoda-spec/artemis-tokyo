import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { buildOrganizationJsonLd } from "@/lib/jsonld";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://artemis-tokyo.vercel.app"),
  title: {
    default: "ARTEMIS TOKYO — Space migration × culture",
    template: "%s · ARTEMIS TOKYO"
  },
  description:
    "ARTEMIS TOKYO is a bilingual editorial chronicling the cultural and technological architecture of off-world life — from Tokyo, to the stars.",
  keywords: [
    "Artemis",
    "SpaceX",
    "lunar",
    "Mars",
    "space migration",
    "culture",
    "fashion",
    "architecture",
    "Tokyo"
  ],
  openGraph: {
    title: "ARTEMIS TOKYO",
    description: "Space migration × culture. From Tokyo, to the stars.",
    url: "/",
    siteName: "ARTEMIS TOKYO",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ARTEMIS TOKYO",
    description: "Space migration × culture. From Tokyo, to the stars."
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
