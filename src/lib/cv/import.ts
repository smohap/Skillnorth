/**
 * Deciding what actually gets imported from a parsed CV.
 *
 * Two jobs, both pure so they can be tested without a database:
 *  - narrowing the proposal to the entries the user ticked on the review screen;
 *  - dropping entries the profile already has.
 *
 * The de-duplication exists because uploading a second CV is the normal case, not
 * the exception — people iterate on their CV and re-upload. Without this, a user
 * ends up with "Python" four times and a match score built on inflated evidence.
 */

import type { ParsedCv } from './parse'
import type { Profile } from '@/lib/types'

/**
 * A stable handle for one proposed entry, e.g. `experience:2`.
 *
 * Index-based rather than content-based because the review screen renders the
 * parsed payload verbatim — the index IS the identity for the life of that screen,
 * and the payload is re-read from the database on submit so it cannot drift.
 */
export type EntrySection = 'experience' | 'education' | 'certification' | 'skill'
export type EntryKey = `${EntrySection}:${number}`

/** Every key in a proposal, in render order. Used to pre-tick "select all". */
export function allKeys(cv: ParsedCv): EntryKey[] {
  return [
    ...cv.experiences.map((_, i): EntryKey => `experience:${i}`),
    ...cv.education.map((_, i): EntryKey => `education:${i}`),
    ...cv.certifications.map((_, i): EntryKey => `certification:${i}`),
    ...cv.skills.map((_, i): EntryKey => `skill:${i}`),
  ]
}

/** Narrow a proposal to just the ticked entries. */
export function selectEntries(cv: ParsedCv, keys: readonly string[]): ParsedCv {
  const picked = new Set(keys)
  const keep = (section: string, i: number) => picked.has(`${section}:${i}`)

  return {
    basics: cv.basics,
    experiences: cv.experiences.filter((_, i) => keep('experience', i)),
    education: cv.education.filter((_, i) => keep('education', i)),
    certifications: cv.certifications.filter((_, i) => keep('certification', i)),
    skills: cv.skills.filter((_, i) => keep('skill', i)),
  }
}

/** Case- and punctuation-insensitive comparison key. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, '')
    .trim()
}

/**
 * Remove entries the profile already holds.
 *
 * Matching is deliberately conservative — a role is "the same" only when both
 * company and title match. Two different stints at one employer are a real thing,
 * and silently swallowing the second would lose genuine history. Over-importing is
 * recoverable by deleting a row; under-importing is invisible to the user.
 */
export function dropDuplicates(cv: ParsedCv, profile: Profile): ParsedCv {
  const existingRoles = new Set(
    profile.experiences.map((e) => `${norm(e.company)}|${norm(e.title)}`),
  )
  const existingEducation = new Set(
    profile.education.map((e) => `${norm(e.institution)}|${norm(e.qualification)}`),
  )
  const existingCerts = new Set(profile.certifications.map((c) => norm(c.name)))
  const existingSkills = new Set(profile.skills.map((s) => norm(s.name)))

  return {
    basics: cv.basics,
    experiences: cv.experiences.filter(
      (e) => !existingRoles.has(`${norm(e.company)}|${norm(e.title)}`),
    ),
    education: cv.education.filter(
      (e) => !existingEducation.has(`${norm(e.institution)}|${norm(e.qualification)}`),
    ),
    certifications: cv.certifications.filter((c) => !existingCerts.has(norm(c.name))),
    // Skills also de-duplicate within the proposal itself: CVs commonly list the
    // same skill in a summary and again in a skills table.
    skills: dedupeWithin(
      cv.skills.filter((s) => !existingSkills.has(norm(s.name))),
      (s) => norm(s.name),
    ),
  }
}

function dedupeWithin<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export interface ImportSummary {
  experiences: number
  education: number
  certifications: number
  skills: number
}

export function summarise(cv: ParsedCv): ImportSummary {
  return {
    experiences: cv.experiences.length,
    education: cv.education.length,
    certifications: cv.certifications.length,
    skills: cv.skills.length,
  }
}

export function summaryTotal(summary: ImportSummary): number {
  return summary.experiences + summary.education + summary.certifications + summary.skills
}
