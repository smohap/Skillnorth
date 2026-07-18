/**
 * Session refresh — runs before every matched request.
 *
 * In Next.js 16 the `middleware` convention was renamed to `proxy` (Node runtime,
 * not configurable). Its job here is narrow: refresh the Supabase auth token so a
 * signed-in user's session doesn't expire out from under them mid-visit, and write
 * the rotated cookies onto the response.
 *
 * It is deliberately not an authorization gate. Per Supabase and Next guidance,
 * proxy does an optimistic session refresh only; the real access checks live in the
 * server components and route handlers that actually read data.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { serverSupabaseCredentials } from '@/lib/supabase/server-config'

export async function proxy(request: NextRequest) {
  const { url, key: anonKey } = serverSupabaseCredentials()

  // No Supabase configured (demo mode): pass through untouched.
  if (!url || !anonKey) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // Touching getUser() is what triggers the token refresh. Do not remove.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Skip static assets and image optimisation; run on everything else.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
