/**
 * Server-side Supabase client.
 *
 * In Next.js 16 `cookies()` is async — synchronous access was removed — so this is
 * an async factory. Returns null when Supabase isn't configured, matching the
 * browser client, so server code can branch on "not set up" without a try/catch
 * around a missing env var.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { DB_SCHEMA } from './constants'
import { serverSupabaseCredentials } from './server-config'

export async function createClient() {
  const { url, key: anonKey } = serverSupabaseCredentials()
  if (!url || !anonKey) return null

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    // Tables live in the `skillnorth` schema (shared project). Auth is unaffected.
    db: { schema: DB_SCHEMA },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // `setAll` is called from a Server Component, where cookies are
          // read-only. The session refresh in proxy.ts handles writing instead,
          // so this is safe to ignore.
        }
      },
    },
  })
}
