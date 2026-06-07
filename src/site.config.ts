/* =============================================================================
   SITE CONFIG — THE TEMPLATE BOUNDARY
   =============================================================================
   Everything in this file is concept-dependent. The rest of the codebase
   (components, pipeline, SEO, schemas) is structural and should NOT need to
   change when deriving a new title from this template.

   To launch a sister title (e.g. DEFENSE OSAKA, BIOTECH KYOTO, AGRI HOKKAIDO):
     1. Replace `brand` — name, wordmark, subject, city, keywords.
     2. Replace `chrome` — taglines, navigation, newsletter, footer, empty-state.
     3. Replace `about` — headline, lede, the three editorial blocks.
     4. Replace `categories` — the taxonomy. Pool counts must keep cron healthy
        (>=8 Unsplash IDs per category — see cron-publisher pickCover() notes).
     5. Replace `pipeline.sources` — the RSS/Atom feeds + filters + per-source
        framing notes. Mapping each source.category must match a categories[].key.
     6. Edit `pipeline.voice` — tone of voice, framing question, closing block.
     7. Leave everything else alone. Type-check, run dry, deploy.

   See AGENTS.md → "Launch Playbook" for the full step-by-step procedure.
   ========================================================================== */

export type Lang = "en" | "ja";
export type Bilingual<T = string> = { en: T; ja: T };

/* ---------------------------------------------------------------------------
   Category definition.
   `key` is the URL slug + machine identifier + storage key.
   `coverPool` are Unsplash photo IDs in the documented `{ts}-{12hex}` form.
   ------------------------------------------------------------------------- */
export type CategoryDef = {
  key: string;
  name: Bilingual;
  /** Definition copy injected into the LLM system prompt so it picks
   *  the right category at edit time. */
  definitionForLlm: string;
  /** Visual cover image pool — Unsplash photo IDs only (no full URL). */
  coverPool: { id: string; tone: string }[];
  /** Fallback category keys (in preference order) when the home pool is exhausted. */
  fallback: string[];
};

/* ---------------------------------------------------------------------------
   Source definition for the daily crawler.
   ------------------------------------------------------------------------- */
export type SourceDef = {
  name: string;
  url: string;
  parse: "rss" | "atom";
  /** Must match a categories[].key. */
  category: string;
  /** Optional relevance filter for non-domain-native sources (Dezeen, Futurism …). */
  filter?: RegExp;
  /** Single sentence in parentheses injected per-source into the LLM prompt
   *  (`describeSource()` in the cron). Tells the LLM how to read this outlet. */
  framing?: string;
};

/* ---------------------------------------------------------------------------
   The configuration object itself.
   ------------------------------------------------------------------------- */
