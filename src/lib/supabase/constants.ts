/**
 * Supabase naming, in one place.
 *
 * This project's database is shared with another app, so everything SkillNorth owns
 * is namespaced: tables live in the `skillnorth` schema and storage buckets carry a
 * `skillnorth-` prefix. Keeping these as constants means the namespace is chosen
 * once, not re-typed (and mistyped) at every call site.
 */

export const DB_SCHEMA = 'skillnorth' as const

export const BUCKET = {
  cvUploads: 'skillnorth-cv-uploads',
  generatedDocs: 'skillnorth-generated-docs',
} as const
