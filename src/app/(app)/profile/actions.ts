'use server'

/**
 * Profile mutations.
 *
 * Each returns a typed result rather than throwing: a validation failure ("name is
 * required") is an expected outcome to render, not an exception. `revalidatePath`
 * refreshes the page so the new entry appears without a client-side store.
 */

import { revalidatePath } from 'next/cache'
import {
  addCertification,
  addEducation,
  addExperience,
  addSkill,
  deleteFrom,
  updateBasics,
} from '@/lib/db/profile'

export interface ActionResult {
  error?: string
  ok?: boolean
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

function refresh() {
  revalidatePath('/profile')
  // Scores are derived from the profile, so those views are stale now too.
  revalidatePath('/dashboard')
  revalidatePath('/matches')
}

async function run(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn()
    refresh()
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Something went wrong.' }
  }
}

export async function addSkillAction(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const name = str(fd, 'name')
  if (!name) return { error: 'Enter a skill name.' }

  const yearsRaw = str(fd, 'years')
  const years = yearsRaw ? Number(yearsRaw) : undefined
  if (years !== undefined && (Number.isNaN(years) || years < 0 || years > 60)) {
    return { error: 'Years should be a number between 0 and 60.' }
  }

  return run(() =>
    addSkill({
      name,
      category: str(fd, 'category') || undefined,
      level: (str(fd, 'level') || undefined) as never,
      years,
    }),
  )
}

export async function addCertificationAction(
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const name = str(fd, 'name')
  const issuer = str(fd, 'issuer')
  if (!name) return { error: 'Enter the certification name.' }
  if (!issuer) return { error: 'Enter who issued it.' }

  return run(() =>
    addCertification({
      name,
      issuer,
      issued: str(fd, 'issued') || undefined,
      expires: str(fd, 'expires') || undefined,
      credentialId: str(fd, 'credentialId') || undefined,
    }),
  )
}

export async function addExperienceAction(
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const company = str(fd, 'company')
  const title = str(fd, 'title')
  if (!company) return { error: 'Enter the company name.' }
  if (!title) return { error: 'Enter your job title.' }

  // One achievement per line. These become the citable sources for generated CV
  // bullets, so they're the most valuable thing on the whole profile.
  const bullets = str(fd, 'bullets')
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)

  return run(() =>
    addExperience({
      company,
      title,
      location: str(fd, 'location') || undefined,
      startDate: str(fd, 'startDate') || undefined,
      endDate: str(fd, 'endDate') || undefined,
      isCurrent: fd.get('isCurrent') === 'on',
      bullets,
    }),
  )
}

export async function addEducationAction(
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const institution = str(fd, 'institution')
  const qualification = str(fd, 'qualification')
  if (!institution) return { error: 'Enter the institution.' }
  if (!qualification) return { error: 'Enter the qualification.' }

  return run(() =>
    addEducation({
      institution,
      qualification,
      field: str(fd, 'field') || undefined,
      startDate: str(fd, 'startDate') || undefined,
      endDate: str(fd, 'endDate') || undefined,
    }),
  )
}

export async function updateBasicsAction(
  _prev: ActionResult,
  fd: FormData,
): Promise<ActionResult> {
  const fullName = str(fd, 'fullName')
  if (!fullName) return { error: 'Enter your name.' }

  return run(() =>
    updateBasics({
      fullName,
      headline: str(fd, 'headline') || undefined,
      location: str(fd, 'location') || undefined,
      phone: str(fd, 'phone') || undefined,
      summary: str(fd, 'summary') || undefined,
    }),
  )
}

export async function deleteEntryAction(fd: FormData): Promise<void> {
  const table = str(fd, 'table') as Parameters<typeof deleteFrom>[0]
  const id = str(fd, 'id')
  const allowed = ['skills', 'certifications', 'experiences', 'education', 'projects']
  if (!id || !allowed.includes(table)) return

  await deleteFrom(table, id)
  refresh()
}
