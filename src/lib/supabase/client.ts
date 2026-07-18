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

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createBrowserClient(url, anonKey)
}
