/**
 * The profile repository — the boundary between Supabase rows and domain types.
 *
 * Everything above this file works with the plain `Profile` shape from types.ts and
 * knows nothing about Postgres column names. That separation is what let the match
 * engine be built and tested long before this file existed, and it's what makes the
 * storage swappable without touching the scoring logic.
 *
 * Every mutation bumps the profile version, because a changed profile invalidates
 * every cached match score. That invalidation happens here, once, rather than being
 * a rule each caller has to remember.
 */

// Server-only by construction: createClient imports next/headers, which throws if
// this module is ever pulled into a client bundle.
import { createClient } from '@/lib/supabase/server'
import type {
  Bullet,
  Certification,
  Education,
  Experience,
  Profile,
  Project,
  Skill,
  SkillSource,
} from '@/lib/types'

/** Shapes as they come back from Postgres (snake_case). */
interface ProfileRow {
  id: string
  user_id: string
  full_name: string
  headline: string | null
  email: string | null
  phone: string | null
  location: string | null
  links: Record<string, unknown>
  summary: string | null
  version: number
}

export class NotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured for this deployment.')
    this.name = 'NotConfiguredError'
  }
}

async function client() {
  const supabase = await createClient()
  if (!supabase) throw new NotConfiguredError()
  return supabase
}

/**
 * The signed-in user's profile row, creating it if the signup trigger didn't.
 *
 * The trigger normally handles this, but a user who existed before the trigger was
 * installed would otherwise have no profile and hit a null on every page. Healing it
 * here is cheaper than a migration and safe to run repeatedly.
 */
