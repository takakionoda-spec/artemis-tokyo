import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.brand.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
