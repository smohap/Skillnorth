/**
 * Core domain types for SkillNorth.
 *
 * These describe the shape of a candidate's career knowledge base, a parsed job
 * posting, and the results of scoring one against the other. Everything here is
 * plain data: no database rows, no LLM clients, no framework types.
 */

// ---------------------------------------------------------------------------
// Profile — the career knowledge base
// ---------------------------------------------------------------------------

/**
 * Where a skill claim came from. The match engine may weight these differently:
 * a skill a recruiter verified is worth more than one the candidate typed in.
 * v1 treats `parsed` and `self` alike; `verified` is reserved for Phase 2.
 */
export type SkillSource = 'parsed' | 'self' | 'verified'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface Skill {
  id: string
  name: string
  category?: string
  level?: SkillLevel
  years?: number
  source: SkillSource
}

/**
 * A single achievement line. Bullets are the atoms of provenance: generated CV
 * content must cite the bullet ids it was derived from.
 */
export interface Bullet {
  id: string
  text: string
}

export interface Experience {
  id: string
  company: string
  title: string
  location?: string
  /** ISO date, `YYYY-MM` precision is enough and is what CVs usually carry. */
  startDate: string
  /** Null when this is the current role. */
  endDate: string | null
  isCurrent: boolean
  bullets: Bullet[]
}

export interface Education {
  id: string
  institution: string
  qualification: string
  field?: string
  startDate?: string
  endDate?: string
}

export interface Certification {
  id: string
  name: string
  issuer: string
  issued?: string
  expires?: string
  credentialId?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  url?: string
  bullets: Bullet[]
}

export interface ProfileLinks {
  linkedin?: string
  github?: string
  portfolio?: string
  other?: string[]
}

export interface Profile {
  id: string
  fullName: string
  headline?: string
  email?: string
  phone?: string
  location?: string
  links: ProfileLinks
  summary?: string
  /**
   * Bumped on every edit. Match results are cached against it, so a profile
   * change invalidates every stale score at once without any cache-busting logic.
   */
  version: number
  experiences: Experience[]
  education: Education[]
  certifications: Certification[]
  skills: Skill[]
  projects: Project[]
}

// ---------------------------------------------------------------------------
// Job — a parsed posting
// ---------------------------------------------------------------------------

export type RequirementKind = 'must_have' | 'nice_to_have'

export type RequirementCategory =
  | 'technical'
  | 'tool'
  | 'domain'
  | 'soft'
  | 'education'
  | 'certification'

export interface JobRequirement {
  id: string
  /** The skill or capability as the posting words it, normalised lightly. */
  name: string
  kind: RequirementKind
  category: RequirementCategory
  /** Aliases the parser recognised, e.g. "GCP" for "Google Cloud Platform". */
  aliases?: string[]
}

export type Seniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'manager'
  | 'director'
  | 'executive'

export interface JobLogistics {
  location?: string
  remote?: 'onsite' | 'hybrid' | 'remote'
  salaryMin?: number
  salaryMax?: number
  currency?: string
  workRights?: string
  employmentType?: string
}

export interface Job {
  id: string
  url?: string
  /** Where the posting came from, e.g. 'linkedin' | 'seek' | 'greenhouse' | 'pasted'. */
  source: string
  title: string
  company: string
  location?: string
  rawText: string
  requirements: JobRequirement[]
  responsibilities: string[]
  seniority?: Seniority
  educationRequirements: string[]
  logistics: JobLogistics
  /** Minimum years of relevant experience, when the posting states one. */
  minYearsExperience?: number
}

// ---------------------------------------------------------------------------
// Match — scoring a profile against a job
// ---------------------------------------------------------------------------

export type Dimension =
  | 'technical_skills'
  | 'experience'
  | 'responsibilities'
  | 'education'
  | 'seniority'
  | 'logistics'

export type Weights = Record<Dimension, number>

/**
 * The default weighting. Sums to 100 — `normaliseWeights` does not require this,
 * but keeping the defaults summing to 100 makes them readable as percentages.
 */
export const DEFAULT_WEIGHTS: Weights = {
  technical_skills: 35,
  experience: 25,
  responsibilities: 15,
  education: 10,
  seniority: 10,
  logistics: 5,
}

