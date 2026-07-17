import { describe, expect, it } from 'vitest'
import { orbitalJob, priya, snowbirdJob } from '@/lib/fixtures'
import { DEFAULT_BAND_SETTINGS, DEFAULT_WEIGHTS, type Job } from '@/lib/types'
import { canonicalise, isSameSkill, textMentionsSkill } from './normalise'
import {
  computeGaps,
  logisticsScore,
  resolveRequirements,
  scoreMatch,
  selectBand,
  technicalScore,
} from './score'

const judgments = {
  experience: { score: 90, rationale: 'Six years against a five-year ask.' },
  seniority: { score: 80, rationale: 'Senior-level scope, no formal reports.' },
}

describe('normalise', () => {
  it('treats known aliases as the same skill', () => {
    expect(isSameSkill('GCP', 'Google Cloud Platform')).toBe(true)
    expect(isSameSkill('NodeJS', 'Node.js')).toBe(true)
    expect(isSameSkill('k8s', 'Kubernetes')).toBe(true)
  })

  it('does not confuse distinct skills that share a prefix', () => {
    // Substring matching is how "Java" starts matching "JavaScript".
    expect(isSameSkill('Java', 'JavaScript')).toBe(false)
  })

  it('preserves characters that distinguish real skills', () => {
    expect(canonicalise('C++')).not.toBe(canonicalise('C#'))
  })

  it('finds a skill mentioned in prose but bounded to whole words', () => {
    expect(textMentionsSkill('Rebuilt the pipeline in dbt and Airflow', 'dbt')).toBe(true)
    expect(textMentionsSkill('Wrote a lot of Java code', 'JavaScript')).toBe(false)
  })
})

describe('technicalScore', () => {
  it('scores 100 when a posting lists no skill requirements', () => {
    const bare: Job = { ...snowbirdJob, requirements: [] }
    expect(technicalScore(bare.requirements, new Set())).toBe(100)
  })

  it('weights a must-have miss three times a nice-to-have miss', () => {
    const reqs = snowbirdJob.requirements
    const all = new Set(reqs.map((r) => r.id))

    const missingMustHave = new Set(all)
    missingMustHave.delete('req_1') // SQL, must_have

    const missingNiceToHave = new Set(all)
    missingNiceToHave.delete('req_5') // Airflow, nice_to_have

    const mustHaveLoss = 100 - technicalScore(reqs, missingMustHave)
    const niceToHaveLoss = 100 - technicalScore(reqs, missingNiceToHave)

    expect(mustHaveLoss).toBeCloseTo(niceToHaveLoss * 3, 5)
  })
})

describe('resolveRequirements', () => {
  it('matches skills listed explicitly on the profile', () => {
    const { matchedIds } = resolveRequirements(priya, snowbirdJob)
    expect(matchedIds.has('req_1')).toBe(true) // SQL
    expect(matchedIds.has('req_3')).toBe(true) // dbt
  })

  it('finds skills that only appear in experience prose', () => {
    // CI/CD is not in Priya's skills list, only in a bullet.
    expect(priya.skills.some((s) => isSameSkill(s.name, 'CI/CD'))).toBe(false)

    const { matchedIds, evidence } = resolveRequirements(priya, snowbirdJob)
    expect(matchedIds.has('req_6')).toBe(true)

    const hit = evidence.find((e) => e.requirementId === 'req_6')
    expect(hit?.sourceId).toBe('bul_3')
  })

  it('reports genuine gaps as unmatched', () => {
    const { matchedIds } = resolveRequirements(priya, orbitalJob)
    expect(matchedIds.has('oreq_2')).toBe(false) // Terraform
    expect(matchedIds.has('oreq_3')).toBe(false) // Kubernetes
  })

  it('accepts semantic matches supplied by the caller', () => {
    const { matchedIds } = resolveRequirements(priya, orbitalJob, {
      oreq_5: { sourceId: 'bul_4', sourceLabel: 'BI Analyst', similarity: 0.86 },
    })
    expect(matchedIds.has('oreq_5')).toBe(true)
  })
})

