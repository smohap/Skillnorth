/**
 * Provenance validation — the anti-fabrication guarantee.
 *
 * SkillNorth rewrites, reorders, and re-weights what a candidate already has. It
 * never invents experience, dates, titles, credentials, or metrics.
 *
 * A prompt instruction is not a guarantee. This module is the guarantee: every
 * generated line must cite profile entities that actually exist, and any number it
 * claims must appear in the source it cites. Lines that fail are rejected before a
 * user ever sees them.
 *
 * Pure functions, unit-tested against known-bad model output.
 */

import type { CoverLetterDoc, CvDoc, CvItem, Profile } from '@/lib/types'

export type ViolationReason =
  | 'no_source'
  | 'unknown_source'
  | 'unsupported_metric'

export interface Violation {
  reason: ViolationReason
  /** Section the offending item came from, for the regeneration prompt. */
  section: string
  text: string
  detail: string
}

export interface ValidationResult<T> {
  valid: boolean
  violations: Violation[]
  /** The document with every failing item removed. Safe to render. */
  sanitised: T
}

/** Every id on the profile that a generated line is allowed to cite. */
export interface SourceIndex {
  ids: Set<string>
  /** id → the source text, for checking metric claims. */
  text: Map<string, string>
}

export function buildSourceIndex(profile: Profile): SourceIndex {
  const ids = new Set<string>()
  const text = new Map<string, string>()

  const add = (id: string, content: string) => {
    ids.add(id)
    text.set(id, content)
  }

  // The profile itself is a legitimate source for the summary line.
  add(profile.id, [profile.headline, profile.summary].filter(Boolean).join(' '))

  for (const exp of profile.experiences) {
    add(exp.id, `${exp.title} ${exp.company} ${exp.location ?? ''}`)
    for (const bullet of exp.bullets) add(bullet.id, bullet.text)
  }
  for (const proj of profile.projects) {
    add(proj.id, `${proj.name} ${proj.description ?? ''}`)
    for (const bullet of proj.bullets) add(bullet.id, bullet.text)
  }
  for (const edu of profile.education) {
    add(edu.id, `${edu.qualification} ${edu.field ?? ''} ${edu.institution}`)
  }
  for (const cert of profile.certifications) {
    add(cert.id, `${cert.name} ${cert.issuer}`)
  }
  for (const skill of profile.skills) {
    add(skill.id, skill.name)
  }

  return { ids, text }
}

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
}

/**
 * Pull the quantitative claims out of a line: percentages, money, multipliers, and
 * bare numbers.
 *
 * Metrics are where fabrication does the most damage. "Improved performance" being
 * reworded is fine; "improved performance by 40%" when the source said 15% is a
 * lie on a document with the candidate's name on it.
 */
export function extractNumericClaims(text: string): string[] {
  const claims: string[] = []
  const pattern = /(?:[$£€]\s?\d[\d,]*(?:\.\d+)?\s*(?:k|m|bn|b)?)|(?:\d[\d,]*(?:\.\d+)?\s*%)|(?:\d[\d,]*(?:\.\d+)?\s*x\b)|(?:\d[\d,]*(?:\.\d+)?)/gi

  const matches = text.match(pattern)
  if (matches) {
    for (const match of matches) claims.push(canonicaliseNumber(match))
  }
  return [...new Set(claims)]
}

/** Strip separators and spacing so "1,200" and "1200" compare equal. */
function canonicaliseNumber(raw: string): string {
  return raw.toLowerCase().replace(/[\s,]/g, '')
}

/**
 * Every numeric claim in `text` must be traceable to `sourceText`.
 *
 * Word forms count: a model that turns "three regions" into "3 regions" hasn't
 * fabricated anything, and rejecting that would make the validator so noisy people
 * would want it switched off.
 */
