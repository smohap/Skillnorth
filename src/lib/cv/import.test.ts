import { describe, expect, it } from 'vitest'
import type { Profile } from '@/lib/types'
import { allKeys, dropDuplicates, selectEntries, summarise, summaryTotal } from './import'
import { emptyParsedCv, type ParsedCv } from './parse'

function cv(overrides: Partial<ParsedCv> = {}): ParsedCv {
  return { ...emptyParsedCv(), ...overrides }
}

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    fullName: 'Priya',
    links: {},
    version: 1,
    experiences: [],
    education: [],
    certifications: [],
    skills: [],
    projects: [],
    ...overrides,
  }
}

const sample = cv({
  experiences: [
    { company: 'Acme', title: 'Engineer', isCurrent: true, bullets: ['Shipped a thing'] },
    { company: 'Globex', title: 'Analyst', isCurrent: false, bullets: [] },
  ],
  education: [{ institution: 'UoA', qualification: 'BSc' }],
  certifications: [{ name: 'AWS SAA', issuer: 'Amazon' }],
  skills: [{ name: 'Python' }, { name: 'SQL' }],
})

describe('allKeys', () => {
  it('produces one key per importable entry', () => {
    expect(allKeys(sample)).toEqual([
      'experience:0',
      'experience:1',
      'education:0',
      'certification:0',
      'skill:0',
      'skill:1',
    ])
  })
})

describe('selectEntries', () => {
  it('keeps only the ticked entries', () => {
    const picked = selectEntries(sample, ['experience:1', 'skill:0'])

    expect(picked.experiences).toHaveLength(1)
    expect(picked.experiences[0].company).toBe('Globex')
    expect(picked.skills.map((s) => s.name)).toEqual(['Python'])
    expect(picked.education).toHaveLength(0)
  })

  it('returns nothing when nothing is ticked', () => {
    expect(summaryTotal(summarise(selectEntries(sample, [])))).toBe(0)
  })

  it('ignores keys that do not correspond to an entry', () => {
    // A stale form post referencing an index that no longer exists must not throw.
    const picked = selectEntries(sample, ['experience:99', 'nonsense'])
    expect(summaryTotal(summarise(picked))).toBe(0)
  })
})

describe('dropDuplicates', () => {
  it('skips a role the profile already has', () => {
    const existing = profile({
      experiences: [
        {
          id: 'e1',
          company: 'ACME',
          title: 'engineer',
          startDate: '2020-01',
          endDate: null,
          isCurrent: true,
          bullets: [],
        },
      ],
    })

    const fresh = dropDuplicates(sample, existing)
    expect(fresh.experiences.map((e) => e.company)).toEqual(['Globex'])
  })

  it('keeps a second, different role at the same employer', () => {
    // Promotions are real history — matching on company alone would erase them.
    const existing = profile({
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Intern',
          startDate: '2018-01',
          endDate: '2019-01',
          isCurrent: false,
          bullets: [],
        },
      ],
    })

    expect(dropDuplicates(sample, existing).experiences).toHaveLength(2)
  })

  it('matches skills regardless of case and punctuation', () => {
    const existing = profile({
      skills: [{ id: 's1', name: 'python', source: 'self' }],
    })

    expect(dropDuplicates(sample, existing).skills.map((s) => s.name)).toEqual(['SQL'])
  })

  it('de-duplicates a skill the CV itself lists twice', () => {
    const repeated = cv({ skills: [{ name: 'Python' }, { name: 'python ' }, { name: 'Go' }] })

    expect(dropDuplicates(repeated, profile()).skills.map((s) => s.name)).toEqual([
      'Python',
      'Go',
    ])
  })

  it('skips a certification already held, ignoring the issuer', () => {
    const existing = profile({
      certifications: [{ id: 'c1', name: 'AWS SAA', issuer: 'AWS' }],
    })

    expect(dropDuplicates(sample, existing).certifications).toHaveLength(0)
  })

  it('leaves everything alone for an empty profile', () => {
    expect(summaryTotal(summarise(dropDuplicates(sample, profile())))).toBe(6)
  })
})
