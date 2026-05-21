/* eslint-disable @typescript-eslint/no-explicit-any */
/* =============================================================
   ARTEMIS TOKYO — cron-publisher
   ---------------------------------------------------------------
   Pulls dispatches from a curated set of real sources, filters to
   items published in the last `CRON_LOOKBACK_HOURS` hours (default
   168h / 7 days), then asks an LLM (Gemini by default; OpenAI
   optional) to re-edit each item into bilingual BoF-toned prose,
   and writes the result to src/data/generated/articles.json.

   Sources:
     - NASA Artemis  (program updates)
     - Space.com     (general space news)
     - arXiv         (astro-ph preprints)
     - TechCrunch    (Space tag — private space business)
     - Futurism      (speculative future-of-life columns)
     - Dezeen        (design / architecture — filtered to space-adjacent)
   ============================================================= */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
type Lang = "en" | "ja";
type CategoryKey = "space-tech" | "artemis" | "culture" | "research";
type ArticleStatus = "draft" | "published";

type RawItem = {
  guid: string;
  source: string;
  category: CategoryKey;
  title: string;
  link: string;
  summary: string;
  publishedAt: string; // ISO
  imageUrl?: string;
};

type Article = {
  slug: string;
  category: CategoryKey;
  issue: string;
  publishedAt: string;
  readingMinutes: number;
  feature: boolean;
  cover: { src: string; tone: string };
  title: Record<Lang, string>;
  dek: Record<Lang, string>;
  author: Record<Lang, string>;
  location: Record<Lang, string>;
  tags: Record<Lang, string>[];
  body: Record<Lang, string[]>;
  /** ARTEMIS TOKYO editorial commentary block — appended to every article. */
  tokyoView?: Record<Lang, string[]>;
  source: { name: string; url: string };
  sourceGuid: string;
  status: ArticleStatus;
};

type State = {
  seen: string[];
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  totalRuns: number;
};

type SkipReason =
  | "outside-window"
  | "already-published"
  | "regenerate-missing"
  | "regenerate-draft"
  | "regenerate-empty"
  | "regenerate-no-tokyo-view"
  | "new"
  | "off-topic";

type SourceDescriptor = {
  name: string;
  url: string;
  parse: "rss" | "atom";
  category: CategoryKey;
  /** Optional relevance filter. If set, item title+summary must match. */
  filter?: RegExp;
};

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ARTICLES_JSON = path.join(ROOT, "src", "data", "generated", "articles.json");
const STATE_JSON = path.join(ROOT, "src", "data", "generated", "state.json");

// `--backfill` widens the defaults dramatically for a one-shot catch-up run.
const IS_BACKFILL = process.argv.includes("--backfill");
// `--retrofit-tokyo-view` skips the RSS pipeline entirely and only walks the
// existing articles.json, patching tokyoView onto every article missing it.
const IS_RETROFIT_TOKYO_VIEW = process.argv.includes("--retrofit-tokyo-view");
const LOOKBACK_HOURS = Number(process.env.CRON_LOOKBACK_HOURS ?? (IS_BACKFILL ? 720 : 168));
const MAX_PER_RUN = Number(process.env.CRON_MAX_PER_RUN ?? (IS_BACKFILL ? 30 : 10));
const RETAIN_ARTICLES = Number(process.env.CRON_RETAIN ?? 80);
const SEEN_RETAIN = Number(process.env.CRON_SEEN_RETAIN ?? 800);
const LLM_DELAY_MS = Number(process.env.CRON_LLM_DELAY_MS ?? 1200);
const VERBOSE = process.env.CRON_VERBOSE !== "false";

const LLM_PROVIDER = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// Relevance filters for non-space-native sources.
const SPACE_KEYWORDS =
  /\b(space|spacex|nasa|jaxa|esa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|satellite|cosmos|cosmic|cosmonaut|astronaut|spacecraft|spacesuit|telescope|asteroid|exoplanet|cislunar|interplanetary|microgravity|zero-?g|space station|gateway|starship|falcon|artemis|blue origin|sierra|axiom|orbital|extraterrestrial)\b/i;

const SPACE_OR_HABITAT_KEYWORDS =
  /\b(space|spacex|nasa|jaxa|mars|martian|moon|lunar|orbit\w*|astro\w*|rocket|launch\w*|astronaut|spacecraft|spacesuit|cosmonaut|extraterrestrial|cislunar|space station|space habitat|lunar habitat|martian habitat|off[- ]world|off[- ]planet|zero-?g|microgravity|starship)\b/i;

// ---------------------------------------------------------------
// Source registry — single source of truth for the crawler
// ---------------------------------------------------------------
const SOURCES: SourceDescriptor[] = [
  {
    name: "NASA Artemis",
    url: "https://www.nasa.gov/missions/artemis/feed/",
    parse: "rss",
    category: "artemis"
  },
  {
    name: "Space.com",
    url: "https://www.space.com/feeds/all",
    parse: "rss",
    category: "space-tech"
  },
  {
    name: "arXiv",
    url:
      "https://export.arxiv.org/api/query?search_query=cat:astro-ph.CO+OR+cat:astro-ph.EP" +
      "&sortBy=submittedDate&sortOrder=descending&max_results=20",
    parse: "atom",
    category: "research"
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/category/space/feed/",
    parse: "rss",
    category: "space-tech"
  },
  {
    name: "Futurism",
    url: "https://futurism.com/feed",
    parse: "rss",
    category: "culture",
    filter: SPACE_KEYWORDS
  },
  {
    name: "Dezeen",
    url: "https://www.dezeen.com/feed/",
    parse: "rss",
    category: "culture",
    filter: SPACE_OR_HABITAT_KEYWORDS
  },
  // ── Round 2 expansion: gossip / Elon-SpaceX / international politics ──
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/science",
    parse: "rss",
    category: "space-tech",
    filter: SPACE_KEYWORDS
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/space/rss/index.xml",
    parse: "rss",
    category: "space-tech"
  },
  {
    name: "SpaceNews",
    url: "https://spacenews.com/feed/",
    parse: "rss",
    category: "space-tech"
  },
  {
    name: "Payload",
    url: "https://payloadspace.com/feed/",
    parse: "rss",
    category: "space-tech"
  },
  {
    name: "ESA",
    url: "https://www.esa.int/rssfeed/Our_Activities/Space_News",
    parse: "rss",
    category: "space-tech"
  }
];

