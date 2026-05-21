"use client";

import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import Newsletter from "@/components/Newsletter";
import { Container, HeroGrid, LeadGrid, SectionRule, TriColGrid } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import {
  getFeaturedArticles,
  getLatestArticles,
  articles
} from "@/data/articles";

export default function HomePage() {
  const { lang, dict } = useLanguage();

  const featured = getFeaturedArticles();
  const hero = featured[0] ?? articles[0];
  const heroAside = (featured.slice(1, 3).length > 0 ? featured.slice(1, 3) : articles.slice(1, 3));
  const lead = articles.find((a) => a !== hero && !heroAside.includes(a));
  const minimal = articles
    .filter((a) => a !== hero && !heroAside.includes(a) && a !== lead)
    .slice(0, 3);
  const latest = getLatestArticles(6);

  // Empty-state: cron-publisher hasn't run yet
  if (!hero) {
    return (
      <Container className="py-section">
        <div className="max-w-[68ch]">
          <p className="eyebrow">{lang === "ja" ? "準備中" : "Standing by"}</p>
          <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em]">
            {lang === "ja"
              ? "アルテミス時代の\nキュレーションは、間もなく始まります。"
              : "The Artemis curation begins shortly."}
          </h1>
          <p className="mt-6 text-lg text-ink-600 leading-relaxed">
            {lang === "ja"
              ? "ARTEMIS TOKYO のバイリンガル編集パイプラインは、NASA、ESA、Space.com、arXiv、TechCrunch、SpaceNews、Ars Technica、The Verge、Dezeen ほか海外メディアから直近の記事を取得し、毎朝6時（日本時間）に東京の編集者の目線で再編集して公開します。最初の自動生成が完了次第、この場所に世界各国のアルテミス計画関連ニュースが並びます。"
              : "Our bilingual editorial pipeline pulls the latest dispatches from NASA, ESA, Space.com, arXiv, TechCrunch, SpaceNews, Ars Technica, The Verge, Dezeen and other international outlets, and re-edits them from a Tokyo editor's vantage every morning at 06:00 JST. The first cycle will populate this view with international Artemis-era news as soon as it completes."}
          </p>
          <div className="silver-rule mt-12" />
          <p className="mt-10 byline">
            {lang === "ja" ? "次回更新：日本時間 朝6時" : "Next dispatch: 06:00 JST"}
          </p>
        </div>

        <div className="mt-20">
          <Newsletter />
        </div>
      </Container>
    );
  }

  return (
    <>
      <Container className="pt-10 lg:pt-14 pb-section">
        <SectionRule label={dict.ui.featured} action={dict.ui.issue + " — " + new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long" })} />
        <div className="mt-10 lg:mt-12">
          <HeroGrid
            left={<ArticleCard article={hero} variant="hero" priority />}
            right={
              <>
                {heroAside.map((a) => (
                  <ArticleCard key={a.slug} article={a} variant="lead" />
                ))}
              </>
            }
          />
        </div>
      </Container>

      {lead ? (
        <Container className="pb-section">
          <SectionRule
            label={dict.ui.latest}
            action={
              <Link href="/category/space-tech" className="hover:text-ink">
                {dict.ui.moreIn} {dict.categories["space-tech"]}
              </Link>
            }
          />
          <div className="mt-10 lg:mt-12">
            <LeadGrid
              lead={<ArticleCard article={lead} variant="lead" />}
              items={
                <>
                  {minimal.map((a, i) => (
                    <div key={a.slug} className={i === 0 ? "" : "pt-8"}>
                      <ArticleCard article={a} variant="minimal" />
                    </div>
                  ))}
                </>
              }
            />
          </div>
        </Container>
      ) : null}

      <Container>
        <Newsletter />
      </Container>

      {latest.length > 0 ? (
        <Container className="pb-section">
          <SectionRule label={dict.ui.latest} />
          <div className="mt-10 lg:mt-12">
            <TriColGrid>
              {latest.map((a) => (
                <ArticleCard key={a.slug} article={a} variant="standard" />
              ))}
            </TriColGrid>
          </div>
        </Container>
      ) : null}
    </>
  );
}
