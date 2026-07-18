# SkillNorth — v1 Design

Date: 2026-07-17
Status: Approved for build
Supersedes: `truenorth-prd.html` (rebrand + scope correction)

## 1. What SkillNorth is

An AI career agent. A user brings their career history once. From then on, any job
posting URL produces: an explainable match score, a ranked list of skill gaps, and a
tailored CV plus cover letter as PDF — prepared automatically within bands the user sets.

The name is SkillNorth. The mark is a compass.

## 2. Scope of v1

This spec covers the **core loop plus assisted apply**. Two follow-on products are
explicitly out of scope and get their own spec/plan cycles later:

- **Auto-apply engine** — continuous discovery and background submission.
- **Marketplace** — provider portal, certification pathways, recruiter assessments,
  talent pool.

### In scope

| # | Feature |
|---|---------|
| 1 | Auth (Supabase; email + Google OAuth) |
| 2 | CV upload (PDF/DOCX) → LLM parse → career knowledge base → user reviews and edits |
| 3 | Job intake: paste URL (fetch + parse) or paste raw text |
| 4 | Match score: 6 explainable subscores, ranked skill gaps |
| 5 | Tailored CV generation with enforced provenance |
| 6 | Tailored cover letter generation |
| 7 | SkillNorth Readiness Score, before/after |
| 8 | PDF export |
| 9 | Threshold bands (90/80/60, user-editable) driving queue actions |
| 10 | Assisted apply: prepared bundle + handoff + mark-applied |
| 11 | Application tracker (kanban) |

### Out of scope for v1

Background job discovery. Silent automated submission. Provider portal. Recruiter
assessments. Talent pool. Interview prep. Mock interviews. Goals/roadmap. DOCX export.
Team/enterprise accounts. Billing.

## 3. Constraints that shaped this design

These are real-world limits, not preferences. Each one changed the design.

### 3.1 LinkedIn will not give us the profile

LinkedIn's public API (Sign In with LinkedIn / OpenID Connect) returns name, email, and
picture only. Experience, skills, and education require LinkedIn Partner Program
approval, which is not available to new applications. Scraping violates their Terms of
Service and is actively enforced.

**Therefore:** the career knowledge base is populated by **CV upload + LLM parse + user
correction**. "Sign in with LinkedIn" may exist later for identity only, never as a
profile source. The UI must never promise profile import from LinkedIn.

### 3.2 Automated submission violates the ToS of the target job boards

LinkedIn, Seek, and Indeed all prohibit automated application submission. Enforcement
bans the *user's* account — the cost lands on the customer, not on us.

**Therefore:** v1 prepares applications; the user submits. The bands still run the whole
pipeline automatically. Only the final click is human. This preserves the agent
experience and removes the legal exposure.

### 3.3 There is no real "ATS score" to simulate

Workday, Greenhouse, and iCIMS do not expose scoring, and most filter rather than rank.
Claiming to simulate them would be a fabrication.

**Therefore:** we ship the **SkillNorth Readiness Score** — our own heuristic, defined
in §7, with a visible tooltip stating it is our measure and not a vendor ATS score.

## 4. Architecture

```
Next.js 15 (App Router, TypeScript, Server Actions)  →  Vercel
Supabase                                              →  Postgres + pgvector, Auth, Storage
Anthropic Claude Sonnet 5                             →  parse, judge, generate
@react-pdf/renderer                                   →  PDF output
```

### 4.1 Modules

Each module owns one job, exposes a narrow interface, and is testable in isolation.
All LLM access goes through `lib/llm/client.ts` — no module calls Anthropic directly.

| Module | Responsibility | Key export |
|---|---|---|
| `lib/profile` | Knowledge base CRUD; CV file → structured profile | `parseCv(file) → ProfileDraft` |
| `lib/jobs` | URL fetch, HTML/text → structured posting | `parseJob(input) → Job` |
| `lib/match` | Score a profile against a job; produce gaps | `scoreMatch(profile, job) → Match` |
| `lib/generate` | Tailored CV + cover letter, provenance-checked | `generateCv(profile, job, match) → CvDoc` |
| `lib/readiness` | Readiness score for a document against a job | `scoreReadiness(doc, job) → Readiness` |
| `lib/pdf` | React PDF templates and render | `renderCv(doc) → Buffer` |
| `lib/applications` | Pipeline state and transitions | `advance(app, status) → Application` |

`lib/match`, `lib/readiness`, and the provenance validator are pure functions over plain
data. They take no database and no network, so they are unit-testable directly.

## 5. Data model