// Curated Unsplash fallback covers — one pool per category.
//
// Invariants (enforced at module load — see assertCoverPoolDistinct() below):
//   1. Every photo ID is on EXACTLY ONE pool. No cross-category overlap.
//      A single ID appearing in two pools is the bug that, in early
//      May 2026, gave us 5 articles sharing the same rocket-landing photo.
//   2. Every photo ID uses Unsplash's documented numeric-dash-hex form
//      `{timestamp}-{12 hex chars}`. Truncated IDs (e.g. `1505254-...`)
//      404 in production and have been removed.
//   3. Each pool holds at least 8 distinct entries so a 30-article backfill
//      run can complete without a single repeat.
const U = (id: string, tone: string) => ({
  src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2200&q=80`,
  tone
});

const COVER_POOL: Record<CategoryKey, { src: string; tone: string }[]> = {
  // Rockets, launch pads, satellites, private-space engineering.
  "space-tech": [
    U("1614728263952-84ea256f9679", "#0d0d0f"),
    U("1517976547714-720226b864c1", "#111111"),
    U("1516331138075-f3adc1e149cd", "#0c0d0f"),
    U("1457364887197-9150188c107b", "#0e0f12"),
    U("1517976487492-5750f3195933", "#101011"),
    U("1581922814484-0b4838f8a45a", "#0a0a0c"),
    U("1517976384346-3136801d605d", "#0c0c0e"),
    U("1538300342682-cf57afb97285", "#0d0e10"),
    U("1564053489984-317bbd824340", "#0a0a0a")
  ],
  // Moon, Earth-from-orbit, lunar-program imagery.
  artemis: [
    U("1451187580459-43490279c0fa", "#0d0f12"),
    U("1446776877081-d282a0f896e2", "#0c0c0e"),
    U("1532153975070-2e9ab71f1b14", "#0e0e10"),
    U("1454789548928-9efd52dc4031", "#0b0b0d"),
    U("1614728894747-a83421e2b9c9", "#0c0c0e"),
    U("1614314107768-6018061b5b72", "#101012"),
    U("1532012197267-da84d127e765", "#0d0d0f"),
    U("1419242902214-272b3f66ee7a", "#08080a")
  ],
  // Architecture, interior, fashion, urban Tokyo, design objects.
  culture: [
    U("1503342217505-b0a15ec3261c", "#1a1a1a"),
    U("1485827404703-89b55fcc595e", "#0c0c0c"),
    U("1518709268805-4e9042af2176", "#161616"),
    U("1492321936769-b49830bc1d1e", "#0e0e0e"),
    U("1542038784456-1ea8e935640e", "#0d0d0d"),
    U("1517423440428-a5a00ad493e8", "#121212"),
    U("1545063328-c8e3faffa16f", "#0c0c0c"),
    U("1554995207-c18c203602cb", "#0a0a0a"),
    U("1531297484001-80022131f5a1", "#101010"),
    U("1505373877841-8d25f7d46678", "#0b0b0b")
  ],
  // Laboratory, telescopes, deep-sky, scientific instruments.
  research: [
    U("1543722530-d2c3201371e7", "#101010"),
    U("1462331940025-496dfbfc7564", "#0a0a0c"),
    U("1444703686981-a3abbc4d4fe3", "#0c0c0e"),
    U("1505506874110-6a7a69069a08", "#0a0a0c"),
    U("1532618793091-ec5fe9635fbd", "#0d0d0f"),
    U("1481026469463-66327c86e544", "#0e0e10"),
    U("1502134249126-9f3755a50d78", "#0a0a0a"),
    U("1451187580459-43490279c0fa", "#0c0c0e") // safe fallback
  ]
};

// Self-check: log loud and exit-noisy if a future edit accidentally
// reintroduces a cross-category duplicate.
(function assertCoverPoolDistinct() {
  const seen = new Map<string, CategoryKey>();
  const dupes: { src: string; first: CategoryKey; second: CategoryKey }[] = [];
  // We tolerate ONE deliberate fallback overlap (the last entry of `research`
  // is shared with `artemis` to keep the pool full); call that out by index.
  for (const cat of Object.keys(COVER_POOL) as CategoryKey[]) {
    COVER_POOL[cat].forEach((c, i) => {
      const prior = seen.get(c.src);
      if (prior && !(cat === "research" && i === COVER_POOL.research.length - 1)) {
        dupes.push({ src: c.src, first: prior, second: cat });
      }
      seen.set(c.src, cat);
    });
  }
  if (dupes.length > 0) {
    console.warn(
      "⚠ COVER_POOL contains cross-category duplicate(s) — fix in cron-publisher.ts:",
      dupes
    );
  }
})();

/* =========================================================
   Allowlist of image hosts that next/image can render.
   Keep this in sync with next.config.ts → images.remotePatterns.
   If a source publishes an image URL whose host is NOT here,
   the cron will silently fall back to a curated Unsplash cover
   so the production site never shows a broken image icon.
   ========================================================= */
const ALLOWED_IMAGE_HOSTS: string[] = [
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
];

function matchHostPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith("**.")) {
    const apex = pattern.slice(3);
    return hostname === apex || hostname.endsWith("." + apex);
  }
  return hostname === pattern;
}

function isAllowedImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_IMAGE_HOSTS.some((p) => matchHostPattern(u.hostname, p));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------
// Logging
// ---------------------------------------------------------------
const log = (level: "info" | "warn" | "error" | "debug", msg: string, extra?: Record<string, unknown>) => {
  if (level === "debug" && !VERBOSE) return;
  const prefix = { info: "•", warn: "⚠", error: "✗", debug: "·" }[level];
  const tag = level.toUpperCase().padEnd(5, " ");
  console.log(`${prefix} [${tag}] ${msg}${extra ? "  " + JSON.stringify(extra) : ""}`);
};

const summarizeTitle = (s: string, n = 78): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

// ---------------------------------------------------------------
// Tiny XML helpers
// ---------------------------------------------------------------
const decodeEntities = (s: string): string =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripTags = (s: string): string =>
  decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

const extractAll = (xml: string, tag: string): string[] => {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
};

const extractFirst = (xml: string, tag: string): string | null => {
  const m = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
  return m ? m[1] : null;
};

const extractAttr = (xml: string, tag: string, attr: string): string | null => {
  const m = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, "i").exec(xml);
  return m ? m[1] : null;
};

// ---------------------------------------------------------------
// Source fetcher
// ---------------------------------------------------------------
async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": "ARTEMIS-TOKYO-CronPublisher/1.0 (+https://artemis-tokyo.vercel.app)",
      Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function parseRssItems(xml: string, source: string, category: CategoryKey): RawItem[] {
  const items = extractAll(xml, "item");
  return items.map((raw) => {
    const title = stripTags(extractFirst(raw, "title") ?? "");
    const link = stripTags(extractFirst(raw, "link") ?? "");
    const description = stripTags(extractFirst(raw, "description") ?? "");
    const pub = extractFirst(raw, "pubDate") ?? extractFirst(raw, "dc:date") ?? "";
    const guid = stripTags(extractFirst(raw, "guid") ?? "") || link;
    const enclosureUrl =
      extractAttr(raw, "enclosure", "url") ??
      extractAttr(raw, "media:content", "url") ??
      extractAttr(raw, "media:thumbnail", "url") ??
      undefined;
    return {
      guid: guid || `${source}:${title}`,
      source,
      category,
      title,
      link,
      summary: description,
      publishedAt: pub ? new Date(pub).toISOString() : new Date().toISOString(),
      imageUrl: enclosureUrl ?? undefined
    } satisfies RawItem;
  });
}

function parseAtomItems(xml: string, source: string, category: CategoryKey): RawItem[] {
  const entries = extractAll(xml, "entry");
  return entries.map((raw) => {
    const title = stripTags(extractFirst(raw, "title") ?? "");
    const summary = stripTags(extractFirst(raw, "summary") ?? "");
    const id = stripTags(extractFirst(raw, "id") ?? "");
    const updated = extractFirst(raw, "updated") ?? extractFirst(raw, "published") ?? "";
    return {
      guid: id,
      source,
      category,
      title,
      link: id,
      summary,
      publishedAt: updated ? new Date(updated).toISOString() : new Date().toISOString()
    } satisfies RawItem;
  });
}

async function fetchSource(s: SourceDescriptor): Promise<{
  source: string;
  raw: RawItem[];
  topical: RawItem[];
  filteredOut: number;
}> {
  const xml = await fetchText(s.url);
  const items =
    s.parse === "atom"
      ? parseAtomItems(xml, s.name, s.category)
      : parseRssItems(xml, s.name, s.category);
  if (!s.filter) {
    return { source: s.name, raw: items, topical: items, filteredOut: 0 };
  }
  const topical = items.filter((it) => s.filter!.test(it.title) || s.filter!.test(it.summary));
  return {
    source: s.name,
    raw: items,
    topical,
    filteredOut: items.length - topical.length
  };
}

// ---------------------------------------------------------------
// LLM — Gemini (default) or OpenAI
// ---------------------------------------------------------------
type LlmOutput = {
  title_en: string;
  title_ja: string;
  dek_en: string;
  dek_ja: string;
  body_en: string[];
  body_ja: string[];
  tokyo_view_en: string[];
  tokyo_view_ja: string[];
  tags: { en: string; ja: string }[];
  category: CategoryKey;
  dateline_en: string;
  dateline_ja: string;
  reading_minutes: number;
};

const SYSTEM_INSTRUCTIONS = `You are the senior editor of ARTEMIS TOKYO, an independent bilingual (English / Japanese) editorial chronicling space migration and the culture forming around it.

Re-edit the supplied dispatch into a short, polished editorial piece in BOTH English and Japanese.

═══ Tone of voice ═══
A fusion of *The Business of Fashion* and the Japanese editorial sensibility of *Brutus*, *Casa Brutus*, and *Eureka*: restrained, intelligent, slightly literary, culturally aware.
- No exclamation marks. No marketing voice. No corporate "innovate / disrupt / revolutionize" verbs.
- Short declarative sentences alternating with one longer reflective sentence.
- Permit ONE slightly literary line per piece — observational, never performative. Earn the line; do not perform it.
- Avoid clichés: "groundbreaking", "stunning", "game-changing", "the future is here", "paradigm shift", "race to the stars".

═══ Editorial framing — the most important rule ═══
Every article must answer, somewhere within it (usually toward the end), this question:
  "What does this mean for the people who will actually live, work, eat, sleep,
   dress, design, conduct business, raise children, and mourn off-world?"

Not "humanity will reach for the stars" — specifically: what concrete thing changes?
A price? A material? A profession? A piece of architecture? A new luxury? A new anxiety?
A texture, a fabric, a smell, a wage, a habit, a measurement of time?

The article is not interesting because rockets are interesting. It is interesting because
the next generation of human culture is being written in their wake.

═══ Source-specific framing ═══
- arXiv (scientific preprints): Do NOT summarize the methodology or equations.
  Translate the finding into its lived implication. Lead with the human angle,
  then explain just enough physics to anchor it. Your reader is a Tokyo-based
  architect, curator, or designer — curious, cultured, not credentialed.
- TechCrunch / Futurism (private-space business, future-of-life columns):
  Treat company strategy as cultural history. Skip funding-round figures and
  share-price drama. Note instead what each move implies for *who* gets to go
  off-world, *on what terms*, *wearing what*, *eating what*. Treat speculative
  predictions with calm skepticism — never amplify hype.
- Dezeen (design / architecture): Aesthetics are the content. Describe textures,
  materials, spatial gestures, lighting, and thresholds in concrete terms. The
  story lives in the seam, in the cuff, in the doorframe.
- NASA / Space.com: Read past the press release. Find the cultural fact buried
  inside the engineering update — the new normal it implies.

═══ Categories (choose exactly one) ═══
- "space-tech":  general space technology — rockets, propulsion, satellites,
                 private-space business (SpaceX, Blue Origin, Axiom, etc.)
- "artemis":     news directly tied to the Western & Japanese Artemis programs
                 — humanity's return to the Moon. Use ONLY when the article is
                 specifically about Artemis / lunar return.
- "culture":     post-migration culture, lifestyle, design, fashion, gossip,
                 and SF-tinged speculation about what life off-world will be.
- "research":    scientific papers and technical preprints (arXiv etc.).

═══ Composition ═══
- Body: 4–7 short paragraphs in each language. Optionally include ONE "## subheading"
  line (e.g. "## What it means in Tokyo") and ONE "> pull-quote" line (a SHORT,
  direct sentence drawn from the original dispatch — quoting the source verbatim
  is encouraged, attributed generically as "the original report" / "原文より").
- Do NOT use the article title as the first body paragraph — that is redundant.
  Open instead by setting a scene, framing a tension, or naming a concrete detail.
- Bring ONE sensory image or concrete detail per piece — a specific texture, a
  measured distance, a named material, a domestic gesture, a price.
- Do NOT fabricate statistics, quotes, names of real people, dates, or place names.
  If a fact is not in the source, omit it entirely. It is better to be quiet than wrong.
- No URLs, no footnotes, no hashtags, no emojis.

═══ ARTEMIS TOKYO 視点 (tokyo_view) — required closing block ═══
Every article ends with a SEPARATE, signed editorial commentary block titled
"ARTEMIS TOKYO 視点" (rendered apart from the main body by the front-end).

This block is NOT a summary. It is the magazine's own first-person reading of
the dispatch *from Tokyo, in 2026*. It must:
  - Address the reader directly as ARTEMIS TOKYO (e.g. "ARTEMIS TOKYO の見立てでは…"
    / "From where we sit in Tokyo, this looks like…").
  - Compare or contrast the story against Japan's CURRENT realities:
    Japan's space programme (JAXA, H3, MMX, the Japanese Artemis astronaut
    selection), domestic industry (ispace, Astroscale, Synspective, PD AeroSpace,
    Interstellar), the urban texture of Tokyo (housing density, ageing
    population, design culture, hospitality, ramen-and-conbini infrastructure),
    or Japanese cultural sensibility (mono no aware, kintsugi, ma, wabi-sabi).
  - Name a CONCRETE Japanese reference where natural — a neighbourhood, a
    company, a policy, an industry, a habit, a season. Do not force it.
  - Be honest: if the news from abroad exposes a Japanese gap or
    advantage, say so plainly. No empty patriotism, no defeatism.
  - Length: 3–5 paragraphs per language. Slightly more personal in voice
    than the body; the body reports, this block opines.

Both languages must contain a Japan-grounded comparison. The Japanese version
is the primary one (this is Tokyo's own magazine); the English version is its
parallel for foreign readers — write each natively.

═══ Japanese rules ═══
- The Japanese is a PARALLEL piece in Japanese editorial idiom — NOT a translation
  of the English. They must answer the same news but in their own native rhythm.
- Use clean modern Japanese (常体 mostly, with occasional 〜だろう / 〜である).
- Mix kanji and hiragana naturally. Avoid katakana-jargon overload — but do not
  hesitate to leave proper nouns (e.g. SpaceX, Dezeen, NASA) in roman script.
- Punctuation: use 「」for quoted phrases, — (em-dash) for editorial asides.

═══ Output ═══
Output a SINGLE JSON object with exactly these keys (no markdown fences, no commentary):
{
  "title_en": string,
  "title_ja": string,
  "dek_en": string,
  "dek_ja": string,
  "body_en": string[],
  "body_ja": string[],
  "tokyo_view_en": string[],
  "tokyo_view_ja": string[],
  "tags": [{ "en": string, "ja": string }, ...],
  "category": one of: "space-tech" | "artemis" | "culture" | "research",
  "dateline_en": string,
  "dateline_ja": string,
  "reading_minutes": integer 3–9
}

Both \`tokyo_view_en\` and \`tokyo_view_ja\` are REQUIRED and must contain 3–5
paragraphs each. Empty arrays are not acceptable.`;

function describeSource(src: string): string {
  switch (src) {
    case "arXiv":
      return "(scientific preprint — translate the finding into its lived implication, not its methodology)";
    case "TechCrunch":
      return "(private-space business news — read as cultural history, not industry trade)";
    case "Futurism":
      return "(speculative future-of-life column — keep grounded, calm-skeptical)";
    case "Dezeen":
      return "(design / architecture — aesthetics are the content; describe materials and gestures)";
    case "Space.com":
      return "(general space news — find the cultural fact inside the engineering update)";
    case "NASA Artemis":
      return "(NASA Artemis program update — read past the press release for the new normal it implies)";
    case "Ars Technica":
      return "(technical longform — Elon/SpaceX coverage often runs here; keep the tone literate, never breathless)";
    case "The Verge":
      return "(pop-tech and gossip-adjacent space stories — treat personality news with calm distance, not amplification)";
    case "SpaceNews":
      return "(industry trade publication, often political — note which country, which agency, which appropriations bill; geopolitics matters)";
    case "Payload":
      return "(commercial-space business — funding, deals, market structure; read for what it implies about who flies and at what price)";
    case "ESA":
      return "(European Space Agency — categorise as 'artemis' when about lunar return cooperation; otherwise 'space-tech'. Note European perspective explicitly)";
    default:
      return "";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function userPromptForItem(item: RawItem): string {
  return `SOURCE: ${item.source} ${describeSource(item.source)}
ORIGINAL TITLE: ${item.title}
ORIGINAL DATE: ${item.publishedAt}
ORIGINAL SUMMARY:
${item.summary || "(no summary provided)"}

Re-edit this into the editorial form described above. Remember:
- The Japanese is a parallel piece in Japanese editorial idiom, not a translation.
- End the article with the implication for life / work / culture / business off-world.
- Do NOT repeat the title as the first body paragraph.
- Include at least one SHORT verbatim quotation from the original dispatch as a
  pull-quote (\`> ...\` line) in both languages.
- The closing block "tokyo_view_en" / "tokyo_view_ja" is MANDATORY and must
  compare the news against Japan's own space, urban, or cultural reality.

Respond with the JSON object only.`;
}

async function callGemini(item: RawItem): Promise<LlmOutput> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTIONS }] },
    contents: [{ role: "user", parts: [{ text: userPromptForItem(item) }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      responseMimeType: "application/json"
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data: any = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "";
  if (!text) throw new Error("Gemini returned empty content");
  return JSON.parse(text) as LlmOutput;
}

async function callOpenAI(item: RawItem): Promise<LlmOutput> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.7,
      top_p: 0.9,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: userPromptForItem(item) }
      ]
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return JSON.parse(text) as LlmOutput;
}

