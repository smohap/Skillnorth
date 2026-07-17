/**
 * The match engine.
 *
 * `scoreMatch` is a pure function: same inputs, same output, no network, no clock,
 * no database. That is a correctness requirement, not tidiness. Users set
 * automation thresholds against these numbers, so a score that drifts between 84
 * and 89 across identical runs isn't a score — it's a mood.
 *
 * The subjective dimensions (experience depth, seniority) genuinely need a language
 * model. Rather than call one from in here, the caller does that and passes the
 * result in as a `Judgment`. Everything else is decided by rules.
 */

import {
  type Band,
  type BandSettings,
  type Dimension,
  type Gap,
  type Job,
  type JobRequirement,
  type Judgment,
  type Match,
  type Profile,
  type RequirementEvidence,
  type SubScore,
  type Weights,
  DEFAULT_BAND_SETTINGS,
  DEFAULT_WEIGHTS,
} from '@/lib/types'
import { canonicalise, isSameSkill, textMentionsSkill } from './normalise'

export interface MatchInputs {
  profile: Profile
  job: Job
  weights?: Weights
  bandSettings?: BandSettings
  /** LLM assessments for the two dimensions rules can't decide. */
  judgments: {
    experience: Judgment
    seniority: Judgment
  }
  /**
   * Requirements matched by embedding similarity rather than by name. Computed
   * outside (it needs a model) and injected, so this function stays pure.
   * Keyed by requirement id.
   */
  semanticMatches?: Record<string, { sourceId: string; sourceLabel: string; similarity: number }>
  /**
   * 0–100 similarity between the posting's responsibilities and the candidate's
   * experience bullets. Also embedding-derived, so also injected.
   */
  domainSimilarity?: number
}

/** A must-have miss hurts three times as much as a nice-to-have miss. */
const MUST_HAVE_WEIGHT = 3
const NICE_TO_HAVE_WEIGHT = 1

/** Requirement categories that count toward the technical skills dimension. */
const SKILL_CATEGORIES = new Set(['technical', 'tool', 'domain', 'soft'])

function requirementWeight(req: JobRequirement): number {
  return req.kind === 'must_have' ? MUST_HAVE_WEIGHT : NICE_TO_HAVE_WEIGHT
}

/**
 * Weighted share of skill requirements that are met.
 *
 * Returns 100 when the posting lists no skill requirements — a job that asks for
 * nothing is not a job you fail on skills.
 */
export function technicalScore(requirements: JobRequirement[], matchedIds: Set<string>): number {
  const skillReqs = requirements.filter((r) => SKILL_CATEGORIES.has(r.category))
  if (skillReqs.length === 0) return 100

  let total = 0
  let met = 0
  for (const req of skillReqs) {
    const w = requirementWeight(req)
    total += w
    if (matchedIds.has(req.id)) met += w
  }
  return (met / total) * 100
}

/**
 * Find which skill requirements the profile satisfies, and how.
 *
 * Looks at the skills list first, then falls back to scanning experience and
 * project bullets — plenty of real skills only ever appear in the prose.
 */
export function resolveRequirements(
  profile: Profile,
  job: Job,
  semanticMatches: Record<string, { sourceId: string; sourceLabel: string; similarity: number }> = {},
): { matchedIds: Set<string>; evidence: RequirementEvidence[] } {
  const matchedIds = new Set<string>()
  const evidence: RequirementEvidence[] = []

  const bulletPool = [
    ...profile.experiences.flatMap((exp) =>
      exp.bullets.map((b) => ({ id: b.id, text: b.text, label: `${exp.title} at ${exp.company}` })),
    ),
    ...profile.projects.flatMap((proj) =>
      proj.bullets.map((b) => ({ id: b.id, text: b.text, label: proj.name })),
    ),
  ]

  for (const req of job.requirements) {
    if (!SKILL_CATEGORIES.has(req.category)) continue

    // 1. An explicit skill with the same canonical name.
    const exact = profile.skills.find((s) => isSameSkill(s.name, req.name))
    if (exact) {
      matchedIds.add(req.id)
      evidence.push({
        requirementId: req.id,
        via: canonicalise(exact.name) === canonicalise(req.name) ? 'exact' : 'alias',
        sourceId: exact.id,
        sourceLabel: exact.name,
      })
      continue
    }

    // 2. An alias the parser recorded on the requirement itself.
    const aliasHit = req.aliases
      ? profile.skills.find((s) => req.aliases!.some((a) => isSameSkill(s.name, a)))
      : undefined
    if (aliasHit) {
      matchedIds.add(req.id)
      evidence.push({
        requirementId: req.id,
        via: 'alias',
        sourceId: aliasHit.id,
        sourceLabel: aliasHit.name,
      })
      continue
    }

    // 3. Mentioned in the prose of a role or project.
    const bulletHit = bulletPool.find((b) => textMentionsSkill(b.text, req.name))
    if (bulletHit) {
      matchedIds.add(req.id)
      evidence.push({
        requirementId: req.id,
        via: 'exact',
        sourceId: bulletHit.id,
        sourceLabel: bulletHit.label,
      })
      continue
    }

    // 4. Semantically close, per embeddings computed upstream.
    const semantic = semanticMatches[req.id]
    if (semantic) {
      matchedIds.add(req.id)
      evidence.push({
        requirementId: req.id,
        via: 'semantic',
        sourceId: semantic.sourceId,
        sourceLabel: semantic.sourceLabel,
        similarity: semantic.similarity,
      })
    }
  }

  return { matchedIds, evidence }
}

