/**
 * Turn CV text into the structured entries that make up a career knowledge base.
 *
 * This is extraction, not authorship. The model's job is to find what the document
 * already says and put it in fields — it must not summarise achievements into
 * something punchier, infer a seniority the CV never claims, or invent dates. That
 * matters more here than anywhere else in the app: everything downstream cites this
 * data as fact, and the provenance validator can only guarantee a generated CV line
 * traces back to a profile entry, not that the entry itself was true.
 *
 * Nothing here writes to the profile. The result is a *proposal* the user reviews.
 */

import { z } from 'zod'
import { completeJson } from '@/lib/llm/client'

const bulletList = z.array(z.string()).default([])

const parsedCvSchema = z.object({
  basics: z.object({
    fullName: z.string().default(''),
    headline: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    summary: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  experiences: z
    .array(
      z.object({
        company: z.string().min(1),
        title: z.string().min(1),
        location: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isCurrent: z.boolean().default(false),
        bullets: bulletList,
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().min(1),
        qualification: z.string().min(1),
        field: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().min(1),
        issuer: z.string().default(''),
        issued: z.string().optional(),
        expires: z.string().optional(),
        credentialId: z.string().optional(),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        years: z.number().optional(),
      }),
    )
    .default([]),
})

export type ParsedCv = z.infer<typeof parsedCvSchema>

const SYSTEM = `You extract a candidate's career history from the text of their CV.

Return only JSON with this shape:
{
  "basics": {"fullName","headline"?,"email"?,"phone"?,"location"?,"summary"?,"linkedin"?,"github"?,"portfolio"?},
  "experiences": [{"company","title","location"?,"startDate"?,"endDate"?,"isCurrent",bullets:[string]}],
  "education": [{"institution","qualification","field"?,"startDate"?,"endDate"?}],
  "certifications": [{"name","issuer","issued"?,"expires"?,"credentialId"?}],
  "skills": [{"name","category"?,"years"?}]
}

Rules:
- Transcribe, do not improve. Keep each achievement bullet in the candidate's own
  words. Do not rewrite for impact, do not add metrics, do not merge two bullets.
- Extract only what the document states. If a field isn't there, omit it. Never
  guess an employer, a date, or a qualification.
- Dates use "YYYY-MM" where the month is given, otherwise "YYYY". Set "isCurrent"
  true and omit "endDate" for anything marked Present/Current/Now.
- "years" on a skill only when the CV explicitly quantifies it. Never estimate it
  from employment dates.
- Split a skills list into individual entries. Give the canonical name ("JavaScript",
  not "JS (5 yrs)"), and put the years in the "years" field if stated.
- "summary" is the candidate's own profile/objective paragraph if the CV has one.
  Do not write one otherwise.
- Order experiences and education most recent first.`

/**
 * Parse CV text into structured entries.
 *
 * Temperature is at the floor: this is transcription, and phrasing variety is the
 * one thing we do not want.
 */
export async function parseCv(text: string): Promise<ParsedCv> {
  return completeJson({
    system: SYSTEM,
    user: `Extract this CV:\n\n${text}`,
    schema: parsedCvSchema,
    temperature: 0,
  })
}

/** An empty proposal, used as the fallback shape for a failed or pending parse. */
export function emptyParsedCv(): ParsedCv {
  return {
    basics: { fullName: '' },
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
  }
}

/** True when a parse produced nothing worth showing the user a review screen for. */
export function isEmptyParse(cv: ParsedCv): boolean {
  return (
    cv.experiences.length === 0 &&
    cv.education.length === 0 &&
    cv.certifications.length === 0 &&
    cv.skills.length === 0
  )
}

/** Total number of importable entries — drives the "we found N entries" summary. */
export function countEntries(cv: ParsedCv): number {
  return (
    cv.experiences.length + cv.education.length + cv.certifications.length + cv.skills.length
  )
}