Postgres, via Supabase. All tables live in a dedicated `skillnorth` schema (not
`public`) because the database is shared with another app. All user-owned tables carry
`user_id` and are protected by Row Level Security — a user can only ever read and write
their own rows. Storage buckets are prefixed `skillnorth-` for the same reason.

```
profiles          id, user_id, full_name, headline, email, phone, location,
                  links jsonb, summary, version, updated_at

experiences       id, profile_id, company, title, location, start_date, end_date,
                  is_current, bullets jsonb[]   -- each: { id, text, embedding }
education         id, profile_id, institution, qualification, field, start, end
certifications    id, profile_id, name, issuer, issued, expires, credential_id
skills            id, profile_id, name, category, level, years,
                  source ('parsed'|'self'|'verified')
projects          id, profile_id, name, description, url, bullets jsonb[]

jobs              id, user_id, url, source, title, company, location,
                  raw_text, parsed jsonb, embedding vector(1024), created_at
                  -- parsed: { must_have[], nice_to_have[], responsibilities[],
                  --           seniority, education[], logistics{} }

matches           id, job_id, profile_id, profile_version,
                  overall int, subscores jsonb, gaps jsonb, band, created_at
                  -- unique (job_id, profile_version) → deterministic cache key

documents         id, match_id, kind ('cv'|'cover'), content jsonb,
                  readiness jsonb, pdf_path, created_at

applications      id, user_id, job_id, document_id, status, timeline jsonb,
                  applied_at, created_at

user_settings     user_id, auto_band_min (90), confirm_band_min (80),
                  improve_band_min (60), weekly_cap (15), weights jsonb
```

`matches` is keyed on `profile_version`, so re-scoring is skipped unless the profile
actually changed. Editing the profile bumps the version and invalidates every score at
once — correct by construction, no cache-busting logic to get wrong.

## 6. The match engine

Deterministic wherever a rule can decide; LLM only where judgment is genuinely required.
The reason is not cost — it is that a score that wobbles between 84 and 89 across
identical runs is not a score, it is a mood. Users set automation thresholds against
these numbers, so stability is a correctness requirement.

### 6.1 Dimensions and default weights

| Dimension | Weight | Method |
|---|---|---|
| Technical skills | 35 | Deterministic: exact + alias + embedding match (cosine ≥ 0.82) |
| Experience | 25 | LLM judge with rubric |
| Responsibilities / domain | 15 | Embedding similarity, top-k mean over profile bullets |
| Education & certifications | 10 | Deterministic rule check |
| Seniority / leadership | 10 | LLM judge with rubric |
| Logistics (location, rights, salary) | 5 | Deterministic |

Weights live in `user_settings.weights` and are user-adjustable.

**Technical skills detail:** each required skill from `parsed.must_have` /
`parsed.nice_to_have` is matched against the profile's skills and experience bullets.
`must_have` misses are weighted 3× `nice_to_have` misses. Verified skills (future) will
outrank self-reported ones; v1 treats `parsed` and `self` equally.

**Overall** = weighted sum, rounded to an integer.

### 6.2 Gaps

Every unmatched requirement becomes a gap, ranked by **points recoverable** — how much
the overall score would rise if that gap alone were closed. This makes the ranking
meaningful rather than arbitrary: the top gap is genuinely the highest-leverage move.

