/**
 * Demo data.
 *
 * The app runs end to end on this with no Supabase project and no API key, which
 * means the UI can be built and reviewed before any credentials exist. Scores here
 * are computed by the real engine on real fixtures — nothing is hardcoded, so what
 * you see in the demo is what the engine actually produces.
 *
 * The `judgments` are the one thing standing in for a model call. In production
 * they come from Claude; here they're fixed values, which is exactly the seam that
 * made the engine testable in the first place.
 */

import { orbitalJob, priya, snowbirdJob } from '@/lib/fixtures'
import { scoreMatch } from '@/lib/match/score'
import type { Job, Match, Profile } from '@/lib/types'

export const demoProfile: Profile = priya

const harborlineJob: Job = {
  id: 'job_harborline',
  source: 'pasted',
  title: 'Product Analyst',
  company: 'Harborline',
  location: 'Auckland, New Zealand',
  rawText: 'Product Analyst at Harborline...',
  requirements: [
    { id: 'hreq_1', name: 'SQL', kind: 'must_have', category: 'technical' },
    { id: 'hreq_2', name: 'Python', kind: 'must_have', category: 'technical' },
    { id: 'hreq_3', name: 'Power BI', kind: 'nice_to_have', category: 'tool' },
    { id: 'hreq_4', name: 'Experimentation', kind: 'must_have', category: 'domain' },
  ],
  responsibilities: ['Own product analytics', 'Design and read experiments'],
  seniority: 'mid',
  educationRequirements: [],
  logistics: { remote: 'hybrid', location: 'Auckland, New Zealand' },
  minYearsExperience: 3,
}

const fernbrookJob: Job = {
  id: 'job_fernbrook',
  source: 'pasted',
  title: 'BI & Analytics Manager',
  company: 'Fernbrook Group',
  location: 'Auckland, New Zealand',
  rawText: 'BI & Analytics Manager at Fernbrook Group...',
  requirements: [
    { id: 'freq_1', name: 'Power BI', kind: 'must_have', category: 'tool' },
    { id: 'freq_2', name: 'SQL', kind: 'must_have', category: 'technical' },
    { id: 'freq_3', name: 'Terraform', kind: 'must_have', category: 'tool' },
    { id: 'freq_4', name: 'Team leadership', kind: 'must_have', category: 'soft' },
    { id: 'freq_5', name: 'Snowflake', kind: 'nice_to_have', category: 'tool' },
  ],
  responsibilities: ['Lead the BI function', 'Own the analytics roadmap'],
  seniority: 'manager',
  educationRequirements: [],
  logistics: { remote: 'onsite', location: 'Auckland, New Zealand' },
  minYearsExperience: 7,
}

export const demoJobs: Job[] = [snowbirdJob, orbitalJob, harborlineJob, fernbrookJob]

/** Stand-ins for the two dimensions that need a model. */
const JUDGMENTS: Record<string, Parameters<typeof scoreMatch>[0]['judgments']> = {
  job_snowbird: {
    experience: {
      score: 92,
      rationale: 'Six years of analytics engineering against a five-year ask, in the same domain.',
    },
    seniority: {
      score: 82,
      rationale: 'Senior scope and ownership, though without formal direct reports.',
    },
  },
  job_orbital: {
    experience: {
      score: 62,
      rationale: 'Six years against an eight-year ask, and none of it on platform infrastructure.',
    },
    seniority: {
      score: 50,
      rationale: 'This role leads a team of four. Your history shows influence, not line management.',
    },
  },
  job_harborline: {
    experience: {
      score: 88,
      rationale: 'Comfortably past the three-year bar, with directly relevant reporting work.',
    },
    seniority: { score: 90, rationale: 'You are slightly above the level this role targets.' },
  },
  job_fernbrook: {
    experience: {
      score: 70,
      rationale: 'Six years against a seven-year ask — close, and your BI history is a direct hit.',
    },
    seniority: {
      score: 45,
      rationale: 'A manager role. Nothing in your profile evidences managing people yet.',
    },
  },
}

const DOMAIN_SIMILARITY: Record<string, number> = {
  job_snowbird: 90,
  job_orbital: 64,
  job_harborline: 78,
  job_fernbrook: 72,
}

/** Score every demo job with the real engine. */
export function demoMatches(): Array<{ job: Job; match: Match }> {
  return demoJobs
    .map((job) => ({
      job,
      match: scoreMatch({
        profile: demoProfile,
        job,
        judgments: JUDGMENTS[job.id],
        domainSimilarity: DOMAIN_SIMILARITY[job.id],
      }),
    }))
    .sort((a, b) => b.match.overall - a.match.overall)
}

export function demoMatchFor(jobId: string): { job: Job; match: Match } | undefined {
  return demoMatches().find((m) => m.job.id === jobId)
}

/** Short, stable initials for a company avatar. */
export function initials(company: string): string {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export const DIMENSION_LABEL: Record<string, string> = {
  technical_skills: 'Skills',
  experience: 'Experience',
  responsibilities: 'Day-to-day overlap',
  education: 'Qualifications',
  seniority: 'Seniority',
  logistics: 'Location & logistics',
}
