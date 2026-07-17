/**
 * The SkillNorth Readiness Score.
 *
 * This is our own heuristic, and the UI says so plainly. Workday, Greenhouse, and
 * iCIMS do not publish a score, and most of them filter rather than rank — so any
 * product claiming to "simulate your ATS score" is inventing a number. We don't.
 *
 * What we measure is real and actionable: will this document parse cleanly, and
 * does it cover what the posting actually asked for?
 *
 * Pure functions. No network, no model.
 */

import type { CvDoc, Job, Readiness, ReadinessPart } from '@/lib/types'
import { textMentionsSkill } from '@/lib/match/normalise'

const MAX = {
  parse_safety: 25,
  keyword_coverage: 40,
  structure: 15,
  format: 10,
} as const

/** The stuffing check subtracts, it never adds. */
const STUFFING_PENALTY_MAX = 10

/** Sections a human recruiter and a parser both expect to find. */
const EXPECTED_SECTIONS = ['experience', 'education', 'skills'] as const

export interface DocumentTraits {
  /** Multi-column layouts are the single most common cause of garbled parsing. */
  multiColumn: boolean
  hasTables: boolean
  hasImages: boolean
  /** Text in headers/footers is silently dropped by several parsers. */
  textInHeaderFooter: boolean
  /** False for scanned or image-based PDFs, which parse to nothing at all. */
  selectableText: boolean
  standardFonts: boolean
  fileType: 'pdf' | 'docx' | 'other'
}

/**
 * Documents SkillNorth generates are safe by construction: the templates are
 * single-column, text-only, with standard fonts and nothing in the margins. This
 * is what the generated-document path passes in.
 */
export const GENERATED_DOC_TRAITS: DocumentTraits = {
  multiColumn: false,
  hasTables: false,
  hasImages: false,
  textInHeaderFooter: false,
  selectableText: true,
  standardFonts: true,
  fileType: 'pdf',
}

export function scoreParseSafety(traits: DocumentTraits): ReadinessPart {
  const problems: string[] = []
  let score = MAX.parse_safety

  if (traits.multiColumn) {
    score -= 12
    problems.push('multi-column layout')
  }
  if (traits.hasTables) {
    score -= 6
    problems.push('tables')
  }
  if (traits.hasImages) {
    score -= 4
    problems.push('images')
  }
  if (traits.textInHeaderFooter) {
    score -= 3
    problems.push('text in the header or footer')
  }

  return {
    component: 'parse_safety',
    score: Math.max(0, score),
    max: MAX.parse_safety,
    detail:
      problems.length === 0
        ? 'Single-column, no tables or images — parsers will read this cleanly.'
        : `Likely to confuse parsers: ${problems.join(', ')}.`,
  }
}

export function scoreFormat(traits: DocumentTraits): ReadinessPart {
  const problems: string[] = []
  let score = MAX.format

  if (!traits.selectableText) {
    score -= 7
    problems.push('the text is not selectable, so a parser reads nothing at all')
  }
  if (!traits.standardFonts) {
    score -= 2
    problems.push('non-standard fonts')
  }
  if (traits.fileType === 'other') {
    score -= 1
    problems.push('unusual file type')
  }

  return {
    component: 'format',
    score: Math.max(0, score),
    max: MAX.format,
    detail:
      problems.length === 0
        ? 'Selectable text, standard fonts, standard file type.'
        : `Format issues: ${problems.join('; ')}.`,
  }
}

/** All the prose in the document, flattened. */
export function documentText(doc: CvDoc): string {
  return doc.sections.flatMap((s) => [s.heading, ...s.items.map((i) => i.text)]).join('\n')
}

