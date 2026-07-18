/**
 * Who is signed in, on the server.
 *
 * Always `getUser()`, never `getSession()`. getSession reads the cookie and trusts
 * it; getUser revalidates against the Supabase auth server. On a server component
 * that difference is the whole security boundary, because a cookie is attacker-
 * supplied data.
 */

import { createClient } from '@/lib/supabase/server'
import { serverSupabaseCredentials } from '@/lib/supabase/server-config'

export interface SessionUser {
  id: string
  email: string | null
  /** Best available display name from the OAuth provider's metadata. */
  name: string
  avatarUrl: string | null
}

/** True when the deployment has Supabase wired up at all. */
export function isAuthConfigured(): boolean {
  const { url, key } = serverSupabaseCredentials()
  return Boolean(url && key)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  if (!supabase) return null

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const meta = user.user_metadata ?? {}
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    user.email?.split('@')[0] ||
    'Your profile'

  return {
    id: user.id,
    email: user.email ?? null,
    name,
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || null,
  }
}