async function callLlm(item: RawItem): Promise<LlmOutput> {
  if (LLM_PROVIDER === "openai") return callOpenAI(item);
  return callGemini(item);
}

// ---------------------------------------------------------------
// Retrofit-only LLM call — generates just the ARTEMIS TOKYO 視点
// block for an article that already has good body copy. Used by
// `--retrofit-tokyo-view` to upgrade legacy articles without
// rewriting their headline or body.
// ---------------------------------------------------------------
type TokyoViewOutput = {
  tokyo_view_en: string[];
  tokyo_view_ja: string[];
};

const TOKYO_VIEW_SYSTEM = `You are the senior editor of ARTEMIS TOKYO, an
independent bilingual (English / Japanese) editorial covering space migration
and the culture forming around it.

You are given an already-edited article. Your single task is to compose its
closing commentary block titled "ARTEMIS TOKYO 視点". This block is the
magazine's own first-person reading of the dispatch from Tokyo, in 2026.

Rules:
- Address the reader directly as ARTEMIS TOKYO (e.g. "ARTEMIS TOKYO の見立てでは…"
  / "From where we sit in Tokyo, this looks like…").
- Compare or contrast the story against Japan's CURRENT realities: JAXA, H3,
  MMX, the Japanese Artemis astronaut selection, ispace, Astroscale,
  Synspective, PD AeroSpace, Interstellar, Tokyo housing density, ageing
  population, design culture, hospitality, ramen-and-conbini infrastructure,
  or Japanese sensibility (mono no aware, kintsugi, ma, wabi-sabi).
- Name ONE concrete Japanese reference where natural. Do not force it.
- Be honest about any gap or advantage Japan has on this topic.
- 3–5 paragraphs in each language.
- No fabricated names, numbers, or quotes. No URLs, no emojis, no headers.
- Tone: BoF × Brutus — restrained, intelligent, faintly literary.
- The Japanese version is the primary one; the English is its parallel.

Output a SINGLE JSON object with exactly these two keys:
{ "tokyo_view_en": string[], "tokyo_view_ja": string[] }
Both arrays MUST contain 3–5 paragraph strings.`;

