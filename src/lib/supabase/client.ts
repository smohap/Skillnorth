'use client'

/**
 * Browser-side Supabase client.
 *
 * The URL and anon key are public by design — Row Level Security is what protects
 * the data, not secrecy of the anon key. Returns null when Supabase isn't
 * configured, so the sign-in UI can show an honest "not set up yet" state instead
 * of throwing on a missing env var.
 */

import { createBrowserClient } from '@supabase/ssr'
import { DB_SCHEMA } from './constants'
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from './config'

export function createClient() {
  const url = PUBLIC_SUPABASE_URL
  const anonKey = PUBLIC_SUPABASE_KEY
  if (!url || !anonKey) return null
  // Our tables live in the `skillnorth` schema, not `public`, because this project
  // is shared with another app. Auth still works the same; only data queries change.
  return createBrowserClient(url, anonKey, { db: { schema: DB_SCHEMA } })
}