/**
 * Education and certification requirements. Deterministic: either the candidate
 * holds the qualification or they don't.
 */
export function educationScore(profile: Profile, job: Job): { score: number; rationale: string } {
  const certReqs = job.requirements.filter((r) => r.category === 'certification')
  const eduReqs = job.educationRequirements

  if (certReqs.length === 0 && eduReqs.length === 0) {
    return { score: 100, rationale: 'No formal education or certification requirements listed.' }
  }

  let total = 0
  let met = 0

  for (const req of eduReqs) {
    total += 1
    const holds = profile.education.some(
      (e) =>
        textMentionsSkill(`${e.qualification} ${e.field ?? ''}`, req) ||
        normaliseContains(`${e.qualification} ${e.field ?? ''}`, req),
    )
    if (holds) met += 1
  }

  for (const req of certReqs) {
    total += 1
    const holds = profile.certifications.some((c) => isSameSkill(c.name, req.name))
    if (holds) met += 1
  }

  const score = total === 0 ? 100 : (met / total) * 100
  return {
    score,
    rationale:
      total === 0
        ? 'No formal education or certification requirements listed.'
        : `Holds ${met} of ${total} required qualifications.`,
  }
}

function normaliseContains(haystack: string, needle: string): boolean {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  // Education requirements are phrases ("Bachelor's degree in a numerate field"),
  // so a looser check than skill matching is appropriate here.
  const keyTerms = n.split(/\s+/).filter((t) => t.length > 3)
  if (keyTerms.length === 0) return false
  const hits = keyTerms.filter((t) => h.includes(t)).length
  return hits / keyTerms.length >= 0.5
}

/**
 * Location, work rights, and salary. Deterministic, and deliberately generous:
 * these are cheap to get wrong and expensive to be wrong about, so anything
 * unstated scores as no obstacle rather than as a penalty.
 */
export function logisticsScore(profile: Profile, job: Job): { score: number; rationale: string } {
  const { remote, location } = job.logistics

  if (remote === 'remote') {
    return { score: 100, rationale: 'Role is remote — location is not a constraint.' }
  }

  const jobLocation = location ?? job.location
  if (!jobLocation || !profile.location) {
    return { score: 100, rationale: 'No location constraint stated.' }
  }

  if (locationsOverlap(profile.location, jobLocation)) {
    return { score: 100, rationale: `You're in ${profile.location}, which matches the role.` }
  }

  if (remote === 'hybrid') {
    return {
      score: 50,
      rationale: `Hybrid role in ${jobLocation}; you're in ${profile.location}. Relocation or travel likely.`,
    }
  }

  return {
    score: 25,
    rationale: `On-site in ${jobLocation}; you're in ${profile.location}.`,
  }
}

/**
 * Compare on the city, not the whole string.
 *
 * "Auckland, New Zealand" and "Wellington, New Zealand" share two of their three
 * tokens, so a naive overlap check calls them a match and tells someone in Auckland
 * that an on-site Wellington role is no obstacle. The country is never the
 * commuting question — the city is.
 */
function locationsOverlap(a: string, b: string): boolean {
  const cityTokens = (s: string) =>
    new Set(
      s
        .split(',')[0] // Everything before the first comma is the city.
        .toLowerCase()
        .split(/[/|]|\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2),
    )

  const at = cityTokens(a)
  const bt = cityTokens(b)
  for (const token of at) if (bt.has(token)) return true
  return false
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function normaliseWeights(weights: Weights): { weights: Weights; total: number } {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0)
  if (total <= 0) {
    // A zeroed weight set would divide by zero. Fall back rather than throw:
    // a bad settings row shouldn't take down scoring.
    return { weights: DEFAULT_WEIGHTS, total: 100 }
  }
  return { weights, total }
}

/**
 * Suggest how to close a gap. v1 writes advice; it does not link a marketplace.
 */
function suggestFor(req: JobRequirement): Pick<Gap, 'suggestionKind' | 'suggestion'> {
  switch (req.category) {
    case 'certification':
      return {
        suggestionKind: 'certification',
        suggestion: `Earn the ${req.name} certification, then add it to your profile — it imports back into your CV automatically.`,
      }
    case 'soft':
      return {
        suggestionKind: 'evidence',
        suggestion: `You may already have evidence of ${req.name}. Add a bullet to a past role that shows it concretely.`,
      }
    case 'domain':
      return {
        suggestionKind: 'experience',
        suggestion: `${req.name} is domain experience. If you've touched it, make it explicit in a role; if not, a portfolio project is the fastest proof.`,
      }
    default:
      return {
        suggestionKind: 'course',
        suggestion: `Close this with a short ${req.name} course, then add a project that demonstrates it.`,
      }
  }
}