function tokyoViewUserPromptFor(article: Article): string {
  const titleEn = article.title?.en ?? "";
  const titleJa = article.title?.ja ?? "";
  const dekEn = article.dek?.en ?? "";
  const dekJa = article.dek?.ja ?? "";
  const bodyEn = (article.body?.en ?? []).join("\n\n");
  const bodyJa = (article.body?.ja ?? []).join("\n\n");
  const srcName = article.source?.name ?? "(unknown)";
  return `ARTICLE TO COMMENT ON:

[CATEGORY] ${article.category}
[ORIGINAL SOURCE] ${srcName}

[EN TITLE] ${titleEn}
[EN DEK] ${dekEn}
[EN BODY]
${bodyEn || "(empty)"}

[JA TITLE] ${titleJa}
[JA DEK] ${dekJa}
[JA BODY]
${bodyJa || "(empty)"}

Now write the ARTEMIS TOKYO 視点 commentary block for this article.
Respond with the JSON object only.`;
}

async function callGeminiTokyoView(article: Article): Promise<TokyoViewOutput> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const body = {
    systemInstruction: { role: "system", parts: [{ text: TOKYO_VIEW_SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: tokyoViewUserPromptFor(article) }] }],
    generationConfig: {
      temperature: 0.75,
      topP: 0.9,
      responseMimeType: "application/json"
    }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data: any = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ??
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "";
  if (!text) throw new Error("Gemini returned empty content");
  return JSON.parse(text) as TokyoViewOutput;
}

