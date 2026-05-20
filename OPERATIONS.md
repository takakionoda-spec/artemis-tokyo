# ARTEMIS TOKYO — Operations runbook

This document describes the three operational concerns that go beyond the codebase:
deploying to Vercel, configuring GitHub Actions secrets, and running the bilingual
crawler locally.

The application source code is fully self-contained. The pieces below require
credentials and human approval, so they are kept out of the repo by design.

---

## 1) Run the crawler locally (one-off, to verify the pipeline)

```bash
# 1. Install dependencies (tsx is now declared in package.json)
npm install

# 2. Provide an API key
cp .env.example .env.local
# Then edit .env.local and set GEMINI_API_KEY=...

# 3. (recommended) Do a smoke test — fetches and edits, but writes nothing
npm run cron:publish:dry

# 4. Real run — writes src/data/generated/articles.json + state.json
npm run cron:publish

# 5. Verify
npm run dev
#    → open http://localhost:3000
```

The crawler is idempotent. It records every dispatch GUID it has already
processed into `src/data/generated/state.json`, so a re-run on the same day
will not duplicate articles.

### Tuning

All knobs are environment variables; sensible defaults are baked in.

| Var                    | Default                  | Meaning                              |
| ---------------------- | ------------------------ | ------------------------------------ |
| `LLM_PROVIDER`         | `gemini`                 | `gemini` or `openai`                 |
| `GEMINI_MODEL`         | `gemini-2.5-flash`| Gemini model id                      |
| `OPENAI_MODEL`         | `gpt-4o-mini`            | OpenAI model id                      |
| `CRON_LOOKBACK_HOURS`  | `24`                     | Skip items older than this many hrs  |
| `CRON_MAX_PER_RUN`     | `6`                      | Cap LLM calls per run (cost guard)   |
| `CRON_RETAIN`          | `60`                     | Max articles kept in articles.json   |
| `CRON_SEEN_RETAIN`     | `500`                    | Max GUIDs kept in state.json         |

---

## 2) Deploy to Vercel (one-time, ~3 minutes)

Vercel deployment requires browser-based authentication and cannot be done by
an agent on your behalf. Run these three commands in your own terminal:

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Authenticate (opens your default browser)
vercel login

# From the project root — first run will prompt for project setup
cd ~/artemis-tokyo
vercel              # preview deploy; answer the questions interactively
vercel --prod       # promote to production
```

When `vercel` first asks "Link to existing project?" answer **No**, then accept
the defaults (project name = `artemis-tokyo`, framework = Next.js, root
directory = `./`). Subsequent runs will reuse the linked project automatically
via the `.vercel/` folder it creates locally.

### Connecting GitHub → Vercel for auto-deploys

After `vercel --prod` succeeds, link the repository in the Vercel dashboard:

1. Open the project on https://vercel.com/dashboard
2. Settings → Git → Connect Git Repository → choose your GitHub repo
3. Vercel will now redeploy automatically on every push to `main`

The daily GitHub Actions workflow commits new articles to `main`, which then
triggers a Vercel rebuild — closing the loop.

### Environment variables on Vercel

In the Vercel dashboard → Project → Settings → Environment Variables, add:

| Name                   | Value                            | Scope          |
| ---------------------- | -------------------------------- | -------------- |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>`          | All            |

The site itself does not need `GEMINI_API_KEY` at runtime — the LLM is only
called by the GitHub Action, not by the Next.js app.

### Region (optional, Hobby-plan friendly)

`vercel.json` intentionally does NOT pin a region — multi-region deploys
require Pro/Enterprise. To serve from Tokyo on the free Hobby plan, set a
single region from the dashboard:

**Project → Settings → Functions → Function Region → `Tokyo (hnd1)`**

This change is applied to subsequent deploys.

---

## 3) Configure GitHub Actions (one-time, ~2 minutes)

Push the repository to GitHub if you have not already:

```bash
cd ~/artemis-tokyo
git add -A
git commit -m "feat: real-time bilingual editorial pipeline"
git branch -M main
git remote add origin git@github.com:<your-account>/artemis-tokyo.git
git push -u origin main
```

Then add the secrets the workflow needs. From the repository on GitHub:

**Settings → Secrets and variables → Actions → New repository secret**

| Secret name      | Required when                | Value                                  |
| ---------------- | ---------------------------- | -------------------------------------- |
| `GEMINI_API_KEY` | `LLM_PROVIDER` = `gemini`    | Your Gemini API key from AI Studio     |
| `OPENAI_API_KEY` | `LLM_PROVIDER` = `openai`    | Your OpenAI API key                    |

(Optional repository **variables**, same page → Variables tab — these are
non-secret tuning knobs and override the defaults in the workflow:)

| Variable name          | Example                  |
| ---------------------- | ------------------------ |
| `LLM_PROVIDER`         | `gemini`                 |
| `GEMINI_MODEL`         | `gemini-2.5-flash`|
| `CRON_LOOKBACK_HOURS`  | `24`                     |
| `CRON_MAX_PER_RUN`     | `6`                      |
| `NEXT_PUBLIC_SITE_URL` | `https://artemis-tokyo.vercel.app` |

Once the secrets exist, the workflow will run automatically every day at
**21:00 UTC = 06:00 JST**. You can also run it on demand from the **Actions**
tab → "Daily Publish" → "Run workflow", with an optional dry-run toggle.

### What the workflow does (recap)

1. Checks out `main` with write permission
2. Installs Node 22, runs `npm ci`
3. Runs `npm run cron:publish`, which:
   - Pulls from six sources concurrently — each mapped to one of four categories:
     - **NASA Artemis** RSS → `artemis` (lunar return program updates)
     - **Space.com** RSS → `space-tech` (general space news)
     - **arXiv** atom feed → `research` (astro-ph.CO + astro-ph.EP preprints)
     - **TechCrunch** Space tag RSS → `space-tech` (private-space business)
     - **Futurism** RSS → `culture` (filtered to space-adjacent items)
     - **Dezeen** RSS → `culture` (filtered to space-architecture items)
   - The LLM may re-assign category at edit time based on actual content.
   - Filters to the last 168h (7d), dedupes against `state.json`,
     and rebuilds drafts / empty articles
   - Round-robin selects across sources for variety
   - Calls Gemini to re-edit each into BoF×Brutus bilingual prose
   - Writes `src/data/generated/articles.json` and `state.json`
4. Commits & pushes the updated `src/data/generated/*` to `main`
5. Vercel sees the push, rebuilds, deploys — site is live with new content

### Troubleshooting

- **Action runs but commits nothing**: usually means no source items in the
  24h window or all items were already seen. Bump `CRON_LOOKBACK_HOURS` to
  `72` temporarily to backfill.
- **Permission denied on push**: ensure repo Settings → Actions → General →
  Workflow permissions is set to **Read and write permissions**.
- **LLM 429 / quota errors**: lower `CRON_MAX_PER_RUN` to `2–3`, or upgrade
  the Gemini key.

---

## 4) Daily content lifecycle (end-to-end)

```
06:00 JST  ── GitHub Actions cron fires
            ├─ checkout main
            ├─ npm ci
            ├─ npm run cron:publish
            │   ├─ fetch NASA / Space.com / arXiv
            │   ├─ filter to last 24h + unseen
            │   ├─ Gemini → bilingual editorial JSON
            │   └─ write src/data/generated/articles.json
            ├─ git commit + push to main
            │
06:01 JST  ── Vercel webhook receives push
            ├─ npm install
            ├─ next build
            └─ deploy
            │
06:02 JST  ── readers see fresh dispatch at https://<your-domain>
```
