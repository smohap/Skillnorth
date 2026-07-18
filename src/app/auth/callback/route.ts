/**
 * OAuth / magic-link callback.
 *
 * Google and LinkedIn send the user back here with a `code`, which we exchange for
 * a session. On success we send them to the dashboard (or wherever `next` points);
 * on failure, back to sign-in with a reason rather than a blank error.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // An OAuth provider can also bounce back with an explicit error.
  const providerError = searchParams.get('error_description') ?? searchParams.get('error')
  if (providerError) {
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(providerError)}`)
  }

  if (code) {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent('Auth is not configured yet.')}`)
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent('No sign-in code was returned.')}`)
}
