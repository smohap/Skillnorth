'use server'

/**
 * Committing a reviewed CV import.
 *
 * The form posts only the *keys* of the entries the user ticked. The entries
 * themselves are re-read server-side from the upload row, so this action cannot be
 * used to write arbitrary rows onto a profile — see commitImport.
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { commitImport } from '@/lib/db/cv'

export interface ImportActionResult {
  error?: string
}

export async function confirmImportAction(
  _prev: ImportActionResult,
  fd: FormData,
): Promise<ImportActionResult> {
  const uploadId = String(fd.get('uploadId') ?? '').trim()
  if (!uploadId) return { error: 'That upload is no longer available. Upload your CV again.' }

  const keys = fd.getAll('keys').map(String).filter(Boolean)
  if (keys.length === 0) {
    return { error: 'Tick at least one entry to import, or skip this step.' }
  }

  try {
    await commitImport(uploadId, keys)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not import those entries.' }
  }

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  revalidatePath('/matches')
  // Redirect throws, so it must come after everything that needs to run.
  redirect('/profile?imported=1')
}