export const siteConfig = {
  /* ------------------------------------------------------------------ BRAND */
  brand: {
    /** Display name in uppercase tracking (e.g. "ARTEMIS TOKYO"). */
    name: "ARTEMIS TOKYO",
    /** Wordmark as rendered in Header/Footer (mixed case allowed). */
    wordmark: "Artemis Tokyo",
    /** Canonical site URL — used by SEO, sitemap, JSON-LD, cron User-Agent. */
    siteUrl: "https://artemis-tokyo.vercel.app",
    /** Editorial subject — used in metadata description and the LLM voice. */
    subject: {
      en: "the Artemis Program and the human migration to space said to arrive in the 2040s",
      ja: "アルテミス計画と、2040年代に実現すると言われる宇宙への人類の移住"
    },
    /** Vantage city — appears in copy and is offered to the LLM as part of voice. */
    city: { en: "Tokyo", ja: "東京" },
    /** Keywords (SEO). */
    keywords: [
      "Artemis Program",
      "Artemis",
      "NASA",
      "ESA",
      "JAXA",
      "SpaceX",
      "lunar migration",
      "Mars",
      "2040s",
      "space migration",
      "off-world",
      "curation",
      "Tokyo"
    ],
    /** Issue counter origin — Vol. 01 corresponds to {year, month-1}. */
    issueBase: { year: 2026, month: 1 }
  },

  /* ----------------------------------------------------------------- CHROME
     Localized strings that wrap the entire site: nav, footer, newsletter,
     empty-state, 404 page, taglines. Order/shape matches i18n.ts dictionaries.
     ---------------------------------------------------------------------- */
  chrome: {
    tagline: {
      en: "Dispatches from Tokyo on the human migration to space said to arrive in the 2040s — and the technologies shaping it.",
      ja: "2040年代に実現すると言われる宇宙への移住や最新のテクノロジーの情報を東京から"
    },
    legal: {
      en: "© 2026 ARTEMIS TOKYO. All rights reserved.",
      ja: "© 2026 ARTEMIS TOKYO. 全著作権所有。"
    },
    nav: {
      home: { en: "Home", ja: "ホーム" },
      about: { en: "About", ja: "ABOUT" },
      subscribe: { en: "Subscribe", ja: "購読する" }
    },
    ui: {
      readMore: { en: "Read", ja: "読む" },
      by: { en: "By", ja: "Text" },
      minRead: { en: "min read", ja: "分で読了" },
      featured: { en: "Featured", ja: "特集" },
      latest: { en: "The Latest", ja: "最新の記事" },
      related: { en: "Related Reading", ja: "関連する記事" },
      backToHome: { en: "Back to Home", ja: "ホームへ戻る" },
      issue: { en: "Issue", ja: "ISSUE" },
      moreIn: { en: "More in", ja: "もっと見る:" }
    },
    newsletter: {
      eyebrow: { en: "The Dispatch", ja: "DISPATCH" },
      heading: {
        en: "A weekly briefing on the Artemis era, from Tokyo.",
        ja: "アルテミス時代の週次ブリーフィング、\n東京から。"
      },
      lede: {
        en: "A curated round-up of how the world's space agencies and private programmes are preparing for the 2040s migration off-world — read from a desk in Tokyo.",
        ja: "世界の宇宙機関と民間プログラムが、2040年代の地球外移住に向けて何を準備しているか — 東京の編集者の目線で整理した、週ごとのキュレーション。"
      },
      placeholder: { en: "Your email address", ja: "メールアドレス" },
      cta: { en: "Subscribe", ja: "購読する" },
      disclaimer: {
        en: "We respect your inbox. Unsubscribe anytime.",
        ja: "受信箱を尊重します。いつでも解除可能。"
      }
    },
    footer: {
      copy: {
        en: "ARTEMIS TOKYO is a bilingual curation magazine following the Artemis Program — humanity's planned migration to the Moon, Mars, and beyond — and the wider international conversation around future off-world life. Edited from Tokyo.",
        ja: "ARTEMIS TOKYO は、人類の月面・火星・その先への移住計画「アルテミス計画」と、世界各国で進む未来の宇宙生活をめぐる議論を、東京に生きる編集者の目線で切り取り発信するバイリンガル・キュレーションマガジン。"
      },
      strapline: "Tokyo · Cislunar · Editorial Independent"
    },
    languageToggle: { en: "JA", ja: "EN" },
    notFound: {
      title: { en: "Off-grid.", ja: "オフグリッド。" },
      lede: {
        en: "The page you are looking for has drifted out of orbit.",
        ja: "お探しのページは軌道を外れたようです。"
      },
      back: { en: "Return to surface", ja: "地表へ戻る" }
    },
    emptyState: {
      eyebrow: { en: "Standing by", ja: "準備中" },
      heading: {
        en: "The Artemis curation begins shortly.",
        ja: "アルテミス時代の\nキュレーションは、間もなく始まります。"
      },
      lede: {
        en: "Our bilingual editorial pipeline pulls the latest dispatches from NASA, ESA, Space.com, arXiv, TechCrunch, SpaceNews, Ars Technica, The Verge, Dezeen and other international outlets, and re-edits them from a Tokyo editor's vantage every morning at 06:00 JST. The first cycle will populate this view with international Artemis-era news as soon as it completes.",
        ja: "ARTEMIS TOKYO のバイリンガル編集パイプラインは、NASA、ESA、Space.com、arXiv、TechCrunch、SpaceNews、Ars Technica、The Verge、Dezeen ほか海外メディアから直近の記事を取得し、毎朝6時（日本時間）に東京の編集者の目線で再編集して公開します。最初の自動生成が完了次第、この場所に世界各国のアルテミス計画関連ニュースが並びます。"
      },
      nextDispatch: {
        en: "Next dispatch: 06:00 JST",
        ja: "次回更新：日本時間 朝6時"
      }
    }
  },

  /* ------------------------------------------------------------------ ABOUT
     The /about page is data, not code — three blocks in a fixed shape.
     ---------------------------------------------------------------------- */
  about: {
    headline: {
      en: "The Artemis era, curated from Tokyo.",
      ja: "アルテミス時代を、東京から編む。"
    },
    lede: {
      en: "Human migration to space — beginning with the lunar surface — is said to arrive in the 2040s. That plan is the Artemis Program. ARTEMIS TOKYO is a curation magazine that follows the program every nation is now taking seriously, and the wider international conversation about future off-world life, edited through the eyes of a writer who lives in Tokyo.",
      ja: "2040年代には月面をはじめとする宇宙への人間の移住が実現すると言われている。その計画こそが「アルテミス計画」である。各国が本気で取り組む、この計画にまつわる情報や日本以外の世界各国で現在話題になっている未来の宇宙生活に関する情報を東京に生きる編集者の目線で切り取り発信するキュレーションメディア"
    },
    blocks: [
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
    ]
  },

  /* ------------------------------------------------------------- CATEGORIES
     Four-axis editorial taxonomy. `key` becomes the URL slug.
     Each category brings its own cover pool — strictly distinct IDs across
     categories. The LLM picks one of these `key`s at edit time.
     ---------------------------------------------------------------------- */
  categories: [
    {
      key: "space-tech",
      name: { en: "Space Tech", ja: "スペース・テック" },
      definitionForLlm:
        'general space technology — rockets, propulsion, satellites, private-space business (SpaceX, Blue Origin, Axiom, etc.)',
      fallback: ["artemis", "research"],
      coverPool: [
        { id: "1614728263952-84ea256f9679", tone: "#0d0d0f" },
        { id: "1517976547714-720226b864c1", tone: "#111111" },
        { id: "1516331138075-f3adc1e149cd", tone: "#0c0d0f" },
        { id: "1457364887197-9150188c107b", tone: "#0e0f12" },
        { id: "1517976487492-5750f3195933", tone: "#101011" },
        { id: "1581922814484-0b4838f8a45a", tone: "#0a0a0c" },
        { id: "1517976384346-3136801d605d", tone: "#0c0c0e" },
        { id: "1538300342682-cf57afb97285", tone: "#0d0e10" },
        { id: "1564053489984-317bbd824340", tone: "#0a0a0a" }
      ]
    },
    {
      key: "artemis",
      name: { en: "Artemis Program", ja: "アルテミス計画" },
      definitionForLlm:
        "news directly tied to the Western & Japanese Artemis programs — humanity's return to the Moon. Use ONLY when the article is specifically about Artemis / lunar return.",
      fallback: ["space-tech", "research"],
      coverPool: [
        { id: "1451187580459-43490279c0fa", tone: "#0d0f12" },
        { id: "1446776877081-d282a0f896e2", tone: "#0c0c0e" },
        { id: "1532153975070-2e9ab71f1b14", tone: "#0e0e10" },
        { id: "1454789548928-9efd52dc4031", tone: "#0b0b0d" },
        { id: "1614728894747-a83421e2b9c9", tone: "#0c0c0e" },
        { id: "1614314107768-6018061b5b72", tone: "#101012" },
        { id: "1532012197267-da84d127e765", tone: "#0d0d0f" },
        { id: "1419242902214-272b3f66ee7a", tone: "#08080a" }
      ]
    },
    {
      key: "culture",
      name: { en: "Space Culture", ja: "スペースカルチャー" },
      definitionForLlm:
        "post-migration culture, lifestyle, design, fashion, gossip, and SF-tinged speculation about what life off-world will be.",
      fallback: ["space-tech", "artemis"],
      coverPool: [
        { id: "1503342217505-b0a15ec3261c", tone: "#1a1a1a" },
        { id: "1485827404703-89b55fcc595e", tone: "#0c0c0c" },
        { id: "1518709268805-4e9042af2176", tone: "#161616" },
        { id: "1492321936769-b49830bc1d1e", tone: "#0e0e0e" },
        { id: "1542038784456-1ea8e935640e", tone: "#0d0d0d" },
        { id: "1517423440428-a5a00ad493e8", tone: "#121212" },
        { id: "1545063328-c8e3faffa16f", tone: "#0c0c0c" },
        { id: "1554995207-c18c203602cb", tone: "#0a0a0a" },
        { id: "1531297484001-80022131f5a1", tone: "#101010" },
        { id: "1505373877841-8d25f7d46678", tone: "#0b0b0b" }
      ]
    },
    {
      key: "research",
      name: { en: "Research", ja: "論文" },
      definitionForLlm: "scientific papers and technical preprints (arXiv etc.).",
      fallback: ["space-tech", "artemis"],
      coverPool: [
        { id: "1543722530-d2c3201371e7", tone: "#101010" },
        { id: "1462331940025-496dfbfc7564", tone: "#0a0a0c" },
        { id: "1444703686981-a3abbc4d4fe3", tone: "#0c0c0e" },
        { id: "1505506874110-6a7a69069a08", tone: "#0a0a0c" },
        { id: "1532618793091-ec5fe9635fbd", tone: "#0d0d0f" },
        { id: "1481026469463-66327c86e544", tone: "#0e0e10" },
        { id: "1502134249126-9f3755a50d78", tone: "#0a0a0a" },
        { id: "1451187580459-43490279c0fa", tone: "#0c0c0e" } // intentional shared fallback w/ artemis
      ]
    }
  ] as const,

  /* ----------------------------------------------------------- LEGACY MAP
     Old generated JSON entries may carry obsolete category strings. Map them
     to a current category so the renderer doesn't drop them. */
  legacyCategoryMap: {
    architecture: "culture",
    interview: "culture",
    exploration: "research"
  } as Record<string, string>,

  /* ----------------------------------------------------------------- PIPELINE
     Sources + voice + image-host allowlist. The cron-publisher reads all of
     this verbatim. To add a new outlet, just append to `sources`.
     ---------------------------------------------------------------------- */
  pipeline: {
    /* Reusable relevance regexes — referenced from a source's `filter`. */
    relevanceFilters: {
      space:
        /\b(space|spacex|nasa|jaxa|esa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|satellite|cosmos|cosmic|cosmonaut|astronaut|spacecraft|spacesuit|telescope|asteroid|exoplanet|cislunar|interplanetary|microgravity|zero-?g|space station|gateway|starship|falcon|artemis|blue origin|sierra|axiom|orbital|extraterrestrial)\b/i,
      spaceOrHabitat:
        /\b(space|spacex|nasa|jaxa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|astronaut|spacecraft|spacesuit|cosmonaut|extraterrestrial|cislunar|space station|space habitat|lunar habitat|martian habitat|off[- ]world|off[- ]planet|zero-?g|microgravity|starship)\b/i
    },

    sources: [
      {
        name: "NASA Artemis",
        url: "https://www.nasa.gov/missions/artemis/feed/",
        parse: "rss",
        category: "artemis",
        framing:
          "(NASA Artemis program update — read past the press release for the new normal it implies)"
      },
      {
        name: "Space.com",
        url: "https://www.space.com/feeds/all",
        parse: "rss",
        category: "space-tech",
        // Space.com's `/feeds/all` is a firehose that includes their
        // `/entertainment/` vertical (Spider-Man Noir, Lobo from Supergirl,
        // Apple TV space-themed shows, etc.). The LLM, given an entertainment
        // title and asked to produce a serious space dispatch, was hallucinating
        // entire articles. We refuse those URLs at fetch time.
        excludeLinkPattern: /\/entertainment\//i,
        framing: "(general space news — find the cultural fact inside the engineering update)"
      },
      {
        name: "arXiv",
        url:
          "https://export.arxiv.org/api/query?search_query=cat:astro-ph.CO+OR+cat:astro-ph.EP" +
          "&sortBy=submittedDate&sortOrder=descending&max_results=20",
        parse: "atom",
        category: "research",
        framing:
          "(scientific preprint — translate the finding into its lived implication, not its methodology)"
      },
      {
        name: "TechCrunch",
        url: "https://techcrunch.com/category/space/feed/",
        parse: "rss",
        category: "space-tech",
        framing: "(private-space business news — read as cultural history, not industry trade)"
      },
      {
        name: "Futurism",
        url: "https://futurism.com/feed",
        parse: "rss",
        category: "culture",
        filter:
          /\b(space|spacex|nasa|jaxa|esa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|satellite|cosmos|cosmic|cosmonaut|astronaut|spacecraft|spacesuit|telescope|asteroid|exoplanet|cislunar|interplanetary|microgravity|zero-?g|space station|gateway|starship|falcon|artemis|blue origin|sierra|axiom|orbital|extraterrestrial)\b/i,
        framing: "(speculative future-of-life column — keep grounded, calm-skeptical)"
      },
      {
        name: "Dezeen",
        url: "https://www.dezeen.com/feed/",
        parse: "rss",
        category: "culture",
        filter:
          /\b(space|spacex|nasa|jaxa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|astronaut|spacecraft|spacesuit|cosmonaut|extraterrestrial|cislunar|space station|space habitat|lunar habitat|martian habitat|off[- ]world|off[- ]planet|zero-?g|microgravity|starship)\b/i,
        framing:
          "(design / architecture — aesthetics are the content; describe materials and gestures)"
      },
      {
        name: "Ars Technica",
        url: "https://feeds.arstechnica.com/arstechnica/science",
        parse: "rss",
        category: "space-tech",
        filter:
          /\b(space|spacex|nasa|jaxa|esa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|satellite|cosmos|cosmic|cosmonaut|astronaut|spacecraft|spacesuit|telescope|asteroid|exoplanet|cislunar|interplanetary|microgravity|zero-?g|space station|gateway|starship|falcon|artemis|blue origin|sierra|axiom|orbital|extraterrestrial)\b/i,
        framing:
          "(technical longform — Elon/SpaceX coverage often runs here; keep the tone literate, never breathless)"
      },
      {
        name: "The Verge",
        url: "https://www.theverge.com/space/rss/index.xml",
        parse: "rss",
        category: "space-tech",
        framing:
          "(pop-tech and gossip-adjacent space stories — treat personality news with calm distance, not amplification)"
      },
      {
        name: "SpaceNews",
        url: "https://spacenews.com/feed/",
        parse: "rss",
        category: "space-tech",
        framing:
          "(industry trade publication, often political — note which country, which agency, which appropriations bill; geopolitics matters)"
      },
      {
        name: "Payload",
        url: "https://payloadspace.com/feed/",
        parse: "rss",
        category: "space-tech",
        framing:
          "(commercial-space business — funding, deals, market structure; read for what it implies about who flies and at what price)"
      },
      {
        name: "ESA",
        url: "https://www.esa.int/rssfeed/Our_Activities/Space_News",
        parse: "rss",
        category: "space-tech",
        framing:
          "(European Space Agency — categorise as 'artemis' when about lunar return cooperation; otherwise 'space-tech'. Note European perspective explicitly)"
      }
    ] as SourceDef[],

    /** Image hosts the deployed `next/image` is allowed to render. Keep in
     *  sync with next.config.ts → images.remotePatterns. */
    allowedImageHosts: [
      "images.unsplash.com",
      "source.unsplash.com",
      "nasa.gov",
      "**.nasa.gov",
      "esa.int",
      "**.esa.int",
      "space.com",
      "**.space.com",
      "**.futurecdn.net",
      "arxiv.org",
      "**.arxiv.org",
      "techcrunch.com",
      "**.techcrunch.com",
      "futurism.com",
      "**.futurism.com",
      "dezeen.com",
      "**.dezeen.com",
      "arstechnica.com",
      "**.arstechnica.com",
      "**.arstechnica.net",
      "theverge.com",
      "**.theverge.com",
      "**.vox-cdn.com",
      "spacenews.com",
      "**.spacenews.com",
      "payloadspace.com",
      "**.payloadspace.com",
      "**.substack.com",
      "**.substackcdn.com",
      "**.wp.com",
      "**.wordpress.com",
      "**.cloudfront.net",
      "**.akamaized.net",
      "**.imgix.net",
      "**.cdninstagram.com"
    ],

    /* -------- VOICE -------- The LLM system prompt is composed from this. */
    voice: {
      /** Sentence describing what the magazine covers (subject + format). */
      premise:
        "ARTEMIS TOKYO, an independent bilingual (English / Japanese) editorial chronicling space migration and the culture forming around it.",
      /** Tone of voice paragraph. */
      toneOfVoice:
        "A fusion of *The Business of Fashion* and the Japanese editorial sensibility of *Brutus*, *Casa Brutus*, and *Eureka*: restrained, intelligent, slightly literary, culturally aware.\n- No exclamation marks. No marketing voice. No corporate \"innovate / disrupt / revolutionize\" verbs.\n- Short declarative sentences alternating with one longer reflective sentence.\n- Permit ONE slightly literary line per piece — observational, never performative. Earn the line; do not perform it.\n- Avoid clichés: \"groundbreaking\", \"stunning\", \"game-changing\", \"the future is here\", \"paradigm shift\", \"race to the stars\".",
      /** The framing question every article must answer somewhere. */
      framingQuestion:
        '"What does this mean for the people who will actually live, work, eat, sleep, dress, design, conduct business, raise children, and mourn off-world?"',
      framingExpansion:
        "Not \"humanity will reach for the stars\" — specifically: what concrete thing changes? A price? A material? A profession? A piece of architecture? A new luxury? A new anxiety? A texture, a fabric, a smell, a wage, a habit, a measurement of time?\n\nThe article is not interesting because rockets are interesting. It is interesting because the next generation of human culture is being written in their wake.",
      /** Composition rules. */
      compositionRules:
        '- Body: 5–8 SELF-CONTAINED paragraphs in each language. A reader who never clicks through to the source must come away knowing exactly what happened, who is involved, the named mission or spacecraft or program, the concrete numbers, the timeline, and why it matters. Treat this article as the primary record, not a summary that points elsewhere.\n- Open by setting a scene, framing a tension, or naming a concrete detail — NOT by repeating the article title.\n- Required factual coverage somewhere in the body (omit ONLY if the source genuinely doesn\'t have it, never fabricate): who (agency / company / named individuals), when (specific date or window), where (launch site / destination), the specific mission / spacecraft / program name, at least one concrete measured number (altitude, payload mass, cost, crew size, distance, scheduled date), and a named comparison to a prior mission or program.\n- Bring ONE sensory image or concrete detail per piece — a specific texture, a measured distance, a named material, a domestic gesture, a price.\n- The Japanese version must be fully understandable in Japanese alone — readers who never look at the English version must come away with the same complete understanding. Do not leave context implicit because it appears in the English version.\n- Optionally include ONE "## subheading" line (e.g. "## What it means in Tokyo") and ONE "> pull-quote" line (a SHORT, direct sentence drawn from the original dispatch — quoting the source verbatim is encouraged, attributed generically as "the original report" / "原文より").\n- Do NOT fabricate statistics, quotes, names of real people, dates, or place names. If a fact is not in the source, omit it entirely. It is better to be quiet than wrong.\n- No URLs, no footnotes, no hashtags, no emojis.',
      /** Japanese-specific rules. */
      japaneseRules:
        "- The Japanese is a PARALLEL piece in Japanese editorial idiom — NOT a translation of the English. They must answer the same news but in their own native rhythm.\n- Use clean modern Japanese (常体 mostly, with occasional 〜だろう / 〜である).\n- Mix kanji and hiragana naturally. Avoid katakana-jargon overload — but do not hesitate to leave proper nouns (e.g. SpaceX, Dezeen, NASA) in roman script.\n- Punctuation: use 「」for quoted phrases, — (em-dash) for editorial asides.",
      /** Closing "view from {city}" block — the magazine's signature commentary. */
      closingBlock: {
        /** Visible heading rendered on each article page. */
        title: { en: "The Tokyo Editor's View", ja: "東京編集部の視点" },
        /** Sub-heading rendered just below the title. */
        subheading: {
          en: "What this dispatch could mean for Tokyo in the years ahead.",
          ja: "この一報は、近い将来、東京の暮らしに何をもたらしうるか。"
        },
        /** Key in the LLM JSON output (the tokyo_view_* fields). */
        outputKey: "tokyo_view",
        /** Detailed rules for what the LLM must put in this block. */
        rules:
          "Every article ends with a SEPARATE, signed editorial commentary block titled \"The Tokyo Editor's View\" / \"東京編集部の視点\" (rendered apart from the main body by the front-end).\n\nThis block is the magazine's plain-language editorial commentary on the space news — written for readers living in Tokyo, in a register a 60-year-old and a 10-year-old can both follow.\n\nNO aerospace jargon without a parenthetical translation. Avoid 'paradigm shift', 'humanity's next frontier', 'the race to the stars', 'stunning achievement'. If 'delta-v', 'low Earth orbit', 'cryogenic propellant' is genuinely necessary, gloss it the first time. In Japanese use です・ます (warm explainer register) even though the body uses 常体. In English use plain, direct second person. This block opines warmly; the body reports.\n\nABSOLUTE RULE — speak to Tokyo readers in the ABSTRACT only.\n  - DO write: 「東京で暮らす読者にとって」「Tokyo readers」.\n  - DO NOT write: specific occupations, neighbourhoods, ages tied to occupations, or other demographic personas. Forbidden: 'salaryman in Saitama', 'school teacher in Nerima', 'grandmother in Sugamo', 'a balcony in Setagaya', 'your aunt who reads the Asahi Shimbun', or any analogous construction. These read as stereotyping. The Tokyo reader is one reader, treated as one reader.\n\nIT IS A GIVEN that most space-related news does not immediately change daily life on the ground in Tokyo — do NOT spend a paragraph saying so. The block's job is to look forward: what plausible future impact, on what timeframe, with what gating factor.\n\nThe block MUST answer these FOUR questions in order, in 4–6 paragraphs per language, each question taking roughly one paragraph:\n\n(1) WHAT HAPPENED, IN PLAIN WORDS — Re-explain the news without aerospace jargon. Use everyday analogies the reader already understands (a delivery truck that flies itself to the Moon; a fuel tank as tall as Tokyo Skytree; a parking lot in orbit; a satellite the size of a refrigerator). NOT a summary of the article — a TRANSLATION of it into ordinary Japanese.\n\n(2) WHAT PLAUSIBLE NEAR-FUTURE IMPACT FOR TOKYO READERS — Look ahead, not at today. Name 1–3 concrete DOMAINS where Tokyo readers might feel this — GPS-using services, mobile network latency, weather forecasting, semiconductor and rare-metal supply, satellite TV / radio, disaster early-warning, the visible night sky, downstream materials science, the price of insurance for orbital assets, Japan's diplomatic stance on space resources. Be specific about the KIND of change (cheaper, more accurate, available domestically, available to private companies). Name the system, service, or industrial sector — not a person.\n\n(3) ON WHAT TIMEFRAME — Give an honest interval with a gating factor. Examples: 'within 18 months, once Japan's H3 reaches comparable cadence'; '3–5 years, once the cost per kilogram to LEO falls another 50%'; '5–10 years, gated by an international resource-rights agreement Japan is currently observing rather than driving'; 'already today — Mitsubishi Heavy Industries licensed the underlying material in 2023'. Don't hedge. Name the specific bottleneck (a JAXA budget decision / a Mitsubishi licensing deal / a Diet vote / a domestic test flight) when you can.\n\n(4) JAPANESE COUNTERPART — Name a SPECIFIC Japanese company, organisation, or programme already moving in a comparable direction. Choose accurately from: JAXA, the H3 rocket programme, MMX (Martian Moons eXploration), ispace, Astroscale, Synspective, PD AeroSpace, Interstellar Technologies, Mitsubishi Heavy Industries, IHI Aerospace, the Japanese Artemis astronaut selection, the University of Tokyo, the National Astronomical Observatory of Japan, METI's space industry policy — or a clearly relevant alternative. Do NOT force a name; if no Japanese counterpart exists yet, say so plainly and name the closest adjacent player and what gap remains.\n\nTone: warm, concrete, useful, forward-looking. NO empty patriotism. NO defeatism. NO 'in conclusion' / 'in summary' wrap-up sentences — end on a concrete observation, not a tidy closing.\n\nBoth languages must contain a Japan-grounded comparison. The Japanese version is the primary one (this is Tokyo's own magazine); the English version is its parallel for foreign readers — write each natively, not as a translation of the other."
      }
    }
  },

  /* ---------------------------------------------------------------- CRON
     UTC schedule consumed by .github/workflows/daily-publish.yml.
     17-minute offset avoids GitHub Actions on-the-hour deprioritization. */
  cron: {
    /** Cron expression in UTC, used in the GitHub Actions workflow. */
    utc: "17 21 * * *",
    /** Human label for documentation and the empty-state copy. */
    localLabel: "06:00 JST"
  }
} as const;