async function callOpenAITokyoView(article: Article): Promise<TokyoViewOutput> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.75,
      top_p: 0.9,
      messages: [
        { role: "system", content: TOKYO_VIEW_SYSTEM },
        { role: "user", content: tokyoViewUserPromptFor(article) }
      ]
    })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned empty content");
  return JSON.parse(text) as TokyoViewOutput;
}

async function callLlmTokyoView(article: Article): Promise<TokyoViewOutput> {
  if (LLM_PROVIDER === "openai") return callOpenAITokyoView(article);
  return callGeminiTokyoView(article);
}

// ---------------------------------------------------------------
// Article assembly
// ---------------------------------------------------------------
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

/**
 * Build a frequency map of every cover URL currently used anywhere in the
 * dataset (counts repeats). Used by pickCover() to bias toward the
 * least-frequently-used pool entry rather than just "not in the last 10".
 */
function buildCoverFrequency(arr: Article[], extra: Set<string> = new Set()): Map<string, number> {
  const freq = new Map<string, number>();
  for (const a of arr) {
    if (a?.cover?.src) freq.set(a.cover.src, (freq.get(a.cover.src) ?? 0) + 1);
  }
  for (const s of extra) freq.set(s, (freq.get(s) ?? 0) + 1);
  return freq;
}

/**
 * Pick a cover image with three guarantees:
 *   1. The URL is on the next/image allowlist — no broken-image icons.
 *   2. The same image is never reused inside the current batch.
 *   3. Across the full dataset, the pool entry with the LOWEST usage count
 *      wins (ties broken randomly). This is the fix for the "5 articles
 *      share the same rocket-landing photo" bug we saw in May 2026 — even
 *      across multiple cron runs, the pool now self-balances.
 */
function pickCover(
  item: RawItem,
  category: CategoryKey,
  existing: Article[],
  usedInBatch: Set<string>
): { src: string; tone: string } {
  // Path A: source provided an image and its host is whitelisted.
  // We still refuse it if the URL already shows up in `existing` or the
  // current batch — repeated images are a worse failure mode than a slightly
  // off-brand stock cover.
  if (item.imageUrl && isAllowedImageUrl(item.imageUrl)) {
    const alreadyUsed =
      usedInBatch.has(item.imageUrl) ||
      existing.some((a) => a.cover?.src === item.imageUrl);
    if (!alreadyUsed) {
      usedInBatch.add(item.imageUrl);
      return { src: item.imageUrl, tone: "#0c0c0c" };
    }
  }

  // Path B: pick from the curated pool for this category, biased toward
  // the least-frequently-used entry across the whole dataset.
  // If the home pool is exhausted (every entry already in use), spill into
  // an adjacent pool — visually-aligned categories share a fallback so we
  // never deliver two identical covers.
  const FALLBACK: Record<CategoryKey, CategoryKey[]> = {
    "space-tech": ["artemis", "research"],
    artemis: ["space-tech", "research"],
    research: ["space-tech", "artemis"],
    culture: ["space-tech", "artemis"]
  };
  const homePool = COVER_POOL[category] ?? COVER_POOL["space-tech"];
  const freq = buildCoverFrequency(existing, usedInBatch);
  let pool = homePool.filter((c) => !usedInBatch.has(c.src));
  if (pool.length === 0) {
    // Overflow: walk fallback categories until we find unused entries.
    for (const fb of FALLBACK[category]) {
      const overflow = COVER_POOL[fb].filter((c) => !usedInBatch.has(c.src));
      if (overflow.length > 0) {
        pool = overflow;
        break;
      }
    }
  }
  if (pool.length === 0) pool = homePool; // ultimate last resort

  // Find the minimum usage count and pick uniformly among entries tied
  // for that minimum. This keeps the rotation fair even with small pools.
  const minUse = pool.reduce(
    (acc, c) => Math.min(acc, freq.get(c.src) ?? 0),
    Number.POSITIVE_INFINITY
  );
  const leastUsed = pool.filter((c) => (freq.get(c.src) ?? 0) === minUse);
  const choice = leastUsed[Math.floor(Math.random() * leastUsed.length)];
  usedInBatch.add(choice.src);
  return choice;
}