/**
 * Rank the gaps by how much each one is actually worth.
 *
 * `pointsRecoverable` is computed by re-running the technical score with that one
 * requirement satisfied and taking the difference in the weighted overall. So the
 * ordering reflects real leverage rather than a vibe about importance.
 */
export function computeGaps(
  job: Job,
  matchedIds: Set<string>,
  weights: Weights,
  weightTotal: number,
): Gap[] {
  const baseline = technicalScore(job.requirements, matchedIds)
  const share = weights.technical_skills / weightTotal

  const gaps: Gap[] = []
  for (const req of job.requirements) {
    if (!SKILL_CATEGORIES.has(req.category) && req.category !== 'certification') continue
    if (matchedIds.has(req.id)) continue

    let pointsRecoverable = 0
    if (SKILL_CATEGORIES.has(req.category)) {
      const improved = technicalScore(job.requirements, new Set([...matchedIds, req.id]))
      pointsRecoverable = (improved - baseline) * share
    } else {
      // Certifications land in the education dimension; approximate their value
      // as an even split of that dimension across its requirements.
      const certCount = job.requirements.filter((r) => r.category === 'certification').length
      const eduCount = certCount + job.educationRequirements.length
      pointsRecoverable =
        eduCount > 0 ? (100 / eduCount) * (weights.education / weightTotal) : 0
    }

    gaps.push({
      requirementId: req.id,
      name: req.name,
      kind: req.kind,
      pointsRecoverable: Math.round(pointsRecoverable * 10) / 10,
      ...suggestFor(req),
    })
  }

  return gaps.sort((a, b) => {
    if (b.pointsRecoverable !== a.pointsRecoverable) {
      return b.pointsRecoverable - a.pointsRecoverable
    }
    // Stable tiebreak, so identical inputs always produce an identical order.
    if (a.kind !== b.kind) return a.kind === 'must_have' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function selectBand(overall: number, settings: BandSettings = DEFAULT_BAND_SETTINGS): Band {
  if (overall >= settings.autoBandMin) return 'ready'
  if (overall >= settings.confirmBandMin) return 'confirm'
  if (overall >= settings.improveBandMin) return 'improve'
  return 'filtered'
}

/**
 * Score a profile against a job.
 *
 * Pure. Every input is a value; every output is derived from those values.
 */
export function scoreMatch(inputs: MatchInputs): Match {
  const {
    profile,
    job,
    judgments,
    semanticMatches = {},
    domainSimilarity,
    bandSettings = DEFAULT_BAND_SETTINGS,
  } = inputs

  const { weights, total: weightTotal } = normaliseWeights(inputs.weights ?? DEFAULT_WEIGHTS)

  const { matchedIds, evidence } = resolveRequirements(profile, job, semanticMatches)

  const skillReqs = job.requirements.filter((r) => SKILL_CATEGORIES.has(r.category))
  const technical = technicalScore(job.requirements, matchedIds)
  const matchedCount = skillReqs.filter((r) => matchedIds.has(r.id)).length

  const education = educationScore(profile, job)
  const logistics = logisticsScore(profile, job)

  const responsibilities = domainSimilarity ?? 50

  const subscores: SubScore[] = [
    {
      dimension: 'technical_skills',
      score: clamp(technical),
      weight: weights.technical_skills,
      rationale:
        skillReqs.length === 0
          ? 'The posting lists no specific skill requirements.'
          : `You meet ${matchedCount} of ${skillReqs.length} listed skills. Must-haves count triple.`,
    },
    {
      dimension: 'experience',
      score: clamp(judgments.experience.score),
      weight: weights.experience,
      rationale: judgments.experience.rationale,
    },
    {
      dimension: 'responsibilities',
      score: clamp(responsibilities),
      weight: weights.responsibilities,
      rationale:
        domainSimilarity === undefined
          ? 'Not yet compared — responsibilities similarity is still being computed.'
          : `Your past work overlaps ${Math.round(responsibilities)}% with what this role asks you to do day to day.`,
    },
    {
      dimension: 'education',
      score: clamp(education.score),
      weight: weights.education,
      rationale: education.rationale,
    },
    {
      dimension: 'seniority',
      score: clamp(judgments.seniority.score),
      weight: weights.seniority,
      rationale: judgments.seniority.rationale,
    },
    {
      dimension: 'logistics',
      score: clamp(logistics.score),
      weight: weights.logistics,
      rationale: logistics.rationale,
    },
  ]

  const weighted = subscores.reduce((sum, s) => sum + s.score * s.weight, 0)
  const overall = Math.round(weighted / weightTotal)

  return {
    jobId: job.id,
    profileId: profile.id,
    profileVersion: profile.version,
    overall,
    band: selectBand(overall, bandSettings),
    subscores,
    gaps: computeGaps(job, matchedIds, weights, weightTotal),
    evidence,
  }
}
