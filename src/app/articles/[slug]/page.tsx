/* =============================================================================
   /articles/[slug] — server route shell
   -----------------------------------------------------------------------------
   The actual rendering lives in ./ArticleView.tsx (client). This file stays
   server-side so that `generateMetadata` can run — which is what makes the OG
   title / description / image come from the SPECIFIC article instead of
   falling back to the root layout's brand-name default.

   Why this split exists:
   Facebook (and every other og:scraper) reads the HTML the SERVER serves.
   When `articles/[slug]/page.tsx` was a `"use client"` component, Next.js
   silently refused to apply per-route metadata (client components can't
   export metadata / generateMetadata), so og:title was always
   "ARTEMIS TOKYO — The Artemis era, curated from Tokyo" — the layout
   default. Sharing any individual article to FB / X / LINE / LinkedIn
   gave the same generic card. After this split, each article ships its
   own og:title + og:description + og:image.
   ========================================================================== */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/data/articles";
import { siteConfig } from "@/site.config";
import ArticleView from "./ArticleView";

type RouteParams = { slug: string };

/* ---------------------------------------------------------------------------
   Per-article metadata. Runs at request time on the server and the result
   becomes the actual <meta property="og:*"> tags in the served HTML. We use
   the English fields because the server-rendered HTML has lang="en" (the
   language toggle is a client-side state); social scrapers see this version.
   ------------------------------------------------------------------------- */
export async function generateMetadata({
  params
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  // 404 case — let the route fall through to the notFound() check in the
  // page below. We still need to return something valid here so Next.js can
  // render the 404 chrome with its own metadata.
  if (!article) {
    return {
      title: "Not Found",
      description: siteConfig.about.lede.en
    };
  }

  const titleEn = article.title.en;
  const titleJa = article.title.ja;
  const dekEn = article.dek.en;
  const cover = article.cover?.src;
  const canonicalPath = `/articles/${article.slug}`;

  return {
    // The root layout's `title.template` is "%s · ARTEMIS TOKYO", so this
    // string is sandwiched into "<title> · ARTEMIS TOKYO" for the <title>
    // tag. The og/twitter blocks below override the OG title independently.
    title: titleEn,
    description: dekEn,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: canonicalPath,
        ja: canonicalPath
      }
    },
    openGraph: {
      title: titleEn,
      description: dekEn,
      url: canonicalPath,
      siteName: siteConfig.brand.name,
      type: "article",
      publishedTime: article.publishedAt,
      authors: article.author?.en ? [article.author.en] : undefined,
      images: cover
        ? [
            {
              url: cover,
              alt: titleEn
            }
          ]
        : undefined,
      // Surface the JA title too so Facebook/Twitter clients that support
      // locale-alternate previews can pick it up.
      locale: "en_US",
      alternateLocale: ["ja_JP"]
    },
    twitter: {
      card: "summary_large_image",
      title: titleEn,
      description: dekEn,
      images: cover ? [cover] : undefined
    },
    // Surface the JA title in a custom meta tag so server-side previews that
    // peek at HTML can pick it up. Harmless if ignored.
    other: {
      "og:title:ja": titleJa
    }
  };
}

/* ---------------------------------------------------------------------------
   Route shell. Resolves the slug server-side so we can 404 cleanly without
   touching the client renderer; then delegates rendering to ArticleView.
   ------------------------------------------------------------------------- */
export default async function ArticlePage({
  params
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  // Server-side 404 — ArticleView also calls notFound() for safety, but
  // catching it here keeps the rendered HTML clean for bots that follow
  // 404 redirects.
  if (!getArticleBySlug(slug)) notFound();
  return <ArticleView slug={slug} />;
}
