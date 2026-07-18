/**
 * Configuration health check.
 *
 * Visit /api/health on any deployment to see which env vars the running build
 * actually has. It reports presence only — booleans, never the values — so it's
 * safe to hit on a live URL while debugging a "not configured" message.
 *
 * The usual culprit: NEXT_PUBLIC_* vars are inlined at BUILD time, so adding them
 * in Vercel without redeploying leaves the shipped bundle with empty values.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const present = (v: string | undefined) => Boolean(v && v.length > 0)

  return NextResponse.json({
    // These two are what the browser sign-in needs. If either is false, that's the
    // cause of "Sign-in isn't configured yet".
    supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    // Server-only; not required for sign-in, but handy to confirm.
    supabaseServiceKey: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropicKey: present(process.env.ANTHROPIC_API_KEY),
    note: 'Values are never exposed — presence only. NEXT_PUBLIC_* vars are baked in at build time, so redeploy after adding them.',
  })
}
