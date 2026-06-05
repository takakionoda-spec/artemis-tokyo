<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ARTEMIS TOKYO — agent guide

This repository is the prototype of a **bilingual curation magazine** that
pulls real RSS / Atom dispatches every morning, re-edits them through an LLM
into a Tokyo-editor voice, and publishes the result as a Next.js site. The
codebase is intentionally structured as a **template** so that sister titles
(e.g. DEFENSE OSAKA, BIOTECH KYOTO, AGRI HOKKAIDO) can be spun up by editing
a single configuration file.

## Config-driven architecture — the most important rule

**All concept-dependent values live in `src/site.config.ts`.** That includes:

- Brand identity (name, wordmark, canonical URL, keywords, vantage city)
- All localized chrome strings (taglines, nav, newsletter, footer, 404, empty state)
- The /about page (headline, lede, three editorial blocks)
- The category taxonomy (keys, names, LLM definitions, cover image pools, fallback chains)
- The pipeline: RSS / Atom sources, their per-outlet framing notes, image-host allowlist, LLM voice
- The cron schedule (UTC) and the issue-counter base date

**Do not hard-code any of these values in components, the cron, or SEO files.**
Always read from `siteConfig.*`. If you find yourself typing a literal "Artemis"
or "Tokyo" or "ARTEMIS TOKYO" inside a `.tsx` or `.ts` file, stop — it almost
certainly belongs in `site.config.ts`.

Type safety: `CategoryKey` is **derived** from `siteConfig.categories[*].key`
via `as const`, so adding or renaming a category requires no other edits.

## Project layout

```
src/
  site.config.ts          ← the template boundary
  lib/
    i18n.ts               ← thin adapter — builds dictionaries from siteConfig
    jsonld.ts             ← SEO JSON-LD builders (Organization, NewsArticle)
  context/
    LanguageContext.tsx   ← language toggle state (SSR-safe via useSyncExternalStore)
  app/
    layout.tsx            ← root layout + metadata + Organization JSON-LD
    page.tsx              ← homepage (incl. empty-state from siteConfig)
    sitemap.ts            ← XML sitemap (uses CATEGORY_ORDER + articles)
    robots.ts             ← robots.txt
    about/page.tsx        ← /about — reads siteConfig.about
    category/[category]/page.tsx
    articles/[slug]/page.tsx
    issues/page.tsx       ← redirects to /
    not-found.tsx
  components/
    Header / Footer / Navigation / LanguageToggle
    ArticleCard / GridSystem / Newsletter
    ShareBar / SourceCredit / ReadingProgress
  scripts/
    cron-publisher.ts     ← daily pipeline: fetch RSS → LLM edit → write JSON
  data/
    articles.ts           ← typed accessor over articles.json
    generated/
      articles.json       ← output of cron-publisher (committed by GH Actions)
      state.json          ← seen-GUID memory + run counters
.github/workflows/daily-publish.yml
```

## Daily lifecycle (recap from OPERATIONS.md)

```
06:17 JST  ── GitHub Actions cron fires (21:17 UTC)
            ├─ checkout main, install deps
            ├─ npm run cron:publish
            │   ├─ fetch every source in siteConfig.pipeline.sources concurrently
            │   ├─ apply per-source relevance filters (regex in config)
            │   ├─ triage against state.json (seen GUIDs)
            │   ├─ round-robin select MAX_PER_RUN items for source variety
            │   ├─ Gemini → bilingual editorial JSON (system prompt is composed
            │   │            from siteConfig.pipeline.voice + categories)
            │   ├─ deduplicate cover images via least-used pool entry
            │   └─ write src/data/generated/articles.json + state.json
            ├─ git commit + push to main
06:18 JST  ── Vercel rebuilds & deploys
```

For detailed operational steps (deploy, secrets, troubleshooting) see
`OPERATIONS.md`.

---

# 🚀 LAUNCH PLAYBOOK — derive a sister title from this template

The goal is to spin up a new bilingual curation magazine (e.g. **DEFENSE OSAKA**,
**BIOTECH KYOTO**, **AGRI HOKKAIDO**) using this codebase as the skeleton.
You should not need to touch components, the pipeline algorithm, or the SEO
files — only `site.config.ts`, the workflow YAML, and a handful of operational
settings.

## Step 1 — fork or clone

