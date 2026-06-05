import type { MetadataRoute } from "next";
import { articles } from "@/data/articles";
import { CATEGORY_ORDER } from "@/lib/i18n";
import { siteConfig } from "@/site.config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? siteConfig.brand.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }
  ];

  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_ORDER.map((category) => ({
    url: `${SITE_URL}/category/${category}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${article.slug}`,
    lastModified: new Date(article.publishedAt),
    changeFrequency: "monthly",
    priority: 0.8
  }));

  return [...staticEntries, ...categoryEntries, ...articleEntries];
}
