"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";
import type { Article } from "@/data/articles";
import SourceCredit from "@/components/SourceCredit";

type Variant = "hero" | "lead" | "standard" | "compact" | "minimal";

type Props = {
  article: Article;
  variant?: Variant;
  priority?: boolean;
};

export default function ArticleCard({ article, variant = "standard", priority = false }: Props) {
  const { lang, dict } = useLanguage();

  const title = article.title[lang];
  const dek = article.dek[lang];
  const author = article.author[lang];
  const categoryLabel = dict.categories[article.category];
  const href = `/articles/${article.slug}`;

  if (variant === "hero") {
    return (
      <article className="group">
        <Link href={href} className="block">
          <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
            <Image
              src={article.cover.src}
              alt={title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.025]"
              style={{ backgroundColor: article.cover.tone }}
            />
          </div>
          <div className="mt-7 max-w-4xl">
            <p className="eyebrow">{categoryLabel}</p>
            <h1 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-ink">
              {title}
            </h1>
            <p className="mt-5 text-base md:text-lg leading-relaxed text-ink-600 max-w-2xl">
              {dek}
            </p>
            <p className="mt-6 byline">{dict.ui.by} {author}</p>
          </div>
        </Link>
        <SourceCredit source={article.source} className="mt-4" />
      </article>
    );
  }

  if (variant === "lead") {
    return (
      <article className="group">
        <Link href={href} className="block">
          <div className="relative aspect-[4/5] overflow-hidden bg-ink-100">
            <Image
              src={article.cover.src}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.025]"
            />
          </div>
          <div className="mt-5">
            <p className="eyebrow">{categoryLabel}</p>
            <h2 className="mt-3 font-display text-[1.65rem] md:text-[1.85rem] leading-[1.1] tracking-[-0.015em] text-ink">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">{dek}</p>
            <p className="mt-4 byline">{dict.ui.by} {author}</p>
          </div>
        </Link>
        <SourceCredit source={article.source} className="mt-3" />
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="group">
        <Link href={href} className="flex gap-4 w-full">
          <div className="relative w-24 sm:w-28 aspect-square flex-shrink-0 overflow-hidden bg-ink-100">
            <Image
              src={article.cover.src}
              alt={title}
              fill
              sizes="120px"
              className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.04]"
            />
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-[0.625rem]">{categoryLabel}</p>
            <h3 className="mt-1.5 font-display text-[1.05rem] leading-[1.2] tracking-[-0.01em] text-ink line-clamp-3">
              {title}
            </h3>
            <p className="mt-2 byline text-[0.625rem]">{dict.ui.by} {author}</p>
          </div>
        </Link>
        <SourceCredit source={article.source} className="mt-2 ml-[112px] sm:ml-[128px]" />
      </article>
    );
  }

  if (variant === "minimal") {
    return (
      <article>
        <Link href={href} className="block group">
          <p className="eyebrow">{categoryLabel}</p>
          <h3 className="mt-3 font-display text-[1.35rem] leading-[1.15] tracking-[-0.015em] text-ink editorial-link inline-block">
            {title}
          </h3>
          <p className="mt-3 byline">{dict.ui.by} {author} · {article.readingMinutes} {dict.ui.minRead}</p>
        </Link>
        <SourceCredit source={article.source} className="mt-2" />
      </article>
    );
  }

  // standard
  return (
    <article className="group">
      <Link href={href} className="block">
        <div className="relative aspect-[3/2] overflow-hidden bg-ink-100">
          <Image
            src={article.cover.src}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-4">
          <p className="eyebrow">{categoryLabel}</p>
          <h3 className="mt-2.5 font-display text-[1.35rem] leading-[1.18] tracking-[-0.01em] text-ink">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600 line-clamp-2">{dek}</p>
          <p className="mt-3 byline">{dict.ui.by} {author} · {article.readingMinutes} {dict.ui.minRead}</p>
        </div>
      </Link>
      <SourceCredit source={article.source} className="mt-3" />
    </article>
  );
}
