/**
 * Resolving Supabase credentials across two naming schemes.
 *
 * The Vercel Supabase integration prefixes every variable with the integration
 * name (here `skillnorth_`), so a project wired up through it has
 * `NEXT_PUBLIC_skillnorth_SUPABASE_PUBLISHABLE_KEY` rather than the canonical
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Rather than force one convention, we accept both.
 *
 * Every candidate below is referenced STATICALLY and by full name. That is not a
 * style choice: Next.js inlines `process.env.NEXT_PUBLIC_*` into the browser bundle
 * at build time by literal text substitution, so a dynamic lookup like
 * `process.env[name]` would silently resolve to undefined in the browser.
 *
 * Only NEXT_PUBLIC_* names appear here, because this module is imported by client
 * components. Server-only names are resolved in server.ts, where they're safe.
 */

/** The project URL, as visible to the browser. */
export const PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_skillnorth_SUPABASE_URL

/**
 * The browser-safe key. Supabase's newer `sb_publishable_…` keys and the legacy
 * `anon` JWT are interchangeable here — supabase-js accepts either.
 */
export const PUBLIC_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_skillnorth_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_skillnorth_SUPABASE_ANON_KEY

/**
 * Which variable names the running build actually found. Names only, never values —
 * this is what /api/health reports so a misconfiguration is one request to diagnose.
 */
export function resolvedPublicVarNames(): { url: string | null; key: string | null } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? 'NEXT_PUBLIC_SUPABASE_URL'
      : process.env.NEXT_PUBLIC_skillnorth_SUPABASE_URL
        ? 'NEXT_PUBLIC_skillnorth_SUPABASE_URL'
        : null,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      : process.env.NEXT_PUBLIC_skillnorth_SUPABASE_PUBLISHABLE_KEY
        ? 'NEXT_PUBLIC_skillnorth_SUPABASE_PUBLISHABLE_KEY'
        : process.env.NEXT_PUBLIC_skillnorth_SUPABASE_ANON_KEY
          ? 'NEXT_PUBLIC_skillnorth_SUPABASE_ANON_KEY'
          : null,
  }
}
