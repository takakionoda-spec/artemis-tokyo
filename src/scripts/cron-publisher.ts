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

const LOOKBACK_HOURS = Number(process.env.CRON_LOOKBACK_HOURS ?? 168);
const MAX_PER_RUN = Number(process.env.CRON_MAX_PER_RUN ?? 6);
const RETAIN_ARTICLES = Number(process.env.CRON_RETAIN ?? 60);
const SEEN_RETAIN = Number(process.env.CRON_SEEN_RETAIN ?? 500);
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
  }
];

// Curated Unsplash fallback covers — one pool per category.
const COVER_POOL: Record<CategoryKey, { src: string; tone: string }[]> = {
  "space-tech": [
    { src: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=2200&q=80", tone: "#0d0d0f" },
    { src: "https://images.unsplash.com/photo-1517976547714-720226b864c1?auto=format&fit=crop&w=2200&q=80", tone: "#111111" }
  ],
  artemis: [
    { src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2200&q=80", tone: "#0d0f12" },
    { src: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=2200&q=80", tone: "#0d0d0f" }
  ],
  culture: [
    { src: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=2200&q=80", tone: "#1a1a1a" },
    { src: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=2200&q=80", tone: "#0c0c0c" },
    { src: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=2200&q=80", tone: "#161616" },
    { src: "https://images.unsplash.com/photo-1492321936769-b49830bc1d1e?auto=format&fit=crop&w=2200&q=80", tone: "#0e0e0e" },
    { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=2200&q=80", tone: "#0a0a0a" }
  ],
  research: [
    { src: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=2200&q=80", tone: "#08080a" },
    { src: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?auto=format&fit=crop&w=2200&q=80", tone: "#101010" }
  ]
};

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
  line (e.g. "## What it means in Tokyo") and ONE "> pull-quote" line (unattributed,
  or attributed generically like "an engineer on the program" / "プログラムのある技術者").
- Do NOT use the article title as the first body paragraph — that is redundant.
  Open instead by setting a scene, framing a tension, or naming a concrete detail.
- Bring ONE sensory image or concrete detail per piece — a specific texture, a
  measured distance, a named material, a domestic gesture, a price.
- Do NOT fabricate statistics, quotes, names of real people, dates, or place names.
  If a fact is not in the source, omit it entirely. It is better to be quiet than wrong.
- No URLs, no footnotes, no hashtags, no emojis.

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
  "tags": [{ "en": string, "ja": string }, ...],
  "category": one of: "space-tech" | "artemis" | "culture" | "research",
  "dateline_en": string,
  "dateline_ja": string,
  "reading_minutes": integer 3–9
}`;

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
      return "(NASA program update — read past the press release for the new normal it implies)";
    default:
      return "";
  }
}

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

function pickCover(item: RawItem, category: CategoryKey, existing: Article[]): { src: string; tone: string } {
  if (item.imageUrl && /^https?:\/\//.test(item.imageUrl)) {
    return { src: item.imageUrl, tone: "#0c0c0c" };
  }
  const pool = COVER_POOL[category] ?? COVER_POOL["space-tech"];
  const recent = existing.slice(0, 3).map((a) => a.cover.src);
  const fresh = pool.filter((c) => !recent.includes(c.src));
  const choice = (fresh.length > 0 ? fresh : pool)[Math.floor(Math.random() * (fresh.length > 0 ? fresh.length : pool.length))];
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

function assembleArticle(
  item: RawItem,
  llm: LlmOutput,
  existing: Article[],
  previous?: Article
): Article {
  const category: CategoryKey = isCategoryKey(llm.category) ? llm.category : item.category;
  const cover = pickCover(item, category, existing);
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
async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);

  log("info", `ARTEMIS TOKYO cron-publisher starting`, {
    provider: LLM_PROVIDER,
    model: LLM_PROVIDER === "openai" ? OPENAI_MODEL : GEMINI_MODEL,
    lookbackHours: LOOKBACK_HOURS,
    maxPerRun: MAX_PER_RUN,
    sources: SOURCES.map((s) => s.name),
    cutoff: cutoff.toISOString(),
    dryRun
  });

  const state = await readJson<State>(STATE_JSON, {
    seen: [],
    lastRunAt: null,
    lastSuccessAt: null,
    totalRuns: 0
  });
  const existing = await readJson<Article[]>(ARTICLES_JSON, []);

  log("info", `existing dataset`, {
    articles: existing.length,
    drafts: existing.filter((a) => a.status === "draft").length,
    emptyBody: existing.filter(bodyIsEmpty).length,
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

  // ---- 4) Edit through the LLM serially ----------------------
  const generated: Article[] = [];
  for (const { item, decision } of selected) {
    const tag =
      decision.action === "process" && decision.regenerate ? "[regen]" : "[new]  ";
    try {
      log("info", `${tag} editing: "${summarizeTitle(item.title)}"  [${item.source}]`);
      const llm = await callLlm(item);
      const previous = decision.action === "process" ? decision.previous : undefined;
      const article = assembleArticle(item, llm, [...generated, ...existing], previous);
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
