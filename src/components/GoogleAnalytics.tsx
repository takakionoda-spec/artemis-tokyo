"use client";

/* GA4 tag. Renders nothing until a measurement ID is configured, either via
   NEXT_PUBLIC_GA_ID or siteConfig.analytics.gaMeasurementId. GA4's enhanced
   measurement records client-side route changes, so no manual page_view. */
import Script from "next/script";
import { siteConfig } from "@/site.config";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || siteConfig.analytics.gaMeasurementId;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