/* ---------------------------------------------------------------------------
   Type derivations & helpers — these let the rest of the code stay strict
   without ever having to hard-code category strings.
   ------------------------------------------------------------------------- */
export type SiteConfig = typeof siteConfig;
export type CategoryKey = (typeof siteConfig.categories)[number]["key"];

/** Ordered list of category keys — used for nav, footer, sitemap, default sort. */
export const CATEGORY_ORDER: CategoryKey[] = siteConfig.categories.map(
  (c) => c.key
) as CategoryKey[];

/** Lookup helper. */
export const getCategoryDef = (key: string): CategoryDef | undefined =>
  siteConfig.categories.find((c) => c.key === key) as CategoryDef | undefined;

/** Map a category key (current or legacy) onto a current key. */
export const normalizeCategory = (v: unknown): CategoryKey => {
  if (typeof v !== "string") return CATEGORY_ORDER[0];
  if ((CATEGORY_ORDER as readonly string[]).includes(v)) return v as CategoryKey;
  const mapped = siteConfig.legacyCategoryMap[v];
  if (mapped && (CATEGORY_ORDER as readonly string[]).includes(mapped)) {
    return mapped as CategoryKey;
  }
  return CATEGORY_ORDER[0];
};

/** Map of category keys → bilingual name. Convenience for components. */
export const categoryNames: Record<CategoryKey, Bilingual> = Object.fromEntries(
  siteConfig.categories.map((c) => [c.key, c.name])
) as Record<CategoryKey, Bilingual>;

/** Build the Unsplash URL for a given pool entry. The dimensions and quality
 *  are baked-in defaults; override at the call-site if needed. */
export const coverUrl = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2200&q=80`;
