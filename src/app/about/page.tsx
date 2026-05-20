"use client";

import { Container, SectionRule } from "@/components/GridSystem";
import { useLanguage } from "@/context/LanguageContext";
import Newsletter from "@/components/Newsletter";

type Bilingual = { en: string; ja: string };

const HEADLINE: Bilingual = {
  en: "An editor's letter from Tokyo to orbit.",
  ja: "東京から軌道へ — 編集者からの手紙。"
};

const LEDE: Bilingual = {
  en: "ARTEMIS TOKYO is an independent, bilingual editorial. We chronicle the cultural and technological architecture of off-world life from a single, deliberate vantage point: a desk in Tokyo, a window onto the Pacific, and a quiet patience for what the next century will demand of us.",
  ja: "ARTEMIS TOKYOは、独立系のバイリンガル・エディトリアルです。私たちは、東京の一つの机、太平洋に向く一枚の窓、そして来世紀が私たちに何を求めるかについての静かな忍耐 — その一つの視座から、地球外生活の文化的・技術的アーキテクチャを記録します。"
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
    eyebrow: { en: "OUR PROMISES", ja: "編集の約束" },
    heading: {
      en: "Three quiet commitments.",
      ja: "三つの静かな約束。"
    },
    body: {
      en: "First: every article is published, simultaneously, in both languages — never as a translation, but as two parallel pieces of writing that have been allowed to settle into the grammar of their own language. Second: we publish weekly, not daily; we trust your time. Third: there are no advertisements. The Dispatch newsletter is, and will remain, the only commercial relationship between us and our readers.",
      ja: "第一 — 全ての記事は、両言語で同時に発行されます。決して翻訳としてではなく、各々の言語の文法に落ち着くことを許された二つの並行する執筆物として。第二 — 私たちは日刊ではなく週刊で発行します。あなたの時間を信頼するためです。第三 — 広告はありません。Dispatchニュースレターは、私たちと読者の間の唯一の商業的関係であり、これからもそうあり続けます。"
    }
  }
];

const MASTHEAD: { role: Bilingual; name: string; location: Bilingual }[] = [
  { role: { en: "Editor-in-Chief", ja: "編集長" }, name: "Hana Mori 森 ハナ", location: { en: "Tokyo", ja: "東京" } },
  { role: { en: "Architecture Editor", ja: "建築編集" }, name: "Sora Ishida 石田 蒼", location: { en: "Chiba / Tokyo", ja: "千葉／東京" } },
  { role: { en: "Culture Editor", ja: "カルチャー編集" }, name: "Mira Klein", location: { en: "Brooklyn", ja: "ブルックリン" } },
  { role: { en: "Technology Editor", ja: "テクノロジー編集" }, name: "Léa Tanaka 田中 レア", location: { en: "Boca Chica / Tokyo", ja: "ボカチカ／東京" } },
  { role: { en: "Cartographer-at-Large", ja: "地図担当" }, name: "Daniel Park ダニエル・パク", location: { en: "Yokohama", ja: "横浜" } },
  { role: { en: "Editorial Assistant", ja: "編集アシスタント" }, name: "Yui Saito 齋藤 唯", location: { en: "Tsukuba", ja: "つくば" } }
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

      <Container className="pb-section">
        <SectionRule label={lang === "ja" ? "編集部" : "MASTHEAD"} />
        <div className="mt-10 lg:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {MASTHEAD.map((person) => (
            <div key={person.name}>
              <p className="eyebrow text-ink-500">{person.role[lang]}</p>
              <p className="mt-3 font-display text-xl tracking-[-0.005em] text-ink">{person.name}</p>
              <p className="mt-1 byline">{person.location[lang]}</p>
            </div>
          ))}
        </div>
      </Container>

      <Container>
        <Newsletter />
      </Container>
    </>
  );
}