```bash
# Bare minimum
git clone <this-repo-url> defense-osaka
cd defense-osaka

# Wipe the existing dispatch archive — sister titles start empty
rm -f src/data/generated/articles.json src/data/generated/state.json
echo "[]" > src/data/generated/articles.json
echo '{"seen":[],"lastRunAt":null,"lastSuccessAt":null,"totalRuns":0}' > src/data/generated/state.json
```

Wipe the `.vercel/` folder too — it's tied to the parent project.

## Step 2 — rewrite `src/site.config.ts`

Walk top-to-bottom through `siteConfig` and replace every concept-dependent
value. Things to update:

**`brand`**
- `name` — uppercase display (e.g. `"DEFENSE OSAKA"`)
- `wordmark` — mixed-case form used in Header/Footer
- `siteUrl` — your canonical URL (e.g. `https://defense-osaka.vercel.app`,
  later your custom domain)
- `subject` — one sentence in EN and JA describing what the magazine covers
- `city` — vantage city (e.g. `{ en: "Osaka", ja: "大阪" }`)
- `keywords` — SEO keywords array
- `issueBase` — set to the month you go live (Vol. 01 = this `{year, month}`)

**`chrome`**
- Every `Bilingual` field: taglines, nav, newsletter, footer, empty-state, 404
- `footer.strapline` — the small-caps line at the very bottom (e.g.
  `"Osaka · Maritime · Editorial Independent"`)
- `emptyState.lede` — list the outlets you pull from so the placeholder feels
  real on day one before the cron has populated anything

**`about`**
- `headline`, `lede`, and the three `blocks` — OUR LINE / OUR CITY / OUR METHOD
- Keep the three-block structure; rewrite the copy

**`categories`** — usually the heaviest swap
- Replace the four-axis taxonomy with whatever fits the topic
- For each category:
  - `key` — the URL slug + machine ID (kebab-case, no spaces)
  - `name` — bilingual display name
  - `definitionForLlm` — single sentence the LLM uses to pick this category
  - `coverPool` — **at least 8 distinct Unsplash photo IDs** in the form
    `{timestamp}-{12-hex-chars}` (verify each ID by visiting
    `https://images.unsplash.com/photo-{id}?w=200` in a browser before adding)
  - `fallback` — preference order of other category keys when the home pool
    is exhausted; visually-aligned categories should fall back to each other
- **Important**: every photo ID must appear on EXACTLY ONE pool. The cron
  prints a warning at module load if this invariant is broken.

**`pipeline.sources`**
- Replace the 11 ARTEMIS TOKYO outlets with sources relevant to your topic
- Each source needs `name`, `url`, `parse` (rss|atom), `category` (must match
  a `categories[].key`), optional `filter` regex, and a one-sentence `framing`
  note in parentheses ("(industry trade publication — note geopolitics...)")
  injected into the LLM prompt for that source
- Aim for **6–12 sources** across all categories so round-robin selection
  has variety

**`pipeline.allowedImageHosts`**
- Add the domains your sources serve images from. Required for `next/image`
  to render them without falling back to a stock cover. Mirror these in
  `next.config.ts` → `images.remotePatterns`.

**`pipeline.voice`**
- `premise` — short noun-phrase identifying the magazine (used as
  `"You are the senior editor of ${premise}"` in the system prompt)
- `toneOfVoice` — the BoF × Brutus-style block; rewrite if you want a
  different register
- `framingQuestion` and `framingExpansion` — the single most important
  editorial rule the LLM must answer for every article. Make this concrete
  (a price, a profession, a habit) so the LLM never resorts to "humanity
  reaches new heights"-style filler.
- `compositionRules` — body length, pull-quotes, what to avoid
- `japaneseRules` — keep the modern-Japanese rules; only edit if you want
  a different register (e.g. for a younger publication)
- `closingBlock` — the magazine's signature commentary block.
  - `title.ja` / `title.en` — the heading rendered on each article page
  - `outputKey` — JSON field prefix (`"tokyo_view"` → `tokyo_view_en/_ja`).
    Change to e.g. `"osaka_view"` so the prompt and rendered article match
  - `rules` — what the LLM must put in this block; this is where you list
    the **home country's concrete realities** to compare the foreign news
    against (industries, neighborhoods, policies, sensibilities)

**`cron`**
- `utc` — keep the 17-minute offset to avoid GitHub Actions on-the-hour
  deprioritization. Adjust the hour if you want a different local publish
  time.
- `localLabel` — human-readable equivalent for use in copy

