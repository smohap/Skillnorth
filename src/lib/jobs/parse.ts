/**
 * Turn a job posting — a URL or pasted text — into the structured `Job` the match
 * engine expects.
 *
 * Fetching is separated from parsing on purpose. Fetching can fail in ways the user
 * needs to know about (a login wall, a JS-only page), and when it does we fall back
 * to "paste the description" rather than silently returning an empty posting.
 */

import { z } from 'zod'
import { completeJson } from '@/lib/llm/client'
import type { Job } from '@/lib/types'

const parsedJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  requirements: z.array(
    z.object({
      name: z.string().min(1),
      kind: z.enum(['must_have', 'nice_to_have']),
      category: z.enum(['technical', 'tool', 'domain', 'soft', 'education', 'certification']),
      aliases: z.array(z.string()).optional(),
    }),
  ),
  responsibilities: z.array(z.string()),
  seniority: z
    .enum(['intern', 'junior', 'mid', 'senior', 'lead', 'principal', 'manager', 'director', 'executive'])
    .optional(),
  educationRequirements: z.array(z.string()),
  minYearsExperience: z.number().optional(),
  logistics: z.object({
    remote: z.enum(['onsite', 'hybrid', 'remote']).optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    currency: z.string().optional(),
    workRights: z.string().optional(),
    employmentType: z.string().optional(),
  }),
})

const SYSTEM = `You extract structured requirements from a job posting.

Return only JSON with this shape:
{
  "title", "company", "location"?,
  "requirements": [{"name","kind":"must_have"|"nice_to_have","category":"technical"|"tool"|"domain"|"soft"|"education"|"certification","aliases"?:[]}],
  "responsibilities": [string],
  "seniority"?: one of intern|junior|mid|senior|lead|principal|manager|director|executive,
  "educationRequirements": [string],
  "minYearsExperience"?: number,
  "logistics": {"remote"?:"onsite"|"hybrid"|"remote","salaryMin"?,"salaryMax"?,"currency"?,"workRights"?,"employmentType"?}
}

Rules:
- Extract only what the posting states. Do not infer requirements it doesn't list.
- "must_have" for anything phrased as required/essential; "nice_to_have" for preferred/bonus.
- Split a compound requirement into separate entries.
- Give the canonical skill name in "name" and put posting-specific spellings in "aliases".
- If a field isn't stated, omit it (or use an empty array for the list fields).`

export interface ParseJobInput {
  /** Raw posting text — already fetched, or pasted by the user. */
  text: string
  url?: string
  source?: string
}

let counter = 0
function localId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter}`
}

/**
 * Parse posting text into a `Job`. Ids are assigned here so downstream code always
 * has stable handles, whether or not this row has been persisted yet.
 */
export async function parseJob(input: ParseJobInput): Promise<Job> {
  const parsed = await completeJson({
    system: SYSTEM,
    user: `Extract the requirements from this posting:\n\n${input.text}`,
    schema: parsedJobSchema,
    temperature: 0.1,
  })

  return {
    id: localId('job'),
    url: input.url,
    source: input.source ?? (input.url ? 'url' : 'pasted'),
    title: parsed.title,
    company: parsed.company,
    location: parsed.location,
    rawText: input.text,
    requirements: parsed.requirements.map((r) => ({ ...r, id: localId('req') })),
    responsibilities: parsed.responsibilities,
    seniority: parsed.seniority,
    educationRequirements: parsed.educationRequirements,
    minYearsExperience: parsed.minYearsExperience,
    logistics: parsed.logistics,
  }
}

export class JobFetchError extends Error {
  constructor(
    message: string,
    readonly kind: 'blocked' | 'js_required' | 'not_found' | 'network',
  ) {
    super(message)
    this.name = 'JobFetchError'
  }
}

/**
 * Fetch a posting URL to text. Deliberately conservative: on anything that smells
 * like a login wall or a client-rendered page, it throws a typed error so the UI
 * can say "paste the description instead" with a real reason, rather than feeding
 * the parser a page of nothing.
 */
export async function fetchJobText(url: string): Promise<string> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; SkillNorth/1.0)' },
      redirect: 'follow',
    })
  } catch {
    throw new JobFetchError('Could not reach that URL.', 'network')
  }

  if (res.status === 401 || res.status === 403) {
    throw new JobFetchError('That posting sits behind a login.', 'blocked')
  }
  if (res.status === 404) {
    throw new JobFetchError('That posting no longer exists.', 'not_found')
  }

  const html = await res.text()
  const text = stripHtml(html)

  // A page that renders its content with JavaScript arrives here almost empty.
  if (text.length < 400) {
    throw new JobFetchError('That page loads its content with JavaScript.', 'js_required')
  }
  return text
}

/** Crude but dependency-free: drop scripts/styles and collapse tags to whitespace. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
