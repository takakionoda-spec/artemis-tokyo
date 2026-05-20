"use client";

import { notFound, useParams } from "next/navigation";
import { CATEGORY_ORDER, type CategoryKey } from "@/lib/i18n";
import { useLanguage } from "@/context/LanguageContext";
import { getArticlesByCategory } from "@/data/articles";
import ArticleCard from "@/components/ArticleCard";
import { Container, SectionRule, TriColGrid } from "@/components/GridSystem";
import Newsletter from "@/components/Newsletter";

const isCategory = (v: string): v is CategoryKey =>
  (CATEGORY_ORDER as readonly string[]).includes(v);

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const { dict } = useLanguage();
  const category = params?.category;

  if (!category || !isCategory(category)) {
    notFound();
  }

  const list = getArticlesByCategory(category);
  const label = dict.categories[category as CategoryKey];

  return (
    <>
      <Container className="pt-12 lg:pt-16 pb-12">
        <p className="eyebrow">{dict.ui.moreIn}</p>
        <h1 className="mt-4 font-display text-[clamp(2.75rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em]">
          {label}
        </h1>
        <p className="mt-6 max-w-[68ch] text-base text-ink-600 leading-relaxed">
          {dict.brand.tagline}
        </p>
        <div className="silver-rule mt-10" />
      </Container>

      <Container className="pb-section">
        <SectionRule label={dict.ui.latest} />
        <div className="mt-10 lg:mt-12">
          {list.length > 0 ? (
            <TriColGrid>
              {list.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="standard" />
              ))}
            </TriColGrid>
          ) : (
            <p className="text-base text-ink-500">— No articles in this section yet.</p>
          )}
        </div>
      </Container>

      <Container>
        <Newsletter />
      </Container>
    </>
  );
}