Each gap carries a suggested action (short course, certification, or "you have evidence
for this — add the project"). v1 generates suggestion text; it does not link a
marketplace.

## 7. SkillNorth Readiness Score

Our own heuristic. Named honestly, explained in the UI.

| Component | Points | Check |
|---|---|---|
| Parse safety | 25 | No multi-column layout, tables, images, or text in headers/footers |
| Keyword coverage | 40 | Share of `must_have` + `nice_to_have` terms present in the document |
| Structure | 15 | Standard section headings present and in a recognisable order |
| Format | 10 | Selectable text, embedded standard fonts, correct file type |
| Stuffing penalty | −10 max | Unnatural keyword density is penalised, not rewarded |

Documents generated by SkillNorth pass parse safety and format by construction — the
templates are single-column with selectable text and no images. The score therefore moves
almost entirely on keyword coverage and structure, which is exactly what the user can act on.

The UI states: *"SkillNorth Readiness is our own measure of how cleanly your CV will parse
and how well it covers this posting. It is not a score from Workday, Greenhouse, or any
other ATS — those systems don't publish one."*

## 8. Generation and the anti-fabrication guarantee

**The rule:** SkillNorth rewrites, reorders, and re-weights what the candidate already has.
It never invents experience, dates, titles, credentials, or metrics.

This is enforced structurally, because a prompt instruction alone is not a guarantee.

### 8.1 Provenance

The generator returns:

```ts
type CvDoc = {
  sections: Array<{
    type: 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'
    items: Array<{
      text: string
      source_ids: string[]   // must resolve to real profile entity ids
    }>
  }>
}
```

### 8.2 Validation

`lib/generate/validate.ts` runs on every generation, before anything is shown or rendered:

1. Every `item.source_ids` must be non-empty and every id must resolve to a row that
   belongs to this profile. Unresolvable → item rejected.
2. Structured facts — company, title, dates, institution, credential id — are **templated
   from the database**, never taken from model output. They cannot drift because the model
   never writes them.
3. Any numeric claim (`%`, `$`, `x`, headcount) in generated text must appear in the
   source bullet it cites. A metric that isn't in the source is a fabricated metric.
4. On failure: regenerate once with the failures named. Still failing → drop those items
   and surface a notice. Never silently ship an unverifiable claim.

Rules 1, 3, and 4 are pure functions and are unit-tested against known-bad model output.

## 9. Bands and assisted apply

`user_settings` holds the boundaries. Defaults match the PRD; all are user-editable.

| Band | Default | v1 behaviour |
|---|---|---|
| Ready | ≥ 90 | CV + cover letter generated automatically, queued as **Ready to send** |
| Confirm | 80–89 | Generated on the user's confirm, then queued |
| Improve | 60–79 | Nothing generated. Gaps and suggested CV edits shown |
| Filtered | < 60 | Kept out of the active queue |

**Assisted apply** is the handoff, and it is deliberate:

1. User opens a prepared application.
2. SkillNorth downloads the PDFs and copies a bundle of prepared answers to common
   screening questions (notice period, work rights, salary expectation) to the clipboard.
3. The job URL opens in a new tab.
4. The user submits, then marks it applied — which advances the tracker.

The weekly cap applies to how many applications are auto-*prepared*, so the queue can
never run away from the user.

## 10. UI

The mockup's visual language is good and carries over, rebranded: dark navy gradient,
glass surfaces, teal accent, Space Grotesk / Inter / JetBrains Mono. Compass mark.

v1 screens: Onboarding (upload → review → confirm), Dashboard, Job Matches, Match detail,
Resume Studio, Auto-Apply Rules, Tracker, Settings.

The role switcher (Candidate / Provider / Recruiter) is **removed** — those are Phase 2
products and shipping a switcher to empty rooms is worse than not shipping it.

## 11. Error handling

| Failure | Response |
|---|---|
| CV parse produces low confidence | Show what was extracted, flag uncertain fields, require review. Never silently accept |
| Job URL fetch blocked or JS-rendered | Fall back to "paste the description" with a clear reason |
| LLM call fails or times out | Retry once with backoff; then surface the failure. Never a fabricated placeholder score |
| Provenance validation fails | Regenerate once, then drop the item and tell the user |
| PDF render fails | Keep the document; the user retries. Generation is not lost |

The rule throughout: fail loudly and specifically. A career tool that quietly invents a
number is worse than one that says it couldn't compute it.

## 12. Testing

- **Unit** (pure, no network): match scoring maths, gap ranking, readiness components,
  provenance validator, band selection.
- **Fixtures**: 3 real-shaped CVs and 3 real-shaped postings as JSON, so scoring can be
  tested end-to-end without an LLM call.
- **Contract**: LLM client mocked; parse/generate tested against recorded responses,
  including malformed and fabricating output.
- **E2E** (Playwright): upload → review → add job → score → generate → PDF downloads.

Vitest for unit and contract. Playwright for E2E.

## 13. Build order

1. Scaffold, Supabase schema, RLS, auth
2. `lib/profile` — CV upload, parse, review UI
3. `lib/jobs` — intake and parse
4. `lib/match` — scoring, gaps (pure, unit-tested first)
5. `lib/generate` + validator — CV and cover letter
6. `lib/readiness` + `lib/pdf` — score and export
7. Bands, queue, tracker, assisted apply
8. Design pass and polish

## 14. Deployment

- Repo: `github.com/smohap/Skillnorth`
- Host: Vercel; preview deploys per branch, production on `main`
- Secrets: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Vercel env vars, never
  committed
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never appear in a client bundle

## 15. Open questions

None blocking. Deferred by choice: DOCX export, multiple CV profiles, billing, and
whether the Improve band should auto-generate a preview CV to make the gap concrete.
