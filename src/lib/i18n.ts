export type Lang = "en" | "ja";

export type Dictionary = {
  brand: { tagline: string; legal: string };
  nav: {
    home: string;
    about: string;
    subscribe: string;
  };
  ui: {
    readMore: string;
    by: string;
    minRead: string;
    featured: string;
    latest: string;
    related: string;
    backToHome: string;
    issue: string;
    moreIn: string;
    newsletter: {
      eyebrow: string;
      heading: string;
      lede: string;
      placeholder: string;
      cta: string;
      disclaimer: string;
    };
    footer: {
      sections: { name: string; items: string[] }[];
      copy: string;
    };
    languageToggle: { label: string };
    notFound: { title: string; lede: string; back: string };
  };
  categories: Record<CategoryKey, string>;
};

/**
 * Four-axis editorial taxonomy.
 *
 * - "space-tech":  general space technology — rockets, propulsion, satellites,
 *                  private-space business (SpaceX, Blue Origin, Axiom, etc.)
 * - "artemis":     the Western & Japanese Artemis programs specifically —
 *                  news directly tied to humanity's return to the Moon
 * - "culture":     post-migration culture, lifestyle, gossip, design and
 *                  SF-tinged speculation about life off-world
 * - "research":    scientific papers and technical preprints (arXiv etc.)
 */
export type CategoryKey = "space-tech" | "artemis" | "culture" | "research";

export const CATEGORY_ORDER: CategoryKey[] = [
  "space-tech",
  "artemis",
  "culture",
  "research"
];

export const dictionaries: Record<Lang, Dictionary> = {
  en: {
    brand: {
      tagline: "Dispatches from Tokyo on the human migration to space said to arrive in the 2040s — and the technologies shaping it.",
      legal: "© 2026 ARTEMIS TOKYO. All rights reserved."
    },
    nav: {
      home: "Home",
      about: "About",
      subscribe: "Subscribe"
    },
    ui: {
      readMore: "Read",
      by: "By",
      minRead: "min read",
      featured: "Featured",
      latest: "The Latest",
      related: "Related Reading",
      backToHome: "Back to Home",
      issue: "Issue",
      moreIn: "More in",
      newsletter: {
        eyebrow: "The Dispatch",
        heading: "A weekly briefing on the Artemis era, from Tokyo.",
        lede: "A curated round-up of how the world's space agencies and private programmes are preparing for the 2040s migration off-world — read from a desk in Tokyo.",
        placeholder: "Your email address",
        cta: "Subscribe",
        disclaimer: "We respect your inbox. Unsubscribe anytime."
      },
      footer: {
        sections: [
          { name: "Sections", items: ["Space Tech", "Artemis Program", "Space Culture", "Research"] },
          { name: "Company", items: ["About", "Editorial Standards", "Careers", "Press"] },
          { name: "Connect", items: ["Newsletter", "Instagram", "X / Twitter", "Contact"] }
        ],
        copy: "ARTEMIS TOKYO is a bilingual curation magazine following the Artemis Program — humanity's planned migration to the Moon, Mars, and beyond — and the wider international conversation around future off-world life. Edited from Tokyo."
      },
      languageToggle: { label: "JA" },
      notFound: {
        title: "Off-grid.",
        lede: "The page you are looking for has drifted out of orbit.",
        back: "Return to surface"
      }
    },
    categories: {
      "space-tech": "Space Tech",
      "artemis": "Artemis Program",
      "culture": "Space Culture",
      "research": "Research"
    }
  },
  ja: {
    brand: {
      tagline: "2040年代に実現すると言われる宇宙への移住や最新のテクノロジーの情報を東京から",
      legal: "© 2026 ARTEMIS TOKYO. 全著作権所有。"
    },
    nav: {
      home: "ホーム",
      about: "ABOUT",
      subscribe: "購読する"
    },
    ui: {
      readMore: "読む",
      by: "Text",
      minRead: "分で読了",
      featured: "特集",
      latest: "最新の記事",
      related: "関連する記事",
      backToHome: "ホームへ戻る",
      issue: "ISSUE",
      moreIn: "もっと見る:",
      newsletter: {
        eyebrow: "DISPATCH",
        heading: "アルテミス時代の週次ブリーフィング、\n東京から。",
        lede: "世界の宇宙機関と民間プログラムが、2040年代の地球外移住に向けて何を準備しているか — 東京の編集者の目線で整理した、週ごとのキュレーション。",
        placeholder: "メールアドレス",
        cta: "購読する",
        disclaimer: "受信箱を尊重します。いつでも解除可能。"
      },
      footer: {
        sections: [
          { name: "セクション", items: ["スペース・テック", "アルテミス計画", "スペースカルチャー", "論文"] },
          { name: "編集部", items: ["私たちについて", "編集方針", "採用", "プレス"] },
          { name: "つながる", items: ["ニュースレター", "Instagram", "X / Twitter", "お問い合わせ"] }
        ],
        copy: "ARTEMIS TOKYO は、人類の月面・火星・その先への移住計画「アルテミス計画」と、世界各国で進む未来の宇宙生活をめぐる議論を、東京に生きる編集者の目線で切り取り発信するバイリンガル・キュレーションマガジン。"
      },
      languageToggle: { label: "EN" },
      notFound: {
        title: "オフグリッド。",
        lede: "お探しのページは軌道を外れたようです。",
        back: "地表へ戻る"
      }
    },
    categories: {
      "space-tech": "スペース・テック",
      "artemis": "アルテミス計画",
      "culture": "スペースカルチャー",
      "research": "論文"
    }
  }
};

/** Legacy → current category mapping. Lets old generated JSON entries
 *  whose category predates the four-axis taxonomy still render correctly. */
const LEGACY_CATEGORY_MAP: Record<string, CategoryKey> = {
  architecture: "culture",
  interview: "culture",
  exploration: "research"
};

export const normalizeCategory = (v: unknown): CategoryKey => {
  if (typeof v !== "string") return "space-tech";
  if ((CATEGORY_ORDER as readonly string[]).includes(v)) return v as CategoryKey;
  return LEGACY_CATEGORY_MAP[v] ?? "space-tech";
};

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ja";
