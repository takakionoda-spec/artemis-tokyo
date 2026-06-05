import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { buildOrganizationJsonLd } from "@/lib/jsonld";
import { siteConfig } from "@/site.config";

const brand = siteConfig.brand;
const aboutLede = siteConfig.about.lede.en;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? brand.siteUrl),
  title: {
    default: `${brand.name} — The Artemis era, curated from Tokyo`,
    template: `%s · ${brand.name}`
  },
  description: aboutLede,
  keywords: [...brand.keywords],
  openGraph: {
    title: brand.name,
    description:
      "The Artemis era, curated from Tokyo. A bilingual magazine on the 2040s migration off-world.",
    url: "/",
    siteName: brand.name,
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: brand.name,
    description:
      "The Artemis era, curated from Tokyo. A bilingual magazine on the 2040s migration off-world."
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