describe('logisticsScore', () => {
  it('ignores location entirely for remote roles', () => {
    const elsewhere = { ...priya, location: 'Reykjavik, Iceland' }
    expect(logisticsScore(elsewhere, snowbirdJob).score).toBe(100)
  })

  it('penalises an on-site role in another city', () => {
    expect(logisticsScore(priya, orbitalJob).score).toBeLessThan(50)
  })

  it('treats an unstated location as no obstacle rather than a penalty', () => {
    const noLocation: Job = { ...orbitalJob, location: undefined, logistics: {} }
    expect(logisticsScore(priya, noLocation).score).toBe(100)
  })
})

describe('selectBand', () => {
  it('maps scores onto the default bands', () => {
    expect(selectBand(94)).toBe('ready')
    expect(selectBand(90)).toBe('ready')
    expect(selectBand(89)).toBe('confirm')
    expect(selectBand(80)).toBe('confirm')
    expect(selectBand(79)).toBe('improve')
    expect(selectBand(60)).toBe('improve')
    expect(selectBand(59)).toBe('filtered')
  })

  it('honours user-tightened thresholds', () => {
    const strict = { ...DEFAULT_BAND_SETTINGS, autoBandMin: 95 }
    expect(selectBand(94, strict)).toBe('confirm')
  })
})

describe('computeGaps', () => {
  it('ranks gaps by the points each one would actually recover', () => {
    const { matchedIds } = resolveRequirements(priya, orbitalJob)
    const gaps = computeGaps(orbitalJob, matchedIds, DEFAULT_WEIGHTS, 100)

    expect(gaps.length).toBeGreaterThan(0)
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i - 1].pointsRecoverable).toBeGreaterThanOrEqual(gaps[i].pointsRecoverable)
    }
    // Must-haves are worth more, so they should lead.
    expect(gaps[0].kind).toBe('must_have')
  })

  it('never lists a met requirement as a gap', () => {
    const { matchedIds } = resolveRequirements(priya, snowbirdJob)
    const gaps = computeGaps(snowbirdJob, matchedIds, DEFAULT_WEIGHTS, 100)
    for (const gap of gaps) {
      expect(matchedIds.has(gap.requirementId)).toBe(false)
    }
  })
})

describe('scoreMatch', () => {
  it('scores a strong match into the ready band', () => {
    const match = scoreMatch({
      profile: priya,
      job: snowbirdJob,
      judgments,
      domainSimilarity: 88,
    })

    expect(match.overall).toBeGreaterThanOrEqual(90)
    expect(match.band).toBe('ready')
    expect(match.gaps).toHaveLength(0)
  })

  it('scores a weak match below the auto-apply bar and explains why', () => {
    const match = scoreMatch({
      profile: priya,
      job: orbitalJob,
      judgments: {
        experience: { score: 60, rationale: 'Six years against an eight-year ask.' },
        seniority: { score: 55, rationale: 'No direct leadership experience yet.' },
      },
      domainSimilarity: 62,
    })

    expect(match.overall).toBeLessThan(90)
    expect(match.gaps.map((g) => g.name)).toContain('Terraform')
  })

  it('is deterministic — identical inputs give an identical score', () => {
    const inputs = { profile: priya, job: snowbirdJob, judgments, domainSimilarity: 88 }
    const a = scoreMatch(inputs)
    const b = scoreMatch(inputs)
    expect(a.overall).toBe(b.overall)
    expect(a.gaps).toEqual(b.gaps)
  })

  it('produces a rationale for every dimension, so the score is always explainable', () => {
    const match = scoreMatch({ profile: priya, job: snowbirdJob, judgments, domainSimilarity: 88 })
    expect(match.subscores).toHaveLength(6)
    for (const sub of match.subscores) {
      expect(sub.rationale.length).toBeGreaterThan(0)
      expect(sub.score).toBeGreaterThanOrEqual(0)
      expect(sub.score).toBeLessThanOrEqual(100)
    }
  })

  it('survives a zeroed weight set instead of dividing by zero', () => {
    const zeroed = {
      technical_skills: 0,
      experience: 0,
      responsibilities: 0,
      education: 0,
      seniority: 0,
      logistics: 0,
    }
    const match = scoreMatch({
      profile: priya,
      job: snowbirdJob,
      judgments,
      weights: zeroed,
      domainSimilarity: 88,
    })
    expect(Number.isFinite(match.overall)).toBe(true)
  })

  it('carries the profile version through, so stale scores can be detected', () => {
    const match = scoreMatch({ profile: priya, job: snowbirdJob, judgments })
    expect(match.profileVersion).toBe(priya.version)
  })
})