export function scoreKeywordCoverage(
  text: string,
  job: Job,
): { part: ReadinessPart; covered: string[]; missing: string[] } {
  const relevant = job.requirements.filter((r) => r.category !== 'education')

  if (relevant.length === 0) {
    return {
      part: {
        component: 'keyword_coverage',
        score: MAX.keyword_coverage,
        max: MAX.keyword_coverage,
        detail: 'The posting lists no specific requirements to cover.',
      },
      covered: [],
      missing: [],
    }
  }

  const covered: string[] = []
  const missing: string[] = []

  // Must-haves count triple here, mirroring the match engine — the two numbers
  // should move together, or users will rightly ask why they disagree.
  let total = 0
  let met = 0
  for (const req of relevant) {
    const weight = req.kind === 'must_have' ? 3 : 1
    total += weight
    const present =
      textMentionsSkill(text, req.name) ||
      (req.aliases ?? []).some((a) => textMentionsSkill(text, a))
    if (present) {
      met += weight
      covered.push(req.name)
    } else {
      missing.push(req.name)
    }
  }

  const ratio = total === 0 ? 1 : met / total
  return {
    part: {
      component: 'keyword_coverage',
      score: Math.round(ratio * MAX.keyword_coverage),
      max: MAX.keyword_coverage,
      detail: `Covers ${covered.length} of ${relevant.length} requirements from the posting.`,
    },
    covered,
    missing,
  }
}

export function scoreStructure(doc: CvDoc): ReadinessPart {
  const present = new Set(doc.sections.map((s) => s.type))
  const found = EXPECTED_SECTIONS.filter((s) => present.has(s))
  const absent = EXPECTED_SECTIONS.filter((s) => !present.has(s))

  const score = Math.round((found.length / EXPECTED_SECTIONS.length) * MAX.structure)

  return {
    component: 'structure',
    score,
    max: MAX.structure,
    detail:
      absent.length === 0
        ? 'All the standard sections are present and clearly headed.'
        : `Missing standard ${absent.length === 1 ? 'section' : 'sections'}: ${absent.join(', ')}.`,
  }
}

/**
 * Penalise keyword stuffing.
 *
 * Repeating "Kubernetes" eleven times used to game naive filters. It no longer
 * works, it reads badly to the human who eventually opens the file, and some
 * parsers flag it. Rewarding coverage without penalising density would push people
 * straight into it — so this is the counterweight that keeps the score honest.
 */
export function scoreStuffing(text: string, job: Job): ReadinessPart {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length < 50) {
    return {
      component: 'stuffing',
      score: 0,
      max: STUFFING_PENALTY_MAX,
      detail: 'Document is too short to assess keyword density.',
    }
  }

  const offenders: string[] = []
  for (const req of job.requirements) {
    const occurrences = countOccurrences(text, req.name)
    const density = occurrences / words.length
    // Above ~1.5% of the whole document for a single term reads as stuffing.
    if (occurrences >= 5 && density > 0.015) {
      offenders.push(`${req.name} (${occurrences}×)`)
    }
  }

  const penalty = Math.min(STUFFING_PENALTY_MAX, offenders.length * 4)
  return {
    component: 'stuffing',
    score: -penalty,
    max: STUFFING_PENALTY_MAX,
    detail:
      offenders.length === 0
        ? 'Keyword density reads naturally.'
        : `Over-repeated, which reads as stuffing: ${offenders.join(', ')}.`,
  }
}

function countOccurrences(text: string, term: string): number {
  const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = text.toLowerCase().match(new RegExp(`(^|\\s)${escaped}($|\\s|,|\\.)`, 'g'))
  return matches ? matches.length : 0
}

/**
 * Score a generated CV against the posting it was tailored for.
 */
export function scoreReadiness(
  doc: CvDoc,
  job: Job,
  traits: DocumentTraits = GENERATED_DOC_TRAITS,
): Readiness {
  const text = documentText(doc)

  const parseSafety = scoreParseSafety(traits)
  const format = scoreFormat(traits)
  const structure = scoreStructure(doc)
  const { part: coverage, covered, missing } = scoreKeywordCoverage(text, job)
  const stuffing = scoreStuffing(text, job)

  const parts = [parseSafety, coverage, structure, format, stuffing]
  const raw = parts.reduce((sum, p) => sum + p.score, 0)

  return {
    overall: Math.max(0, Math.min(100, Math.round(raw))),
    parts,
    covered,
    missing,
  }
}
