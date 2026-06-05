import type { Article } from "@/data/articles";
import type { Lang } from "@/lib/i18n";
import { siteConfig } from "@/site.config";

const SITE_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) ||
  siteConfig.brand.siteUrl;

export function buildArticleJsonLd(article: Article, lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title[lang],
    description: article.dek[lang],
    image: [article.cover.src],
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: lang === "ja" ? "ja-JP" : "en-US",
    author: { "@type": "Person", name: article.author[lang] },
    publisher: {
      "@type": "Organization",
      name: siteConfig.brand.name,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.svg`
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/articles/${article.slug}`
    },
    articleSection: article.category,
    keywords: article.tags.map((t) => t[lang]).join(", ")
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: siteConfig.brand.name,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    sameAs: [],
    description: siteConfig.chrome.footer.copy.en
  };
}