## Step 3 — update `next.config.ts` image hosts

```bash
# In next.config.ts → images.remotePatterns, add entries for every host
# you listed in siteConfig.pipeline.allowedImageHosts.
```

The cron and the renderer share this allowlist conceptually; keeping both in
sync is mandatory or images will silently fall back to Unsplash.

## Step 4 — update the GitHub Actions workflow

`.github/workflows/daily-publish.yml` — the schedule and the
`NEXT_PUBLIC_SITE_URL` default:

```yaml
on:
  schedule:
    - cron: "17 21 * * *"   # ← match siteConfig.cron.utc
env:
  NEXT_PUBLIC_SITE_URL: ${{ vars.NEXT_PUBLIC_SITE_URL || 'https://defense-osaka.vercel.app' }}
```

Also update the bot identity in the commit step:
```yaml
git config user.name  "DEFENSE OSAKA Bot"
git config user.email "bot@defense-osaka.local"
```

## Step 5 — rename the project

- `package.json` → `"name": "defense-osaka"`
- `OPERATIONS.md` headings and example paths — find/replace ARTEMIS TOKYO →
  DEFENSE OSAKA
- `globals.css` top-of-file comment

## Step 6 — verify locally

```bash
npm install
npm run typecheck      # must pass — config-driven types catch most errors
npm run lint           # must pass
npm run build          # produce a production build

# Smoke-test the pipeline with a dry run (writes nothing)
GEMINI_API_KEY=... npm run cron:publish:dry
```

A successful dry run prints the source list, the triage breakdown, and a JSON
preview of the first generated article. If the JSON preview reads naturally
in both languages, the voice config is good.

## Step 7 — deploy

Follow `OPERATIONS.md` sections 2 and 3 verbatim:

1. `vercel` then `vercel --prod` to create the project
2. Set `NEXT_PUBLIC_SITE_URL` in Vercel → Project → Environment Variables
3. Push to GitHub
4. Settings → Secrets → add `GEMINI_API_KEY`
5. Settings → Actions → General → Workflow permissions → **Read and write**
6. (Optional) Settings → Functions → Region → match your audience
7. Manual trigger: Actions tab → Daily Publish → Run workflow

The first cron run should produce **3–6 articles** within 5 minutes. If it
produces zero, check the troubleshooting section in `OPERATIONS.md`.

## Step 8 — custom domain (later)

Once the site is live on the Vercel subdomain:

1. Register the domain (e.g. `defense-osaka.jp`)
2. Vercel → Project → Settings → Domains → Add → enter the domain
3. Add the A / CNAME records Vercel prints to your registrar
4. Wait for DNS propagation (usually < 1 hour, sometimes overnight)
5. Update `siteConfig.brand.siteUrl` to the new domain
6. Update Vercel env `NEXT_PUBLIC_SITE_URL` and GitHub Actions repo variable
   to match
7. Redeploy

---

# Common edits — quick reference

| You want to…                                        | Edit                                          |
|----------------------------------------------------|----------------------------------------------- |
| Change the tagline under the logo                  | `siteConfig.chrome.tagline`                    |
| Add a new RSS source                               | `siteConfig.pipeline.sources` (append)         |
| Rename or add a category                           | `siteConfig.categories` (the `as const` array) |
| Change the LLM voice / closing block               | `siteConfig.pipeline.voice`                    |
| Adjust the publish time                            | `siteConfig.cron.utc` + workflow YAML cron     |
| Move to a custom domain                            | `siteConfig.brand.siteUrl` + Vercel + GH vars  |
| Refresh the cover image pool for one category      | `siteConfig.categories[i].coverPool`           |
| Whitelist a new image host                         | `siteConfig.pipeline.allowedImageHosts` AND `next.config.ts` `remotePatterns` |

---

# When NOT to edit `site.config.ts`

- You're changing pipeline **algorithm** (e.g. how round-robin works, how
  covers are deduplicated): edit `src/scripts/cron-publisher.ts`
- You're changing the **layout / visual design** of a page: edit the
  component or `globals.css`
- You're adding a new **route**: edit `src/app/*`
- You're adding a new **field** to the Article schema: edit
  `src/data/articles.ts` AND `src/scripts/cron-publisher.ts` (LlmOutput +
  assembleArticle)

If the change is purely textual or pertains to which sources / categories
exist — it almost certainly belongs in `site.config.ts`.
