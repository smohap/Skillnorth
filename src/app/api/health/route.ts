/**
 * Configuration health check.
 *
 * Visit /api/health on any deployment to see which env vars the running build
 * actually found. It reports presence and variable NAMES only — never values — so
 * it's safe to hit on a live URL while debugging a "not configured" message.
 *
 * Two things this is designed to catch:
 *  - NEXT_PUBLIC_* vars are inlined at BUILD time, so adding them in Vercel without
 *    redeploying leaves the shipped bundle with empty values.
 *  - The Vercel Supabase integration prefixes names (NEXT_PUBLIC_<prefix>_...), so
 *    the canonical names may be absent even though Supabase is connected.
 */

import { NextResponse } from 'next/server'
import { resolvedPublicVarNames } from '@/lib/supabase/config'
import { serverSupabaseCredentials } from '@/lib/supabase/server-config'

export const dynamic = 'force-dynamic'

export function GET() {
  const present = (v: string | undefined) => Boolean(v && v.length > 0)
  const browser = resolvedPublicVarNames()
  const server = serverSupabaseCredentials()

  const browserReady = Boolean(browser.url && browser.key)

  return NextResponse.json({
    // What the BROWSER can see. Google/LinkedIn sign-in needs both of these,
    // because the OAuth redirect is initiated client-side.
    browserAuthReady: browserReady,
    browserUrlFrom: browser.url,
    browserKeyFrom: browser.key,

    // What the SERVER can see — it may succeed where the browser fails, since
    // non-public variables are readable here.
    serverAuthReady: Boolean(server.url && server.key),

    anthropicKey: present(process.env.ANTHROPIC_API_KEY),

    hint: browserReady
      ? 'Browser auth is configured.'
      : 'Add NEXT_PUBLIC_SUPABASE_URL (and a NEXT_PUBLIC_ key) in Vercel, then REDEPLOY — NEXT_PUBLIC_ vars are baked in at build time.',
  })
}
