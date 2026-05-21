"use client";

import { Container } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import Newsletter from "@/components/Newsletter";

type Bilingual = { en: string; ja: string };

const HEADLINE: Bilingual = {
  en: "The Artemis era, curated from Tokyo.",
  ja: "アルテミス時代を、東京から編む。"
};

const LEDE: Bilingual = {
  en: "Human migration to space — beginning with the lunar surface — is said to arrive in the 2040s. That plan is the Artemis Program. ARTEMIS TOKYO is a curation magazine that follows the program every nation is now taking seriously, and the wider international conversation about future off-world life, edited through the eyes of a writer who lives in Tokyo.",
  ja: "2040年代には月面をはじめとする宇宙への人間の移住が実現すると言われている。その計画こそが「アルテミス計画」である。各国が本気で取り組む、この計画にまつわる情報や日本以外の世界各国で現在話題になっている未来の宇宙生活に関する情報を東京に生きる編集者の目線で切り取り発信するキュレーションメディア"
};

const BLOCKS: { eyebrow: Bilingual; heading: Bilingual; body: Bilingual }[] = [
  {
    eyebrow: { en: "OUR LINE", ja: "編集の線" },
    heading: {
      en: "A curation magazine for the migration the world is now planning.",
      ja: "世界が今、本気で準備している移住のための、キュレーションマガジン。"
    },
    body: {
      en: "The Artemis Program — humanity's planned return to the Moon and, in time, its first crewed steps toward Mars — is no longer a slogan. NASA, ESA, JAXA, and a dozen private agencies are now timetabling the 2040s in real budget cycles, with real launch manifests. ARTEMIS TOKYO follows that work, and the wider international conversation it is shaping: who flies, on what terms, into what kind of off-world life.",
      ja: "「アルテミス計画」は、もはやスローガンではない。NASA、ESA、JAXA、そして民間の宇宙企業群が、2040年代の月面と、その先の火星行きを、現実の予算サイクルと打ち上げスケジュールに織り込み始めている。ARTEMIS TOKYO は、その動きと、それを取り囲む世界の議論 — 誰が、どのような条件で飛び、どのような宇宙生活へ向かうのか — を追いかける。"
    }
  },
  {
    eyebrow: { en: "OUR CITY", ja: "私たちの街" },
    heading: {
      en: "Why Tokyo edits this conversation.",
      ja: "なぜ、東京から編むのか。"
    },
    body: {
      en: "Most of the news driving the Artemis era is written outside Japan — in Houston, Toulouse, Bangalore, in California's industrial fringe. Tokyo's job, on this site, is to read those dispatches together: side-by-side, in two languages, with a sober editor's distance. Tokyo has always been a city that listens carefully to elsewhere before forming its own line. That habit is the editorial method here.",
      ja: "アルテミス時代を駆動するニュースのほとんどは、日本の外側で書かれている — ヒューストン、トゥールーズ、バンガロール、そしてカリフォルニアの工場地帯から。東京の役割は、それらを並べて、二言語で、編集者の冷静な距離をもって読み直すことにある。東京は古くから、「先に他所の声を注意深く聞いてから、自分の線を引く」街だった。それが、このサイトの方法でもある。"
    }
  },
  {
    eyebrow: { en: "OUR METHOD", ja: "編集の方法" },
    heading: {
      en: "Real dispatches, curated and re-edited every morning.",
      ja: "本物のニュースを、毎朝キュレートし、編集し直す。"
    },
    body: {
      en: "Every article begins with a real, dated dispatch from a credible international source — NASA, ESA, Space.com, arXiv, TechCrunch, SpaceNews, Ars Technica, The Verge, Dezeen, and others cited at the foot of each piece. Our editorial pipeline pulls these dispatches every morning at 06:00 JST, selects what matters for a Tokyo reader, and re-edits each in both languages. Every article closes with an ARTEMIS TOKYO 視点 block — our own first-person reading of the story against Japan's current realities. The original source is always linked.",
      ja: "全ての記事は、信頼できる海外の一次情報 — NASA、ESA、Space.com、arXiv、TechCrunch、SpaceNews、Ars Technica、The Verge、Dezeen ほか、各記事のフッターに明記する出典 — から始まる。編集パイプラインが毎朝6時（JST）にそれらを取得し、東京の読者にとって意味のあるものを選び、両言語に再編集する。そして全ての記事は、「ARTEMIS TOKYO 視点」 — 日本の現状と照らした、編集部独自の読み解き — で締めくくられる。原文へのリンクは常に保たれる。"
    }
  }
];

export default function AboutPage() {
  const { lang, dict } = useLanguage();

  return (
    <>
      <Container className="pt-12 lg:pt-16 pb-12">
        <p className="eyebrow">{dict.nav.about}</p>
        <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.95] tracking-[-0.025em] max-w-5xl">
          {HEADLINE[lang]}
        </h1>
        <p className="mt-8 max-w-[68ch] text-lg text-ink-600 leading-relaxed">
          {LEDE[lang]}
        </p>
        <div className="silver-rule mt-12" />
      </Container>

      <Container className="pb-section">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-16">
          {BLOCKS.map((block, i) => (
            <article key={i} className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-4 border-t border-ink pt-10">
              <div className="lg:col-span-3">
                <p className="eyebrow">{block.eyebrow[lang]}</p>
              </div>
              <div className="lg:col-span-9">
                <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.08] tracking-[-0.015em] text-ink max-w-3xl">
                  {block.heading[lang]}
                </h2>
                <p className="mt-6 max-w-[68ch] text-base text-ink-700 leading-relaxed">
                  {block.body[lang]}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>

      <Container>
        <Newsletter />
      </Container>
    </>
  );
}