function makeIssueLabel(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const baseYear = 2026;
  const baseMonth = 0;
  const offset = (y - baseYear) * 12 + (m - baseMonth) + 1;
  const vol = Math.max(1, offset);
  return `Vol. ${String(vol).padStart(2, "0")}`;
}

function uniqueSlug(base: string, existing: Article[], preserveSlug?: string): string {
  if (preserveSlug) return preserveSlug;
  if (!base) base = "dispatch";
  const used = new Set(existing.map((a) => a.slug));
  if (!used.has(base)) return base;
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function isCategoryKey(v: unknown): v is CategoryKey {
  return v === "space-tech" || v === "artemis" || v === "culture" || v === "research";
}

function bodyIsEmpty(article: Article | undefined): boolean {
  if (!article) return true;
  const en = article.body?.en?.length ?? 0;
  const ja = article.body?.ja?.length ?? 0;
  return en === 0 || ja === 0;
}

/** Detects articles written before tokyoView was introduced. The cron will
 *  re-edit these through the LLM so they receive the closing commentary. */
function tokyoViewMissing(article: Article | undefined): boolean {
  if (!article) return true;
  const en = article.tokyoView?.en?.length ?? 0;
  const ja = article.tokyoView?.ja?.length ?? 0;
  return en === 0 || ja === 0;
}

/**
 * Repair existing articles whose cover URL is from a host that next/image
 * cannot render. Returns the patched array and a count of how many were
 * fixed so the caller can decide whether to rewrite the JSON.
 */
function sanitizeExistingCovers(arr: Article[]): { articles: Article[]; fixedCount: number } {
  const tempUsed = new Set<string>();
  let fixed = 0;
  const out = arr.map((a) => {
    if (a.cover?.src && isAllowedImageUrl(a.cover.src)) {
      tempUsed.add(a.cover.src);
      return a;
    }
    fixed++;
    const cat: CategoryKey = isCategoryKey(a.category) ? a.category : "space-tech";
    const pool = COVER_POOL[cat] ?? COVER_POOL["space-tech"];
    const candidates = pool.filter((c) => !tempUsed.has(c.src));
    const finalPool = candidates.length > 0 ? candidates : pool;
    const choice = finalPool[Math.floor(Math.random() * finalPool.length)];
    tempUsed.add(choice.src);
    return { ...a, cover: choice };
  });
  return { articles: out, fixedCount: fixed };
}

/**
 * Walks the dataset and, for every article whose cover URL is already used
 * by at least one earlier article, swaps it for the *least-used* pool entry
 * in that article's category. After this pass, every cover URL appears in
 * the dataset at most once (subject to pool size — if a category has more
 * articles than pool entries we simply fall back to the least-frequent
 * available cover).
 *
 * Newer articles keep their cover; older duplicates get re-assigned. That
 * ordering is intentional — re-shuffling the freshest cover would be more
 * visible to readers.
 */
function deduplicateExistingCovers(arr: Article[]): { articles: Article[]; reshuffled: number } {
  const FALLBACK: Record<CategoryKey, CategoryKey[]> = {
    "space-tech": ["artemis", "research"],
    artemis: ["space-tech", "research"],
    research: ["space-tech", "artemis"],
    culture: ["space-tech", "artemis"]
  };
  const sorted = [...arr].sort((a, b) =>
    (a.publishedAt ?? "") < (b.publishedAt ?? "") ? 1 : -1
  );
  const used = new Set<string>();
  let reshuffled = 0;
  const out = sorted.map((a) => {
    const cur = a.cover?.src;
    if (cur && isAllowedImageUrl(cur) && !used.has(cur)) {
      used.add(cur);
      return a;
    }
    // Need to swap.
    const cat: CategoryKey = isCategoryKey(a.category) ? a.category : "space-tech";
    let candidatePool: { src: string; tone: string }[] = (COVER_POOL[cat] ?? COVER_POOL["space-tech"]).filter(
      (c) => !used.has(c.src)
    );
    if (candidatePool.length === 0) {
      for (const fb of FALLBACK[cat]) {
        const overflow = COVER_POOL[fb].filter((c) => !used.has(c.src));
        if (overflow.length > 0) {
          candidatePool = overflow;
          break;
        }
      }
    }
    if (candidatePool.length === 0) candidatePool = COVER_POOL[cat] ?? COVER_POOL["space-tech"];
    const choice = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    used.add(choice.src);
    reshuffled++;
    return { ...a, cover: choice };
  });
  // Restore the original ordering of `arr` so downstream merge logic is
  // unaffected.
  const bySlug = new Map(out.map((a) => [a.slug, a]));
  const restored = arr.map((a) => bySlug.get(a.slug) ?? a);
  return { articles: restored, reshuffled };
}

function assembleArticle(
  item: RawItem,
  llm: LlmOutput,
  existing: Article[],
  usedCovers: Set<string>,
  previous?: Article
): Article {
  const category: CategoryKey = isCategoryKey(llm.category) ? llm.category : item.category;
  const cover = pickCover(item, category, existing, usedCovers);
  const otherExisting = existing.filter((a) => a.slug !== previous?.slug);
  const slug = uniqueSlug(slugify(llm.title_en || item.title), otherExisting, previous?.slug);

  return {
    slug,
    category,
    issue: makeIssueLabel(new Date(item.publishedAt)),
    publishedAt: item.publishedAt,
    readingMinutes: Math.max(3, Math.min(9, llm.reading_minutes || 5)),
    feature: previous?.feature ?? false,
    cover,
    title: { en: llm.title_en, ja: llm.title_ja },
    dek: { en: llm.dek_en, ja: llm.dek_ja },
    author: { en: "ARTEMIS TOKYO Editors", ja: "ARTEMIS TOKYO 編集部" },
    location: { en: llm.dateline_en || "Tokyo", ja: llm.dateline_ja || "東京" },
    tags: (llm.tags ?? []).slice(0, 4),
    body: { en: llm.body_en ?? [], ja: llm.body_ja ?? [] },
    tokyoView: {
      en: llm.tokyo_view_en ?? [],
      ja: llm.tokyo_view_ja ?? []
    },
    source: { name: item.source, url: item.link },
    sourceGuid: item.guid,
    status: "published"
  };
}

// ---------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const txt = await fs.readFile(file, "utf-8");
    return JSON.parse(txt) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------
// Triage
// ---------------------------------------------------------------
type Decision =
  | { action: "skip"; reason: SkipReason }
  | { action: "process"; reason: SkipReason; regenerate: boolean; previous?: Article };

function decide(
  item: RawItem,
  cutoff: Date,
  existing: Article[],
  seen: Set<string>
): Decision {
  if (new Date(item.publishedAt).getTime() < cutoff.getTime()) {
    return { action: "skip", reason: "outside-window" };
  }
  const previous = existing.find((a) => a.sourceGuid === item.guid);
  if (previous) {
    if (previous.status === "draft") {
      return { action: "process", reason: "regenerate-draft", regenerate: true, previous };
    }
    if (bodyIsEmpty(previous)) {
      return { action: "process", reason: "regenerate-empty", regenerate: true, previous };
    }
    if (tokyoViewMissing(previous)) {
      return { action: "process", reason: "regenerate-no-tokyo-view", regenerate: true, previous };
    }
    return { action: "skip", reason: "already-published" };
  }
  if (seen.has(item.guid)) {
    return { action: "process", reason: "regenerate-missing", regenerate: true };
  }
  return { action: "process", reason: "new", regenerate: false };
}

// ---------------------------------------------------------------
// Round-robin selection across sources (variety > recency)
// ---------------------------------------------------------------
type Candidate = { item: RawItem; decision: Decision };

function roundRobinSelect(candidates: Candidate[], max: number): Candidate[] {
  const bySource = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const arr = bySource.get(c.item.source) ?? [];
    arr.push(c);
    bySource.set(c.item.source, arr);
  }
  // Sort each source's items newest-first
  for (const arr of bySource.values()) {
    arr.sort((a, b) => (a.item.publishedAt < b.item.publishedAt ? 1 : -1));
  }
  const result: Candidate[] = [];
  let idx = 0;
  while (result.length < max) {
    let advanced = false;
    for (const arr of bySource.values()) {
      if (arr[idx]) {
        result.push(arr[idx]);
        advanced = true;
        if (result.length >= max) return result;
      }
    }
    if (!advanced) break;
    idx++;
  }
  return result;
}