export async function getOrCreateProfileRow(): Promise<ProfileRow> {
  const supabase = await client()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return existing as ProfileRow

  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      user_id: user.id,
      full_name: (user.user_metadata?.full_name as string) ?? '',
      email: user.email,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Could not create your profile: ${error.message}`)
  return created as ProfileRow
}

/** Load the full knowledge base as the domain `Profile` the engine expects. */
export async function getFullProfile(): Promise<Profile> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const [experiences, education, certifications, skills, projects] = await Promise.all([
    supabase.from('experiences').select('*').eq('profile_id', row.id).order('sort_order'),
    supabase.from('education').select('*').eq('profile_id', row.id).order('sort_order'),
    supabase.from('certifications').select('*').eq('profile_id', row.id),
    supabase.from('skills').select('*').eq('profile_id', row.id),
    supabase.from('projects').select('*').eq('profile_id', row.id).order('sort_order'),
  ])

  return {
    id: row.id,
    fullName: row.full_name,
    headline: row.headline ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    location: row.location ?? undefined,
    links: (row.links ?? {}) as Profile['links'],
    summary: row.summary ?? undefined,
    version: row.version,
    experiences: (experiences.data ?? []).map(toExperience),
    education: (education.data ?? []).map(toEducation),
    certifications: (certifications.data ?? []).map(toCertification),
    skills: (skills.data ?? []).map(toSkill),
    projects: (projects.data ?? []).map(toProject),
  }
}

// --- row -> domain -------------------------------------------------------

function toBullets(value: unknown): Bullet[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((b): b is { id?: string; text?: string } => typeof b === 'object' && b !== null)
    .map((b, i) => ({ id: b.id ?? `bul_${i}`, text: b.text ?? '' }))
    .filter((b) => b.text.length > 0)
}

function toExperience(r: Record<string, unknown>): Experience {
  return {
    id: r.id as string,
    company: (r.company as string) ?? '',
    title: (r.title as string) ?? '',
    location: (r.location as string) ?? undefined,
    startDate: (r.start_date as string) ?? '',
    endDate: (r.end_date as string) ?? null,
    isCurrent: Boolean(r.is_current),
    bullets: toBullets(r.bullets),
  }
}

function toEducation(r: Record<string, unknown>): Education {
  return {
    id: r.id as string,
    institution: (r.institution as string) ?? '',
    qualification: (r.qualification as string) ?? '',
    field: (r.field as string) ?? undefined,
    startDate: (r.start_date as string) ?? undefined,
    endDate: (r.end_date as string) ?? undefined,
  }
}

function toCertification(r: Record<string, unknown>): Certification {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    issuer: (r.issuer as string) ?? '',
    issued: (r.issued as string) ?? undefined,
    expires: (r.expires as string) ?? undefined,
    credentialId: (r.credential_id as string) ?? undefined,
  }
}

function toSkill(r: Record<string, unknown>): Skill {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    category: (r.category as string) ?? undefined,
    level: (r.level as Skill['level']) ?? undefined,
    years: r.years == null ? undefined : Number(r.years),
    source: ((r.source as SkillSource) ?? 'self') as SkillSource,
  }
}

function toProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    description: (r.description as string) ?? undefined,
    url: (r.url as string) ?? undefined,
    bullets: toBullets(r.bullets),
  }
}

// --- mutations -----------------------------------------------------------

/**
 * Invalidate every cached match score for this profile.
 *
 * Called after each mutation. A stale score is worse than no score here, because
 * users point automation at these numbers.
 */
async function bumpVersion(profileId: string): Promise<void> {
  const supabase = await client()
  await supabase.rpc('bump_profile_version', { p_profile_id: profileId })
}

export interface NewSkill {
  name: string
  category?: string
  level?: Skill['level']
  years?: number
}

export async function addSkill(input: NewSkill): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase.from('skills').insert({
    profile_id: row.id,
    name: input.name,
    category: input.category ?? null,
    level: input.level ?? null,
    years: input.years ?? null,
    source: 'self',
  })
  if (error) throw new Error(`Could not add that skill: ${error.message}`)
  await bumpVersion(row.id)
}

export interface NewCertification {
  name: string
  issuer: string
  issued?: string
  expires?: string
  credentialId?: string
}

export async function addCertification(input: NewCertification): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase.from('certifications').insert({
    profile_id: row.id,
    name: input.name,
    issuer: input.issuer,
    issued: input.issued ?? null,
    expires: input.expires ?? null,
    credential_id: input.credentialId ?? null,
  })
  if (error) throw new Error(`Could not add that certification: ${error.message}`)
  await bumpVersion(row.id)
}

export interface NewExperience {
  company: string
  title: string
  location?: string
  startDate?: string
  endDate?: string | null
  isCurrent?: boolean
  bullets?: string[]
}

export async function addExperience(input: NewExperience): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase.from('experiences').insert({
    profile_id: row.id,
    company: input.company,
    title: input.title,
    location: input.location ?? null,
    start_date: input.startDate ?? null,
    end_date: input.isCurrent ? null : (input.endDate ?? null),
    is_current: Boolean(input.isCurrent),
    // Bullets carry their own ids so generated CV lines can cite them individually.
    bullets: (input.bullets ?? [])
      .filter((t) => t.trim().length > 0)
      .map((text, i) => ({ id: `${crypto.randomUUID()}_${i}`, text: text.trim() })),
  })
  if (error) throw new Error(`Could not add that role: ${error.message}`)
  await bumpVersion(row.id)
}

export interface NewEducation {
  institution: string
  qualification: string
  field?: string
  startDate?: string
  endDate?: string
}

export async function addEducation(input: NewEducation): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase.from('education').insert({
    profile_id: row.id,
    institution: input.institution,
    qualification: input.qualification,
    field: input.field ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
  })
  if (error) throw new Error(`Could not add that qualification: ${error.message}`)
  await bumpVersion(row.id)
}

/** Delete a row from any profile-owned table. RLS guarantees it's the user's own. */
export async function deleteFrom(
  table: 'skills' | 'certifications' | 'experiences' | 'education' | 'projects',
  id: string,
): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase.from(table).delete().eq('id', id).eq('profile_id', row.id)
  if (error) throw new Error(`Could not remove that entry: ${error.message}`)
  await bumpVersion(row.id)
}

export interface BulkAddInput {
  experiences?: NewExperience[]
  education?: NewEducation[]
  certifications?: NewCertification[]
  skills?: NewSkill[]
}

/**
 * Insert many entries at once — the shape a CV import produces.
 *
 * Distinct from calling the single-row helpers in a loop for two reasons: it bumps
 * the profile version once instead of once per row (a 40-entry CV would otherwise
 * invalidate the match cache 40 times), and skills land with source 'parsed' rather
 * than 'self', which is the honest provenance for something a model read off a
 * document. Returns how many rows of each kind were written.
 */
export async function bulkAdd(input: BulkAddInput): Promise<Record<string, number>> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const experiences = (input.experiences ?? []).map((e, i) => ({
    profile_id: row.id,
    company: e.company,
    title: e.title,
    location: e.location ?? null,
    start_date: e.startDate ?? null,
    end_date: e.isCurrent ? null : (e.endDate ?? null),
    is_current: Boolean(e.isCurrent),
    bullets: (e.bullets ?? [])
      .filter((t) => t.trim().length > 0)
      .map((text, j) => ({ id: `${crypto.randomUUID()}_${j}`, text: text.trim() })),
    // Most recent first, matching the order the parser returns them in.
    sort_order: i,
  }))

  const education = (input.education ?? []).map((e, i) => ({
    profile_id: row.id,
    institution: e.institution,
    qualification: e.qualification,
    field: e.field ?? null,
    start_date: e.startDate ?? null,
    end_date: e.endDate ?? null,
    sort_order: i,
  }))

  const certifications = (input.certifications ?? []).map((c) => ({
    profile_id: row.id,
    name: c.name,
    issuer: c.issuer,
    issued: c.issued ?? null,
    expires: c.expires ?? null,
    credential_id: c.credentialId ?? null,
  }))

  const skills = (input.skills ?? []).map((s) => ({
    profile_id: row.id,
    name: s.name,
    category: s.category ?? null,
    level: s.level ?? null,
    years: s.years ?? null,
    source: 'parsed',
  }))

  const written: Record<string, number> = {}
  const tables: [string, Record<string, unknown>[]][] = [
    ['experiences', experiences],
    ['education', education],
    ['certifications', certifications],
    ['skills', skills],
  ]

  for (const [table, rows] of tables) {
    if (rows.length === 0) continue
    const { error } = await supabase.from(table).insert(rows)
    if (error) throw new Error(`Could not import your ${table}: ${error.message}`)
    written[table] = rows.length
  }

  await bumpVersion(row.id)
  return written
}

export interface ProfileBasics {
  fullName: string
  headline?: string
  location?: string
  phone?: string
  summary?: string
}

export async function updateBasics(input: ProfileBasics): Promise<void> {
  const supabase = await client()
  const row = await getOrCreateProfileRow()

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      headline: input.headline ?? null,
      location: input.location ?? null,
      phone: input.phone ?? null,
      summary: input.summary ?? null,
    })
    .eq('id', row.id)

  if (error) throw new Error(`Could not save your details: ${error.message}`)
  await bumpVersion(row.id)
}
