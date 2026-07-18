/**
 * The two match dimensions a rule can't fairly decide: experience depth and
 * seniority. Everything else in the engine is deterministic; these genuinely need
 * judgement, so they get a model — behind the LLM client, with a rubric, at low
 * temperature so the judgement is as stable as a judgement can be.
 *
 * The output feeds straight into `scoreMatch` as `judgments`, which is why the
 * engine could be built and tested before this file existed.
 */

import { z } from 'zod'
import { completeJson } from '@/lib/llm/client'
import type { Job, Judgment, Profile } from '@/lib/types'

const judgeSchema = z.object({
  experience: z.object({
    score: z.number().min(0).max(100),
    rationale: z.string().min(1),
  }),
  seniority: z.object({
    score: z.number().min(0).max(100),
    rationale: z.string().min(1),
  }),
})

export type Judgments = { experience: Judgment; seniority: Judgment }

const SYSTEM = `You assess how well a candidate fits a role on exactly two dimensions: depth of relevant experience, and seniority.

Score each 0–100 against these rubrics.

EXPERIENCE (is their relevant experience deep enough?):
- 90–100: clearly exceeds the requirement, in the same domain.
- 75–89: meets the requirement comfortably.
- 60–74: slightly short, or adjacent-domain experience that transfers.
- 40–59: materially short on years or relevance.
- 0–39: little relevant experience.

SENIORITY (does their level match what the role needs?):
- 90–100: at or just above the target level.
- 75–89: within one level, plausibly ready.
- 60–74: a stretch up, some evidence of readiness.
- 40–59: a significant stretch, thin evidence.
- 0–39: wrong level for the role.

Rules:
- Judge only from the profile given. Never assume experience that isn't stated.
- A one-sentence rationale, addressed to the candidate as "you", specific to this pairing.
- Return only JSON: {"experience":{"score","rationale"},"seniority":{"score","rationale"}}.`

function profileForJudging(profile: Profile): string {
  const roles = profile.experiences
    .map((e) => {
      const span = `${e.startDate} to ${e.endDate ?? 'present'}`
      const bullets = e.bullets.map((b) => `    - ${b.text}`).join('\n')
      return `  ${e.title} at ${e.company} (${span})\n${bullets}`
    })
    .join('\n')

  return [
    `Candidate: ${profile.fullName}${profile.headline ? ` — ${profile.headline}` : ''}`,
    profile.summary ? `Summary: ${profile.summary}` : '',
    'Experience:',
    roles,
  ]
    .filter(Boolean)
    .join('\n')
}

function jobForJudging(job: Job): string {
  return [
    `Role: ${job.title} at ${job.company}`,
    job.seniority ? `Stated level: ${job.seniority}` : '',
    job.minYearsExperience ? `Minimum years: ${job.minYearsExperience}` : '',
    `Responsibilities:\n${job.responsibilities.map((r) => `  - ${r}`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * The candidate profile is passed as a cached block: it's long, stable, and reused
 * across every job the candidate scores in a session, so caching it is the single
 * biggest cost saving available here.
 */
export async function judgeFit(profile: Profile, job: Job): Promise<Judgments> {
  const result = await completeJson({
    system: SYSTEM,
    cached: { text: `CANDIDATE PROFILE:\n${profileForJudging(profile)}` },
    user: `Assess this pairing.\n\n${jobForJudging(job)}`,
    schema: judgeSchema,
    temperature: 0.1,
  })
  return result
}