// ---------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------
async function retrofitTokyoView(dryRun: boolean): Promise<void> {
  log("info", "RETROFIT TOKYO VIEW — scanning existing articles for missing commentary blocks");
  const rawExisting = await readJson<Article[]>(ARTICLES_JSON, []);
  // Run the same cover-repair passes first so the JSON is fully tidy.
  const sanitized = sanitizeExistingCovers(rawExisting);
  const dedup = deduplicateExistingCovers(sanitized.articles);
  const existing = dedup.articles;
  if (sanitized.fixedCount > 0 || dedup.reshuffled > 0) {
    log("info", `cover repair pass complete`, {
      sanitized: sanitized.fixedCount,
      deduplicated: dedup.reshuffled
    });
  }

  const targets = existing
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => tokyoViewMissing(a));
  log("info", `articles missing tokyoView`, { count: targets.length, total: existing.length });

  if (targets.length === 0) {
    if (!dryRun && (sanitized.fixedCount > 0 || dedup.reshuffled > 0)) {
      await writeJson(ARTICLES_JSON, existing);
    }
    log("info", "nothing to retrofit. done.");
    return;
  }

  let succeeded = 0;
  for (let n = 0; n < targets.length; n++) {
    if (n > 0 && LLM_DELAY_MS > 0) await sleep(LLM_DELAY_MS);
    const { a, i } = targets[n];
    try {
      log("info", `[retrofit ${n + 1}/${targets.length}] "${summarizeTitle(a.title?.ja || a.title?.en || a.slug)}"  [${a.source?.name ?? "?"}]`);
      const tv = await callLlmTokyoView(a);
      existing[i] = {
        ...a,
        tokyoView: { en: tv.tokyo_view_en ?? [], ja: tv.tokyo_view_ja ?? [] }
      };
      succeeded++;
    } catch (err) {
      log("error", `tokyoView retrofit failed for "${summarizeTitle(a.slug, 60)}"`, {
        reason: String(err).slice(0, 200)
      });
    }
  }

  log("info", `retrofit complete`, { attempted: targets.length, succeeded });
  if (dryRun) {
    log("info", "DRY RUN — not writing JSON.");
    return;
  }
  await writeJson(ARTICLES_JSON, existing);
  log("info", "✓ retrofit-tokyo-view complete.");
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  if (IS_RETROFIT_TOKYO_VIEW) {
    await retrofitTokyoView(dryRun);
    return;
  }

  log("info", `ARTEMIS TOKYO cron-publisher starting`, {
    provider: LLM_PROVIDER,
    model: LLM_PROVIDER === "openai" ? OPENAI_MODEL : GEMINI_MODEL,
    lookbackHours: LOOKBACK_HOURS,
    maxPerRun: MAX_PER_RUN,
    sources: SOURCES.length,
    sourceList: SOURCES.map((s) => s.name),
    cutoff: cutoff.toISOString(),
    backfill: IS_BACKFILL,
    dryRun
  });

  const state = await readJson<State>(STATE_JSON, {
    seen: [],
    lastRunAt: null,
    lastSuccessAt: null,
    totalRuns: 0
  });
  const rawExisting = await readJson<Article[]>(ARTICLES_JSON, []);

  // Auto-repair any cover URL that next/image cannot render. This catches
  // legacy entries whose cover host was added to the allowlist after the
  // article was written.
  const sanitized = sanitizeExistingCovers(rawExisting);
  // Then walk the dataset and break any cross-article duplicates so two
  // articles never share the same cover. This is the fix for the "5 articles
  // share the same rocket-landing photo" case we hit in May 2026.
  const dedup = deduplicateExistingCovers(sanitized.articles);
  const existing = dedup.articles;
  if (sanitized.fixedCount > 0 || dedup.reshuffled > 0) {
    log("info", `cover repair pass complete`, {
      sanitized: sanitized.fixedCount,
      deduplicated: dedup.reshuffled
    });
    if (!dryRun) await writeJson(ARTICLES_JSON, existing);
  }

  log("info", `existing dataset`, {
    articles: existing.length,
    drafts: existing.filter((a) => a.status === "draft").length,
    emptyBody: existing.filter(bodyIsEmpty).length,
    missingTokyoView: existing.filter(tokyoViewMissing).length,
    coversSanitized: sanitized.fixedCount,
    coversDeduplicated: dedup.reshuffled,
    seenGuids: state.seen.length
  });

  state.lastRunAt = now.toISOString();
  state.totalRuns += 1;

  // ---- 1) Fetch all sources concurrently ---------------------
  const fetched = await Promise.allSettled(SOURCES.map(fetchSource));
  const allItems: RawItem[] = [];
  fetched.forEach((r, i) => {
    const src = SOURCES[i];
    if (r.status === "fulfilled") {
      log("info", `fetched from ${src.name}`, {
        raw: r.value.raw.length,
        topical: r.value.topical.length,
        filteredOut: r.value.filteredOut
      });
      if (VERBOSE && r.value.topical.length > 0) {
        const oldest = r.value.topical.reduce((a, b) => (a.publishedAt < b.publishedAt ? a : b));
        const newest = r.value.topical.reduce((a, b) => (a.publishedAt > b.publishedAt ? a : b));
        log("debug", `  ${src.name} window`, {
          oldest: oldest.publishedAt,
          newest: newest.publishedAt
        });
      }
      allItems.push(...r.value.topical);
    } else {
      log("warn", `${src.name} fetch failed`, { reason: String(r.reason).slice(0, 200) });
    }
  });

  log("info", `total topical items fetched across sources`, { count: allItems.length });

  // ---- 2) Triage with reason logging -------------------------
  const seenSet = new Set(state.seen);
  const buckets: Record<SkipReason, RawItem[]> = {
    "outside-window": [],
    "already-published": [],
    "regenerate-missing": [],
    "regenerate-draft": [],
    "regenerate-empty": [],
    "regenerate-no-tokyo-view": [],
    "new": [],
    "off-topic": []
  };
  const candidates: Candidate[] = [];

  for (const item of allItems) {
    const d = decide(item, cutoff, existing, seenSet);
    buckets[d.reason].push(item);
    if (d.action === "process") {
      candidates.push({ item, decision: d });
    }
  }

  log("info", `triage`, {
    outsideWindow: buckets["outside-window"].length,
    alreadyPublished: buckets["already-published"].length,
    regenerateMissing: buckets["regenerate-missing"].length,
    regenerateDraft: buckets["regenerate-draft"].length,
    regenerateEmpty: buckets["regenerate-empty"].length,
    regenerateNoTokyoView: buckets["regenerate-no-tokyo-view"].length,
    new: buckets["new"].length
  });

  if (VERBOSE) {
    const showSamples = (label: string, items: RawItem[], n = 3) => {
      if (items.length === 0) return;
      log("debug", `  ${label} (${items.length})  — showing first ${Math.min(n, items.length)}`);
      items.slice(0, n).forEach((it) => {
        log("debug", `    · "${summarizeTitle(it.title)}"  [${it.source}]  ${it.publishedAt}`);
      });
    };
    showSamples("outside 7-day window", buckets["outside-window"]);
    showSamples("already-published (skipped)", buckets["already-published"]);
    showSamples("will regenerate (no prior article)", buckets["regenerate-missing"]);
    showSamples("will regenerate (status=draft)", buckets["regenerate-draft"]);
    showSamples("will regenerate (empty body)", buckets["regenerate-empty"]);
    showSamples("will regenerate (missing tokyoView)", buckets["regenerate-no-tokyo-view"]);
    showSamples("brand new", buckets["new"]);
  }

  if (candidates.length === 0) {
    log("info", "nothing to publish or regenerate; finalizing.");
    state.lastSuccessAt = now.toISOString();
    state.seen = Array.from(new Set(state.seen)).slice(0, SEEN_RETAIN);
    if (!dryRun) await writeJson(STATE_JSON, state);
    return;
  }

  // ---- 3) Round-robin select for source variety --------------
  const selected = roundRobinSelect(candidates, MAX_PER_RUN);

  log("info", `selected for LLM editing (round-robin across sources)`, {
    count: selected.length,
    bySource: selected.reduce<Record<string, number>>((acc, s) => {
      acc[s.item.source] = (acc[s.item.source] ?? 0) + 1;
      return acc;
    }, {}),
    capped: candidates.length > MAX_PER_RUN
  });

  // ---- 4) Edit through the LLM serially with throttling -------
  const generated: Article[] = [];
  const usedCovers = new Set<string>(); // batch-wide cover dedup
  for (let i = 0; i < selected.length; i++) {
    if (i > 0 && LLM_DELAY_MS > 0) await sleep(LLM_DELAY_MS); // be polite to the API
    const { item, decision } = selected[i];
    const tag =
      decision.action === "process" && decision.regenerate ? "[regen]" : "[new]  ";
    try {
      log("info", `${tag} editing ${i + 1}/${selected.length}: "${summarizeTitle(item.title)}"  [${item.source}]`);
      const llm = await callLlm(item);
      const previous = decision.action === "process" ? decision.previous : undefined;
      const article = assembleArticle(item, llm, [...generated, ...existing], usedCovers, previous);
      generated.push(article);
      if (!seenSet.has(item.guid)) state.seen.unshift(item.guid);
    } catch (err) {
      log("error", `LLM edit failed for "${summarizeTitle(item.title, 60)}"`, {
        reason: String(err).slice(0, 200)
      });
      if (!seenSet.has(item.guid)) state.seen.unshift(item.guid);
    }
  }

  if (generated.length === 0) {
    log("warn", "no articles successfully edited this run");
    state.seen = Array.from(new Set(state.seen)).slice(0, SEEN_RETAIN);
    if (!dryRun) await writeJson(STATE_JSON, state);
    return;
  }

  if (generated[0]) generated[0].feature = true;
  if (generated[1]) generated[1].feature = true;
  if (generated[2]) generated[2].feature = true;

  // ---- 5) Merge: replace by sourceGuid, dedupe by slug --------
  const newGuids = new Set(generated.map((a) => a.sourceGuid));
  const survivors = existing.filter((a) => !newGuids.has(a.sourceGuid));
  const merged: Article[] = [];
  const slugSet = new Set<string>();
  for (const a of [...generated, ...survivors]) {
    if (slugSet.has(a.slug)) continue;
    slugSet.add(a.slug);
    merged.push(a);
    if (merged.length >= RETAIN_ARTICLES) break;
  }

  state.seen = Array.from(new Set(state.seen)).slice(0, SEEN_RETAIN);
  state.lastSuccessAt = now.toISOString();

  log("info", `writing ${merged.length} article(s)`, {
    addedThisRun: generated.length,
    regenerated: generated.filter((a) =>
      existing.some((e) => e.sourceGuid === a.sourceGuid)
    ).length
  });

  if (dryRun) {
    log("info", "DRY RUN — skipping file writes. First generated article preview:");
    console.log(JSON.stringify(generated[0], null, 2));
    return;
  }

  await writeJson(ARTICLES_JSON, merged);
  await writeJson(STATE_JSON, state);

  log("info", "✓ cron-publisher complete.");
}

main().catch((err) => {
  log("error", "fatal", { reason: String(err).slice(0, 500) });
  process.exit(1);
});
