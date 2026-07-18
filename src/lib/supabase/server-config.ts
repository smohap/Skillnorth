/**
 * Server-side Supabase credential resolution.
 *
 * Deliberately its own module, importing nothing from `next/headers`, so it can be
 * used from both Server Components and `proxy.ts` — the proxy runs before the
 * request context exists and can't import the cookies API.
 *
 * On the server we can read the Vercel integration's non-public variables too, so a
 * project wired through the integration works even when only the prefixed names
 * exist and nothing was exposed to the browser.
 */

import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from './config'

export function serverSupabaseCredentials(): { url?: string; key?: string } {
  const url = PUBLIC_SUPABASE_URL ?? process.env.skillnorth_SUPABASE_URL

  const key =
    PUBLIC_SUPABASE_KEY ??
    process.env.skillnorth_SUPABASE_ANON_KEY ??
    process.env.skillnorth_SUPABASE_PUBLISHABLE_KEY

  return { url, key }
}
