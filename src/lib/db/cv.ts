/**
 * The CV upload repository — storage, upload rows, and committing an import.
 *
 * The upload row is the record of a *proposal*; the profile tables are the record
 * of fact. Everything here keeps that line clear: parsing writes only to
 * cv_uploads.parsed, and nothing reaches the profile until `commitImport` runs
 * with the keys the user actually ticked.
 */

import { createClient } from '@/lib/supabase/server'
import { BUCKET } from '@/lib/supabase/constants'
import {
  bulkAdd,
  getFullProfile,
  getOrCreateProfileRow,
  NotConfiguredError,
} from '@/lib/db/profile'
import {
  dropDuplicates,
  selectEntries,
  summarise,
  summaryTotal,
  type ImportSummary,
} from '@/lib/cv/import'
import { emptyParsedCv, type ParsedCv } from '@/lib/cv/parse'

async function client() {
  const supabase = await createClient()
  if (!supabase) throw new NotConfiguredError()
  return supabase
}

export type UploadStatus = 'parsing' | 'parsed' | 'imported' | 'failed'

export interface CvUpload {
  id: string
  filename: string
  status: UploadStatus
  parsed: ParsedCv
  error?: string
  createdAt: string
}

function toUpload(r: Record<string, unknown>): CvUpload {
  const parsed = r.parsed as ParsedCv | null
  return {
    id: r.id as string,
    filename: (r.filename as string) ?? '',
    status: (r.status as UploadStatus) ?? 'parsing',
    // A row mid-parse has `{}`, which isn't a usable ParsedCv — normalise it here
    // so every caller can read `.experiences` without a guard.
    parsed: parsed && Array.isArray(parsed.experiences) ? parsed : emptyParsedCv(),
    error: (r.error as string) ?? undefined,
    createdAt: (r.created_at as string) ?? '',
  }
}

/** Store the raw file and open an upload row for it. Returns the new row's id. */
export async function createUpload(file: {
  filename: string
  mimeType: string
  bytes: ArrayBuffer
}): Promise<string> {
  const supabase = await client()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in.')

  const profile = await getOrCreateProfileRow()

  // The leading `<user-id>/` segment is what the storage RLS policy checks; the
  // uuid keeps two uploads of "cv.pdf" from overwriting each other.
  const safeName = file.filename.replace(/[^\w.\-]+/g, '_').slice(-80)
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET.cvUploads)
    .upload(storagePath, file.bytes, { contentType: file.mimeType, upsert: false })
  if (uploadError) throw new Error(`Could not store that file: ${uploadError.message}`)

  const { data, error } = await supabase
    .from('cv_uploads')
    .insert({
      user_id: user.id,
      profile_id: profile.id,
      filename: file.filename,
      mime_type: file.mimeType,
      byte_size: file.bytes.byteLength,
      storage_path: storagePath,
      status: 'parsing',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Could not record that upload: ${error.message}`)
  return data.id as string
}

export async function markParsed(uploadId: string, parsed: ParsedCv): Promise<void> {
  const supabase = await client()
  const { error } = await supabase
    .from('cv_uploads')
    .update({ status: 'parsed', parsed, error: null })
    .eq('id', uploadId)
  if (error) throw new Error(`Could not save the parsed CV: ${error.message}`)
}

export async function markFailed(uploadId: string, message: string): Promise<void> {
  const supabase = await client()
  // Best-effort: this runs on an error path, and throwing here would replace a
  // useful message to the user with a database one.
  await supabase
    .from('cv_uploads')
    .update({ status: 'failed', error: message })
    .eq('id', uploadId)
}

export async function getUpload(uploadId: string): Promise<CvUpload | null> {
  const supabase = await client()
  const { data } = await supabase.from('cv_uploads').select('*').eq('id', uploadId).maybeSingle()
  return data ? toUpload(data) : null
}

/** The most recent upload, used to resume an unfinished review. */
export async function getLatestUpload(): Promise<CvUpload | null> {
  const supabase = await client()
  const { data } = await supabase
    .from('cv_uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? toUpload(data) : null
}

export interface CommitResult {
  imported: ImportSummary
  /** Entries skipped because the profile already had them. */
  skippedDuplicates: number
}

/**
 * Write the ticked entries onto the profile.
 *
 * The parsed payload is re-read from the database rather than taken from the
 * client — the request supplies only *which* entries to import, never their
 * contents, so a forged POST can't inject profile rows that were never in the CV.
 */
export async function commitImport(
  uploadId: string,
  keys: readonly string[],
): Promise<CommitResult> {
  const supabase = await client()

  const upload = await getUpload(uploadId)
  if (!upload) throw new Error('That upload no longer exists.')
  if (upload.status === 'imported') throw new Error('That CV has already been imported.')

  const chosen = selectEntries(upload.parsed, keys)
  const profile = await getFullProfile()
  const fresh = dropDuplicates(chosen, profile)

  await bulkAdd({
    experiences: fresh.experiences.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      bullets: e.bullets,
    })),
    education: fresh.education,
    certifications: fresh.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer || 'Unknown',
      issued: c.issued,
      expires: c.expires,
      credentialId: c.credentialId,
    })),
    skills: fresh.skills,
  })

  await supabase
    .from('cv_uploads')
    .update({ status: 'imported', imported_at: new Date().toISOString() })
    .eq('id', uploadId)

  const imported = summarise(fresh)
  return {
    imported,
    skippedDuplicates: summaryTotal(summarise(chosen)) - summaryTotal(imported),
  }
}
