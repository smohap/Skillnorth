import { describe, expect, it } from 'vitest'
import { priya } from '@/lib/fixtures'
import type { CvDoc } from '@/lib/types'
import {
  buildSourceIndex,
  extractNumericClaims,
  metricsAreSupported,
  validateCvDoc,
  validateCoverLetter,
} from './validate'

/**
 * These tests are written against the ways a model actually misbehaves: citing
 * nothing, citing an id it invented, and — the dangerous one — quietly inflating a
 * number that was in the source.
 */

function doc(items: Array<{ text: string; sourceIds: string[] }>): CvDoc {
  return [{ type: 'experience' as const, heading: 'Experience', items }].reduce(
    (_, s) => ({ sections: [s] }),
    { sections: [] } as CvDoc,
  )
}

describe('buildSourceIndex', () => {
  it('indexes every citable entity on the profile', () => {
    const index = buildSourceIndex(priya)
    expect(index.ids.has('bul_1')).toBe(true)
    expect(index.ids.has('exp_1')).toBe(true)
    expect(index.ids.has('sk_1')).toBe(true)
    expect(index.ids.has('cert_1')).toBe(true)
    expect(index.ids.has('edu_1')).toBe(true)
    expect(index.ids.has(priya.id)).toBe(true)
  })

  it('does not contain an id that is not on the profile', () => {
    expect(buildSourceIndex(priya).ids.has('bul_999')).toBe(false)
  })
})

describe('extractNumericClaims', () => {
  it('pulls out percentages, money, and multipliers', () => {
    expect(extractNumericClaims('cut runtime by 40%')).toContain('40%')
    expect(extractNumericClaims('saved $1,200 a month')).toContain('$1200')
    expect(extractNumericClaims('a 3x improvement')).toContain('3x')
  })

  it('finds nothing to check in a line with no numbers', () => {
    expect(extractNumericClaims('Led the reporting rebuild')).toHaveLength(0)
  })
})

describe('metricsAreSupported', () => {
  it('accepts a metric that appears in the source', () => {
    expect(metricsAreSupported('cut runtime 40%', 'reduced nightly runtime by 40%').ok).toBe(true)
  })

  it('rejects a metric the source never claimed', () => {
    const result = metricsAreSupported('cut runtime by 80%', 'reduced nightly runtime by 40%')
    expect(result.ok).toBe(false)
  })

  it('accepts a digit where the source spelled the number out', () => {
    // A model rewriting "three regions" as "3 regions" has fabricated nothing.
    expect(metricsAreSupported('across 3 regions', 'deployed across three regions').ok).toBe(true)
  })

  it('accepts a notation change from "40 percent" to "40%"', () => {
    expect(metricsAreSupported('by 40%', 'by 40 percent').ok).toBe(true)
  })

  it('accepts thousands separators differing between source and output', () => {
    expect(metricsAreSupported('saved $1200', 'saved $1,200').ok).toBe(true)
  })
})

describe('validateCvDoc', () => {
  it('passes a faithful rewrite of a real bullet', () => {
    const result = validateCvDoc(
      doc([
        {
          text: 'Rebuilt the core reporting pipeline in dbt and Airflow, cutting nightly runtime 40%.',
          sourceIds: ['bul_1'],
        },
      ]),
      priya,
    )
    expect(result.valid).toBe(true)
    expect(result.violations).toHaveLength(0)
    expect(result.sanitised.sections[0].items).toHaveLength(1)
  })

  it('rejects a line that cites no source at all', () => {
    const result = validateCvDoc(
      doc([{ text: 'Managed a team of twelve engineers.', sourceIds: [] }]),
      priya,
    )
    expect(result.valid).toBe(false)
    expect(result.violations[0].reason).toBe('no_source')
  })

  it('rejects a line citing an id the model invented', () => {
    const result = validateCvDoc(
      doc([{ text: 'Ran the data platform.', sourceIds: ['bul_hallucinated'] }]),
      priya,
    )
    expect(result.valid).toBe(false)
    expect(result.violations[0].reason).toBe('unknown_source')
  })

  it('rejects an inflated metric even when the source id is real', () => {
    // The source says 40%. This is the failure mode that matters most: a real
    // citation lending false credibility to a number nobody achieved.
    const result = validateCvDoc(
      doc([
        {
          text: 'Rebuilt the reporting pipeline, cutting nightly runtime by 85%.',
          sourceIds: ['bul_1'],
        },
      ]),
      priya,
    )
    expect(result.valid).toBe(false)
    expect(result.violations[0].reason).toBe('unsupported_metric')
  })

  it('strips failing lines but keeps the good ones', () => {
    const result = validateCvDoc(
      doc([
        { text: 'Cut nightly runtime by 40% using dbt.', sourceIds: ['bul_1'] },
        { text: 'Managed a $5m budget.', sourceIds: ['bul_1'] },
      ]),
      priya,
    )
    expect(result.valid).toBe(false)
    expect(result.sanitised.sections[0].items).toHaveLength(1)
    expect(result.sanitised.sections[0].items[0].text).toContain('40%')
  })

  it('drops a section entirely once all of its items fail', () => {
    const result = validateCvDoc(
      doc([{ text: 'Invented achievement.', sourceIds: ['nope'] }]),
      priya,
    )
    expect(result.sanitised.sections).toHaveLength(0)
  })

  it('allows a metric drawn from any one of several cited sources', () => {
    const result = validateCvDoc(
      doc([
        {
          text: 'Migrated 3 legacy marts while cutting runtime 40%.',
          sourceIds: ['bul_1', 'bul_2'],
        },
      ]),
      priya,
    )
    expect(result.valid).toBe(true)
  })
})

describe('validateCoverLetter', () => {
  it('applies the same provenance rule to letter paragraphs', () => {
    const result = validateCoverLetter(
      {
        greeting: 'Dear Hiring Manager,',
        paragraphs: [
          { text: 'I cut our nightly runtime by 40%.', sourceIds: ['bul_1'] },
          { text: 'I have twelve years of experience.', sourceIds: [] },
        ],
        signoff: 'Kind regards,',
      },
      priya,
    )
    expect(result.valid).toBe(false)
    expect(result.sanitised.paragraphs).toHaveLength(1)
  })
})
