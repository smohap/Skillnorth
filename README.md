# SkillNorth

The AI agent that points your career true north. Bring your career history once;
from then on, any job posting becomes an explainable match score, a ranked list of
skill gaps, and a tailored CV and cover letter — prepared automatically within
limits you set, and never submitted without you.

The compass is the idea, not just the logo: a match score is drawn as a bearing
whose needle colour is its band, so the mark in the nav and the score on a job card
are the same object at two sizes.

## What it does (v1)

- Parse a CV (PDF/DOCX) into a structured career knowledge base you review and edit.
- Turn any job posting — URL or pasted text — into structured requirements.
- Score the fit across six explainable dimensions and rank the gaps by what closing
  each one is actually worth.
- Generate a tailored CV and cover letter, with every line traceable to your profile.
- Score CV readiness (SkillNorth's own heuristic — not a claimed ATS simulation).
- Prepare applications inside match bands you control. You always press send.

## Three things it deliberately doesn't do

- **Import your LinkedIn profile.** LinkedIn's API doesn't expose it and scraping
  breaks their terms. You upload a CV instead.
- **Fake an ATS score.** Workday and Greenhouse don't publish one, so nobody can
  simulate it honestly. We measure real parseability and coverage, and say so.
- **Auto-submit to LinkedIn/Seek/Indeed.** Their terms forbid it and it's your
  account at risk. SkillNorth prepares everything; the last click is yours.

See [`docs/DESIGN.md`](docs/DESIGN.md) for the full design and the reasoning behind
each of these.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack) on **Vercel**
- **Supabase** — Postgres + pgvector, auth, file storage
- **Claude Sonnet 5** via the Anthropic API — parsing, judging, generation
- **@react-pdf/renderer** — selectable-text PDF output
- **Tailwind 4**, **Vitest**

## Architecture, in one breath

The scoring engine, the provenance validator, and the readiness scorer are **pure
functions over plain data** — no network, no database, no model. The two subjective
match dimensions (experience, seniority) are judged by Claude at the edge and passed
in as values, which is why the whole engine is unit-tested without a single API call.

```
src/lib/
  types.ts            Domain types — the shared vocabulary
  match/              Scoring, gap ranking, alias normalisation  (pure)
  match/judge.ts      The one model-backed step, behind the LLM client
  generate/validate   Provenance guarantee — the anti-fabrication check  (pure)
  readiness/          SkillNorth Readiness Score  (pure)
  jobs/parse.ts       URL/text -> structured Job, with typed fetch failures
  llm/client.ts       The single seam to Anthropic
  demo.ts             Sample data; scores computed by the real engine
```

## Running locally

```bash
cd skillnorth
npm install
npm run dev
```

Open http://localhost:3000. **No credentials needed** — it runs in demo mode on
sample data, with the match engine fully live.

To enable CV parsing, match judging, and generation, copy `.env.example` to
`.env.local` and fill it in:

```bash
cp .env.example .env.local
```

## Tests

```bash
npm test          # unit + contract (no network)
npm run typecheck
```

The suite covers the scoring maths, gap ranking, the alias table, band selection,
readiness components, LLM JSON parsing, and — most importantly — the provenance
validator against fabricating model output.

## Deploying to Vercel

1. Push to `github.com/smohap/Skillnorth` (this folder is the repo root).
2. Import the repo in Vercel. Root directory: the repo root (default).
3. Add the four env vars from `.env.example` in the Vercel project settings.
   `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** — do not
   prefix them `NEXT_PUBLIC_`.
4. Deploy. Preview builds run per branch; production tracks `main`.

## Roadmap

- **Now (v1):** the core loop above, plus assisted apply.
- **Next:** continuous job discovery, one-click prefilled handoff for Greenhouse/Lever.
- **Later:** goals-and-roadmap, provider portal, recruiter skill assessments — the
  three-sided marketplace, once there's enough usage to make its demand data real.
