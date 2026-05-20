"use client";

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { getArticleBySlug, getRelatedArticles } from "@/data/articles";
import ArticleCard from "@/components/ArticleCard";
import { Container, SectionRule, TriColGrid } from "@/components/GridSystem";
import Newsletter from "@/components/Newsletter";
import ReadingProgress from "@/components/ReadingProgress";
import ShareBar from "@/components/ShareBar";
import SourceCredit from "@/components/SourceCredit";
import { buildArticleJsonLd } from "@/lib/jsonld";

function ParagraphBlock({ raw }: { raw: string }) {
  if (raw.startsWith("## ")) {
    return <h2>{raw.replace(/^##\s+/, "")}</h2>;
  }
  if (raw.startsWith("> ")) {
    return <blockquote>{raw.replace(/^>\s+/, "")}</blockquote>;
  }
  return <p>{raw}</p>;
}

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { lang, dict } = useLanguage();

  if (!slug) notFound();

  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, 3);

  const title = article.title[lang];
  const dek = article.dek[lang];
  const author = article.author[lang];
  const location = article.location[lang];
  const categoryLabel = dict.categories[article.category];
  const body = article.body[lang];
  const tags = article.tags;

  const dateFormatter = new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const jsonLd = buildArticleJsonLd(article, lang);

  return (
    <article>
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="pt-10 lg:pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6 items-end">
          <div className="lg:col-span-9">
            <p className="eyebrow">
              <Link href={`/category/${article.category}`} className="editorial-link">
                {categoryLabel}
              </Link>
              <span className="mx-3 text-ink-300">|</span>
              <span>{dict.ui.issue} 04</span>
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[-0.022em]">
              {title}
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-ink-600 leading-relaxed">{dek}</p>
          </div>
          <div className="lg:col-span-3 lg:border-l lg:border-ink-200 lg:pl-6">
            <dl className="grid grid-cols-2 lg:grid-cols-1 gap-y-4 text-[0.6875rem] tracking-[0.18em] uppercase">
              <div>
                <dt className="text-ink-500">{dict.ui.by}</dt>
                <dd className="mt-1 text-ink">{author}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Dateline</dt>
                <dd className="mt-1 text-ink">{location}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Date</dt>
                <dd className="mt-1 text-ink">{dateFormatter.format(new Date(article.publishedAt))}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Time</dt>
                <dd className="mt-1 text-ink">{article.readingMinutes} {dict.ui.minRead}</dd>
              </div>
            </dl>
            {article.source ? (
              <div className="mt-6 pt-6 border-t border-ink-200">
                <SourceCredit source={article.source} variant="block" />
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      <Container className="pb-12">
        <div className="relative aspect-[16/9] overflow-hidden bg-ink-100">
          <Image
            src={article.cover.src}
            alt={title}
            fill
            priority
            sizes="(min-width: 1280px) 1280px, 100vw"
            className="object-cover"
            style={{ backgroundColor: article.cover.tone }}
          />
        </div>
      </Container>

      <Container className="pb-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-12">
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="lg:sticky lg:top-32 space-y-6">
              <div>
                <p className="eyebrow">Tags</p>
                <ul className="mt-4 flex flex-wrap gap-x-2 gap-y-2 text-[0.6875rem] tracking-[0.16em] uppercase">
                  {tags.map((tag) => (
                    <li key={tag[lang]} className="border border-ink-200 px-2 py-1 text-ink-600">
                      {tag[lang]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="silver-rule" />
              <p className="byline">{dict.ui.by} {author}</p>
              {article.source ? (
                <>
                  <div className="silver-rule" />
                  <SourceCredit source={article.source} variant="block" />
                </>
              ) : null}
              <div className="silver-rule" />
              <ShareBar title={title} slug={article.slug} />
            </div>
          </aside>

          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="prose-editorial">
              {body.map((block, i) => (
                <ParagraphBlock key={i} raw={block} />
              ))}
            </div>
          </div>
        </div>
      </Container>

      <Container>
        <Newsletter />
      </Container>

      <Container className="pb-section">
        <SectionRule label={dict.ui.related} />
        <div className="mt-10 lg:mt-12">
          <TriColGrid>
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} variant="standard" />
            ))}
          </TriColGrid>
        </div>
      </Container>

      <Container className="pb-section">
        <Link href="/" className="editorial-link text-[0.6875rem] tracking-[0.22em] uppercase">
          ← {dict.ui.backToHome}
        </Link>
      </Container>
    </article>
  );
}
