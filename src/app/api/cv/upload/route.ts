/**
 * CV upload endpoint.
 *
 * A Route Handler rather than a Server Action on purpose: action request bodies are
 * capped at 1MB by default, and a perfectly ordinary CV with a logo in it clears
 * that. Raising the action limit globally would loosen the cap for every action in
 * the app; keeping uploads on their own route bounds the exposure to this file.
 *
 * The whole pipeline runs in one request — store, extract, parse — so the client
 * gets back an upload id that is ready to review. That makes this a slow endpoint by
 * design, hence the raised maxDuration.
 */

import { NextResponse } from 'next/server'
import { createUpload, markFailed, markParsed } from '@/lib/db/cv'
import { CvExtractError, extractCvText, MAX_UPLOAD_BYTES } from '@/lib/cv/extract'
import { isEmptyParse, parseCv } from '@/lib/cv/parse'
import { isLlmConfigured, LlmParseError } from '@/lib/llm/client'
import { createClient } from '@/lib/supabase/server'

// mammoth and unpdf are Node libraries; neither runs on the edge runtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Extraction plus a long-context model call. 60s is the Vercel hobby ceiling. */
export const maxDuration = 60

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  if (!supabase) return fail('Supabase isn’t configured for this deployment.', 503)

  // Render-time gating isn't a security boundary — anyone can POST here directly.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail('Sign in to upload a CV.', 401)

  if (!isLlmConfigured()) {
    return fail('CV parsing needs ANTHROPIC_API_KEY. Add it and redeploy.', 503)
  }

  let file: File | null
  try {
    const form = await request.formData()
    const value = form.get('file')
    file = value instanceof File ? value : null
  } catch {
    return fail('That upload didn’t arrive intact. Try again.', 400)
  }

  if (!file) return fail('Choose a file to upload.', 400)
  if (file.size === 0) return fail('That file is empty.', 400)
  if (file.size > MAX_UPLOAD_BYTES) return fail('That file is larger than 10MB.', 413)

  const bytes = await file.arrayBuffer()

  // Extract BEFORE storing, so an unreadable file doesn't leave an orphan row and
  // a wasted object in the bucket. The user gets the error and nothing persists.
  let text: string
  try {
    text = await extractCvText({
      filename: file.name,
      mimeType: file.type,
      bytes,
    })
  } catch (err) {
    if (err instanceof CvExtractError) {
      return fail(err.message, err.kind === 'too_large' ? 413 : 400)
    }
    return fail('We couldn’t read that file.', 400)
  }

  const uploadId = await createUpload({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    bytes,
  })

  try {
    const parsed = await parseCv(text)
    if (isEmptyParse(parsed)) {
      await markFailed(uploadId, 'No career history found in that document.')
      return fail(
        'We read that file but couldn’t find any roles, qualifications, or skills in it. Is it definitely a CV?',
        422,
      )
    }
    await markParsed(uploadId, parsed)
    return NextResponse.json({ uploadId })
  } catch (err) {
    const message =
      err instanceof LlmParseError
        ? 'The parser couldn’t make sense of that CV. Try a simpler layout — single column, no text boxes.'
        : 'Something went wrong reading that CV.'
    await markFailed(uploadId, message)
    // Log the real cause; the user gets the sentence above.
    console.error('[cv/upload] parse failed', err)
    return fail(message, 502)
  }
}
