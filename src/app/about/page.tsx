"use client";

import { Container } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import Newsletter from "@/components/Newsletter";

type Bilingual = { en: string; ja: string };

const HEADLINE: Bilingual = {
  en: "An editor's letter from Tokyo to orbit.",
  ja: "東京から軌道へ — 編集者からの手紙。"
};

const LEDE: Bilingual = {
  en: "Human migration to space — beginning with the lunar surface — is said to arrive in the 2040s. That plan is the Artemis Program. ARTEMIS TOKYO is a curation magazine that follows the program every nation is now taking seriously, and the wider international conversation about future off-world life, edited through the eyes of a writer who lives in Tokyo.",
  ja: "2040年代には月面をはじめとする宇宙への人間の移住が実現すると言われている。その計画こそが「アルテミス計画」である。各国が本気で取り組む、この計画にまつわる情報や日本以外の世界各国で現在話題になっている未来の宇宙生活に関する情報を東京に生きる編集者の目線で切り取り発信するキュレーションメディア"
};

const BLOCKS: { eyebrow: Bilingual; heading: Bilingual; body: Bilingual }[] = [
  {
    eyebrow: { en: "OUR LINE", ja: "編集の線" },
    heading: {
      en: "We write about space the way a magazine writes about a city.",
      ja: "私たちは、宇宙について — 雑誌が街について書くようにして — 書きます。"
    },
    body: {
      en: "Most space journalism is, at its best, an industry trade. We are interested in the second thing: the people, the rooms, the cuts of cloth, the choreography of a Tuesday morning in low gravity. The Moon is, among other things, a place where someone will eventually have to set a table. We write about the table.",
      ja: "宇宙ジャーナリズムの多くは、その最良の瞬間においても、業界紙の仕事です。私たちは、その次のもの — 人、部屋、布の裁ち方、低重力下の火曜日の朝の振付 — に関心があります。月は、他のあらゆることに加えて、いずれ誰かが食卓を整えなければならない場所です。私たちは、その食卓について書きます。"
    }
  },
  {
    eyebrow: { en: "OUR CITY", ja: "私たちの街" },
    heading: {
      en: "Tokyo, as a vantage point.",
      ja: "視座としての東京。"
    },
    body: {
      en: "Tokyo has, for a century, been the world's most rigorous workshop for living gently inside constraint. The constraints of a small apartment, of an old grandmother's room, of a kitchen drawer four centimeters deep. Living gently inside constraint is, of course, the central problem of every off-world habitat — which makes Tokyo, by accident or by design, the most credible city from which to file these stories.",
      ja: "東京は1世紀にわたって、制約の内側で穏やかに生きることについての、世界でもっとも厳格な工房であり続けてきました。小さな部屋の制約、祖母の和室の制約、深さ4センチの台所の引き出しの制約。「制約の内側で穏やかに生きる」ことは、もちろん、地球外の居住区すべての中心的な問題です。それは — 偶然か設計か — 東京を、これらの物語を発信するのに最も信頼できる街にします。"
    }
  },
  {
    eyebrow: { en: "OUR METHOD", ja: "編集の方法" },
    heading: {
      en: "Real dispatches, re-edited every morning.",
      ja: "本物の発信を、毎朝編集し直す。"
    },
    body: {
      en: "Every article begins with a real, dated dispatch from a credible source — NASA, ESA, Space.com, arXiv, TechCrunch, SpaceNews, Dezeen, and other publications cited at the foot of each piece. Our editorial pipeline collects these dispatches daily and re-edits them, in both languages, into the calm, considered prose of an editorial magazine. The original source is always linked.",
      ja: "全ての記事は、信頼できる発信源 — NASA、ESA、Space.com、arXiv、TechCrunch、SpaceNews、Dezeenなど — からの実在する一次情報に基づき、各記事のフッターに出典として明示されます。編集パイプラインが毎日それらを収集し、両言語の編集誌の落ち着いた散文へと書き直します。元記事へのリンクは常に保たれます。"
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
