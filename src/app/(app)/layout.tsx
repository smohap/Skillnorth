import { redirect } from 'next/navigation'
import { RailNav } from '@/components/rail-nav'
import { AppFooter } from '@/components/footer'
import { getSessionUser, isAuthConfigured } from '@/lib/auth'

/**
 * The signed-in shell.
 *
 * Where auth is configured, these pages require a session — this is the real gate,
 * not the proxy, which only refreshes tokens. Where it isn't configured (local dev
 * with no keys) the pages stay open on demo data so the app is still runnable
 * without credentials.
 */

/**
 * The gate must run per request, not at build time. Without this, a build where
 * Supabase happens to be unconfigured would prerender these pages as static and
 * ship them without ever checking for a session.
 */
export const dynamic = 'force-dynamic'
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authConfigured = isAuthConfigured()
  const user = authConfigured ? await getSessionUser() : null

  if (authConfigured && !user) redirect('/signin')

  return (
    <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-5">
      <div className="glass grid min-h-[86vh] overflow-hidden rounded-3xl md:grid-cols-[232px_1fr]">
        <RailNav user={user} />
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-1 flex-col">{children}</div>
          <AppFooter />
        </div>
      </div>
    </div>
  )
}
