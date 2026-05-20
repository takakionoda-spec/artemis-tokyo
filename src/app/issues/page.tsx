"use client";

import Link from "next/link";
import Image from "next/image";
import { Container, SectionRule } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import { articles } from "@/data/articles";

type IssueDescription = { en: string; ja: string };

const ISSUES: { id: string; title: IssueDescription; date: IssueDescription; lede: IssueDescription }[] = [
  {
    id: "Vol. 04",
    title: { en: "The Second Home", ja: "第二の故郷" },
    date: { en: "April 2026", ja: "2026年4月" },
    lede: {
      en: "Artemis IV, Starship as a logistics standard, the off-grid rehearsal of Kisarazu, and a conversation with the architect Aoi Nakamura.",
      ja: "アルテミスIV、規格としてのスターシップ、木更津のオフグリッド・リハーサル、そして建築家・中村葵との対話。"
    }
  },
  {
    id: "Vol. 03",
    title: { en: "Quiet Infrastructure", ja: "静かなインフラ" },
    date: { en: "March 2026", ja: "2026年3月" },
    lede: {
      en: "The cartographers of near-space, the quiet economy of cislunar finance, and a tour of the vertical glasshouse of Shibuya.",
      ja: "近宇宙の地図製作者たち、シスルナ金融の静かな経済、渋谷の垂直グラスハウスを訪ねて。"
    }
  },
  {
    id: "Vol. 02",
    title: { en: "Wearing Microgravity", ja: "微小重力をまとう" },
    date: { en: "February 2026", ja: "2026年2月" },
    lede: {
      en: "Issue dedicated to the language of clothing, kitchens, and small objects in low gravity. Forthcoming as the bilingual print edition.",
      ja: "低重力下における衣服・厨房・小さなオブジェクトの言語に捧げる号。バイリンガル印刷版として近日刊行。"
    }
  },
  {
    id: "Vol. 01",
    title: { en: "Inaugural", ja: "創刊号" },
    date: { en: "January 2026", ja: "2026年1月" },
    lede: {
      en: "The first dispatches from a desk in Tokyo. An editor's letter, three commissioned essays, and a manifesto on the architecture of off-world life.",
      ja: "東京の机からの最初のディスパッチ。編集者の手紙、三本の依頼エッセイ、そして地球外生活のアーキテクチャに関するマニフェスト。"
    }
  }
];

export default function IssuesPage() {
  const { lang } = useLanguage();

  const latestCover = articles.find((a) => a.feature)?.cover.src;

  return (
    <>
      <Container className="pt-12 lg:pt-16 pb-12">
        <p className="eyebrow">{lang === "ja" ? "アーカイブ" : "Archive"}</p>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em]">
          {lang === "ja" ? "号のアーカイブ" : "Every issue, in two languages."}
        </h1>
        <p className="mt-6 max-w-[68ch] text-lg text-ink-600 leading-relaxed">
          {lang === "ja"
            ? "ARTEMIS TOKYOは月に一号を刊行します。各号は日英両言語で同時に公開され、印刷版は限定部数で発行されます。"
            : "ARTEMIS TOKYO publishes one issue a month. Each is released simultaneously in Japanese and English, and printed in a small, deliberate run."}
        </p>
        <div className="silver-rule mt-12" />
      </Container>

      <Container className="pb-section">
        <SectionRule label={lang === "ja" ? "現行号" : "Current"} action={ISSUES[0].id} />
        <div className="mt-10 lg:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-8 border-b border-ink-200 pb-16">
          <div className="lg:col-span-7">
            {latestCover ? (
              <div className="relative aspect-[4/5] overflow-hidden bg-ink-100">
                <Image
                  src={latestCover}
                  alt={ISSUES[0].title[lang]}
                  fill
                  priority
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
          <div className="lg:col-span-5 flex flex-col justify-end">
            <p className="eyebrow">{ISSUES[0].id} · {ISSUES[0].date[lang]}</p>
            <h2 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] leading-[1.02] tracking-[-0.022em]">
              {ISSUES[0].title[lang]}
            </h2>
            <p className="mt-6 max-w-[68ch] text-base text-ink-600 leading-relaxed">
              {ISSUES[0].lede[lang]}
            </p>
            <Link
              href="/"
              className="mt-8 self-start text-[0.6875rem] tracking-[0.22em] uppercase font-medium px-5 py-3 border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              {lang === "ja" ? "現行号を読む" : "Read the issue"}
            </Link>
          </div>
        </div>
      </Container>

      <Container className="pb-section">
        <SectionRule label={lang === "ja" ? "バックナンバー" : "Back Issues"} />
        <ul className="mt-10 lg:mt-12 divide-y divide-ink-200">
          {ISSUES.slice(1).map((issue) => (
            <li key={issue.id} className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-3 items-baseline">
              <div className="lg:col-span-2">
                <p className="eyebrow">{issue.id}</p>
                <p className="mt-2 byline">{issue.date[lang]}</p>
              </div>
              <div className="lg:col-span-7">
                <h3 className="font-display text-[1.65rem] md:text-[2rem] leading-[1.08] tracking-[-0.015em] text-ink">
                  {issue.title[lang]}
                </h3>
                <p className="mt-3 max-w-[68ch] text-base text-ink-600 leading-relaxed">
                  {issue.lede[lang]}
                </p>
              </div>
              <div className="lg:col-span-3 lg:text-right">
                <span className="text-[0.6875rem] tracking-[0.22em] uppercase text-ink-500">
                  {lang === "ja" ? "近日アーカイブ公開" : "Archive forthcoming"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
