'use server'

/**
 * Email/password sign-in and sign-up as Server Actions.
 *
 * These return a typed result the form renders inline, rather than throwing —
 * an auth error ("wrong password") is an expected outcome to show the user, not a
 * crash. OAuth (Google, LinkedIn) is handled client-side instead, because it needs
 * a browser redirect the server can't perform.
 */

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface AuthResult {
  error?: string
  // Set after sign-up when the project requires email confirmation.
  notice?: string
}

function readCredentials(formData: FormData): { email: string; password: string } | { error: string } {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Enter your email and password.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  return { email, password }
}

export async function signInWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const creds = readCredentials(formData)
  if ('error' in creds) return { error: creds.error }

  const supabase = await createClient()
  if (!supabase) return { error: 'Sign-in isn’t configured yet. Add your Supabase keys to enable it.' }

  const { error } = await supabase.auth.signInWithPassword(creds)
  if (error) return { error: error.message }

  redirect('/dashboard')
}

export async function signUpWithPassword(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const creds = readCredentials(formData)
  if ('error' in creds) return { error: creds.error }

  const supabase = await createClient()
  if (!supabase) return { error: 'Sign-up isn’t configured yet. Add your Supabase keys to enable it.' }

  const origin = (await headers()).get('origin') ?? ''
  const { data, error } = await supabase.auth.signUp({
    ...creds,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message }

  // When email confirmation is on, there's no session yet — tell the user to check
  // their inbox rather than silently doing nothing.
  if (!data.session) {
    return { notice: 'Check your email to confirm your account, then sign in.' }
  }

  redirect('/dashboard')
}
