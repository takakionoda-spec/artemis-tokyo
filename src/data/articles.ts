import type { CategoryKey, Lang } from "@/lib/i18n";
import { normalizeCategory } from "@/lib/i18n";
import generated from "./generated/articles.json";

/* =========================================================
   Article shape
   - Test/dummy articles have been removed.
   - The source of truth is now src/data/generated/articles.json
     which is written by src/scripts/cron-publisher.ts
     from real NASA / Space.com / arXiv feeds.
   ========================================================= */

export type LocalizedString = Record<Lang, string>;
export type LocalizedRichText = Record<Lang, string[]>;

export type ArticleStatus = "draft" | "published";

export type Article = {
  slug: string;
  category: CategoryKey;
  issue: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  feature: boolean;
  cover: {
    src: string;
    tone: string;
  };
  title: LocalizedString;
  dek: LocalizedString;
  author: LocalizedString;
  location: LocalizedString;
  tags: LocalizedString[];
  body: LocalizedRichText;
  /** Provenance — every article must record where it came from. */
  source: {
    name: string;
    url: string;
  };
  /** Stable identifier of the upstream item (RSS GUID / arXiv id) — used to
   *  detect and re-edit articles that were previously marked seen but never
   *  got real content. */
  sourceGuid?: string;
  /** "draft" articles are forced through the LLM again on the next cron run. */
  status?: ArticleStatus;
};

// JSON files are imported with broad typing; we narrow here and migrate
// any legacy category (architecture / interview / exploration) on the fly.
export const articles: Article[] = (generated as unknown as Article[]).map((a) => ({
  ...a,
  category: normalizeCategory(a.category)
}));

/* =========================================================
   Query helpers — same surface as before so existing
   components keep working without changes.
   ========================================================= */

export const getArticleBySlug = (slug: string): Article | undefined =>
  articles.find((a) => a.slug === slug);

export const getArticlesByCategory = (category: string): Article[] =>
  articles.filter((a) => a.category === category);

export const getFeaturedArticles = (): Article[] =>
  articles.filter((a) => a.feature);

export const getLatestArticles = (limit = 8): Article[] =>
  [...articles]
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);

export const getRelatedArticles = (slug: string, limit = 3): Article[] => {
  const current = getArticleBySlug(slug);
  if (!current) return [];
  return articles
    .filter((a) => a.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 0 : 1;
      const bMatch = b.category === current.category ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.publishedAt < b.publishedAt ? 1 : -1;
    })
    .slice(0, limit);
};