export interface SubScore {
  dimension: Dimension
  /** 0–100, before weighting. */
  score: number
  weight: number
  /** Plain-English reason, shown to the user. This is what makes a score explainable. */
  rationale: string
}

/**
 * An LLM's assessment of one subjective dimension. Kept separate from the scoring
 * function so that scoring stays a pure function of its inputs — the model call
 * happens outside and its result is passed in.
 */
export interface Judgment {
  score: number
  rationale: string
}

/** Evidence that a requirement was met by something other than an exact name match. */
export interface RequirementEvidence {
  requirementId: string
  /** How it was matched — exact name, a known alias, or embedding similarity. */
  via: 'exact' | 'alias' | 'semantic'
  /** The profile skill or bullet that satisfied it. */
  sourceId: string
  sourceLabel: string
  /** Cosine similarity, only present for `semantic` matches. */
  similarity?: number
}

export type GapKind = 'course' | 'certification' | 'evidence' | 'experience'

export interface Gap {
  requirementId: string
  name: string
  kind: RequirementKind
  /**
   * How many points the overall score would rise if this gap alone were closed.
   * Gaps are ranked by this, which makes the ordering meaningful rather than
   * arbitrary — the top gap really is the highest-leverage move.
   */
  pointsRecoverable: number
  suggestionKind: GapKind
  suggestion: string
}

export type Band = 'ready' | 'confirm' | 'improve' | 'filtered'

export interface Match {
  jobId: string
  profileId: string
  profileVersion: number
  /** 0–100, weighted roll-up of the subscores. */
  overall: number
  band: Band
  subscores: SubScore[]
  gaps: Gap[]
  evidence: RequirementEvidence[]
}

export interface BandSettings {
  autoBandMin: number
  confirmBandMin: number
  improveBandMin: number
}

export const DEFAULT_BAND_SETTINGS: BandSettings = {
  autoBandMin: 90,
  confirmBandMin: 80,
  improveBandMin: 60,
}

// ---------------------------------------------------------------------------
// Generation — tailored documents
// ---------------------------------------------------------------------------

export type CvSectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'

/**
 * One line of generated content, with the profile entities it was derived from.
 *
 * `sourceIds` is not decoration. The validator rejects any item whose sources do
 * not resolve to real rows on this profile, which is how the "never fabricate"
 * guarantee is enforced structurally rather than by asking the model politely.
 */
export interface CvItem {
  text: string
  sourceIds: string[]
}

export interface CvSection {
  type: CvSectionType
  /** Heading as it should appear. Kept plain for ATS parse safety. */
  heading: string
  items: CvItem[]
  /**
   * For experience sections: the experience this block belongs to. Company, title,
   * and dates are templated from the database at render time, never from the model.
   */
  experienceId?: string
}

export interface CvDoc {
  sections: CvSection[]
}

export interface CoverLetterDoc {
  greeting: string
  paragraphs: CvItem[]
  signoff: string
}

// ---------------------------------------------------------------------------
// Readiness — SkillNorth's own heuristic
// ---------------------------------------------------------------------------

export type ReadinessComponent =
  | 'parse_safety'
  | 'keyword_coverage'
  | 'structure'
  | 'format'
  | 'stuffing'

export interface ReadinessPart {
  component: ReadinessComponent
  score: number
  max: number
  detail: string
}

export interface Readiness {
  /** 0–100. SkillNorth's own measure, not a vendor ATS score. */
  overall: number
  parts: ReadinessPart[]
  /** Requirement names present in the document. */
  covered: string[]
  /** Requirement names absent from the document. */
  missing: string[]
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export type ApplicationStatus =
  | 'prepared'
  | 'awaiting_confirmation'
  | 'applied'
  | 'interview'
  | 'assessment'
  | 'offer'
  | 'rejected'
  | 'accepted'

export interface TimelineEntry {
  at: string
  status: ApplicationStatus
  note?: string
}

export interface Application {
  id: string
  jobId: string
  documentId?: string
  status: ApplicationStatus
  timeline: TimelineEntry[]
  appliedAt?: string
}