export function metricsAreSupported(
  text: string,
  sourceText: string,
): { ok: true } | { ok: false; unsupported: string[] } {
  const claims = extractNumericClaims(text)
  if (claims.length === 0) return { ok: true }

  const haystack = canonicaliseNumber(expandNumberWords(sourceText))
  const unsupported = claims.filter((claim) => !haystack.includes(stripUnits(claim)))

  return unsupported.length === 0 ? { ok: true } : { ok: false, unsupported }
}

function expandNumberWords(text: string): string {
  let out = text.toLowerCase()
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    out = out.replace(new RegExp(`\\b${word}\\b`, 'g'), digit)
  }
  return out
}

/**
 * Compare on the digits alone. The source may say "40 percent" where the CV says
 * "40%" — same fact, different notation.
 */
function stripUnits(claim: string): string {
  return claim.replace(/[$£€%x]|k$|m$|bn$|b$/g, '')
}

function validateItem(
  item: CvItem,
  section: string,
  index: SourceIndex,
): Violation[] {
  const violations: Violation[] = []

  if (!item.sourceIds || item.sourceIds.length === 0) {
    violations.push({
      reason: 'no_source',
      section,
      text: item.text,
      detail: 'The line cites no source entry on the profile.',
    })
    return violations
  }

  const unknown = item.sourceIds.filter((id) => !index.ids.has(id))
  if (unknown.length > 0) {
    violations.push({
      reason: 'unknown_source',
      section,
      text: item.text,
      detail: `Cites ${unknown.length === 1 ? 'an id' : 'ids'} that don't exist on this profile: ${unknown.join(', ')}.`,
    })
    return violations
  }

  const sourceText = item.sourceIds.map((id) => index.text.get(id) ?? '').join(' ')
  const metrics = metricsAreSupported(item.text, sourceText)
  if (!metrics.ok) {
    violations.push({
      reason: 'unsupported_metric',
      section,
      text: item.text,
      detail: `Claims ${metrics.unsupported.join(', ')}, which ${metrics.unsupported.length === 1 ? 'does' : 'do'} not appear in the cited source.`,
    })
  }

  return violations
}

/**
 * Validate a generated CV against the profile it claims to be derived from.
 *
 * Returns the violations *and* a sanitised copy with the offending lines stripped,
 * so a partial failure degrades to a shorter honest CV rather than to nothing.
 */
export function validateCvDoc(doc: CvDoc, profile: Profile): ValidationResult<CvDoc> {
  const index = buildSourceIndex(profile)
  const violations: Violation[] = []

  const sections = doc.sections.map((section) => {
    const kept: CvItem[] = []
    for (const item of section.items) {
      const itemViolations = validateItem(item, section.heading || section.type, index)
      if (itemViolations.length === 0) {
        kept.push(item)
      } else {
        violations.push(...itemViolations)
      }
    }
    return { ...section, items: kept }
  })

  return {
    valid: violations.length === 0,
    violations,
    sanitised: { sections: sections.filter((s) => s.items.length > 0) },
  }
}

export function validateCoverLetter(
  doc: CoverLetterDoc,
  profile: Profile,
): ValidationResult<CoverLetterDoc> {
  const index = buildSourceIndex(profile)
  const violations: Violation[] = []
  const kept = []

  for (const para of doc.paragraphs) {
    const paraViolations = validateItem(para, 'cover letter', index)
    if (paraViolations.length === 0) {
      kept.push(para)
    } else {
      violations.push(...paraViolations)
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    sanitised: { ...doc, paragraphs: kept },
  }
}

/**
 * Turn violations into an instruction the model can act on, for the single retry.
 * Naming the specific failures does far more than repeating "don't fabricate".
 */
export function violationsToPrompt(violations: Violation[]): string {
  const lines = violations.map((v) => `- "${v.text}" — ${v.detail}`)
  return [
    'Your previous draft contained lines that failed provenance validation:',
    ...lines,
    '',
    'Rewrite them so that every line cites real sourceIds from the profile provided,',
    'and every number appears in the cited source. Drop any claim you cannot support.',
  ].join('\n')
}
