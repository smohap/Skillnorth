'use client'

import { Suspense, useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signInWithPassword, signUpWithPassword, type AuthResult } from './actions'

type Mode = 'signin' | 'signup'
type OAuthProvider = 'google' | 'linkedin_oidc'

const EMPTY: AuthResult = {}

export default function SignInPage() {
  // useSearchParams must sit inside a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<div className="glass h-[520px] w-full max-w-[400px] rounded-3xl" />}>
      <SignInForm />
    </Suspense>
  )
}

function SignInForm() {
  const params = useSearchParams()
  const callbackError = params.get('error')

  const [mode, setMode] = useState<Mode>('signin')
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)

  const action = mode === 'signin' ? signInWithPassword : signUpWithPassword
  const [state, formAction, pending] = useActionState(action, EMPTY)

  async function signInWithOAuth(provider: OAuthProvider) {
    setOauthError(null)
    const supabase = createClient()
    if (!supabase) {
      setOauthError(
        'Sign-in isn’t reachable from the browser. NEXT_PUBLIC_SUPABASE_URL and a NEXT_PUBLIC_ Supabase key must be set at build time — check /api/health, then redeploy.',
      )
      return
    }
    setOauthPending(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setOauthError(error.message)
      setOauthPending(null)
    }
    // On success the browser is redirected to the provider — nothing more to do.
  }

  const shownError = oauthError ?? state.error ?? callbackError

  return (
    <div className="glass w-full max-w-[400px] rounded-3xl p-7 sm:p-8">
      <h1 className="font-[family-name:var(--font-display)] text-[22px] font-semibold">
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </h1>
      <p className="mt-1.5 text-[13px] text-[#7c88a3]">
        {mode === 'signin'
          ? 'Sign in to pick up your job search where you left off.'
          : 'One profile, then every job posting becomes a tailored application.'}
      </p>

      {/* OAuth */}
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => signInWithOAuth('google')}
          disabled={oauthPending !== null}
          className="flex min-h-11 items-center justify-center gap-2.5 rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-[13.5px] font-semibold transition hover:bg-[rgba(255,255,255,0.09)] disabled:opacity-50"
        >
          <GoogleGlyph />
          {oauthPending === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <button
          type="button"
          onClick={() => signInWithOAuth('linkedin_oidc')}
          disabled={oauthPending !== null}
          className="flex min-h-11 items-center justify-center gap-2.5 rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-[13.5px] font-semibold transition hover:bg-[rgba(255,255,255,0.09)] disabled:opacity-50"
        >
          <LinkedInGlyph />
          {oauthPending === 'linkedin_oidc' ? 'Redirecting…' : 'Continue with LinkedIn'}
        </button>
      </div>

      <div className="my-5 flex items-center gap-3 text-[11px] text-[#7c88a3]">
        <span className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
        or with email
        <span className="h-px flex-1 bg-[rgba(255,255,255,0.1)]" />
      </div>

      {/* Email + password */}
      <form action={formAction} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#c3cbdc]">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="min-h-11 rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(0,0,0,0.25)] px-3.5 text-[14px] text-[#f3f6fb] placeholder:text-[#5a647d] focus:border-[#4fd1c5]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[#c3cbdc]">Password</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            className="min-h-11 rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(0,0,0,0.25)] px-3.5 text-[14px] text-[#f3f6fb] placeholder:text-[#5a647d] focus:border-[#4fd1c5]"
          />
        </label>

        {shownError && (
          <p
            role="alert"
            className="rounded-[10px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.12)] px-3 py-2.5 text-[12.5px] text-[#ff9b9b]"
          >
            {shownError}
          </p>
        )}
        {state.notice && (
          <p
            role="status"
            className="rounded-[10px] border border-[rgba(79,209,197,0.3)] bg-[rgba(79,209,197,0.12)] px-3 py-2.5 text-[12.5px] text-[#4fd1c5]"
          >
            {state.notice}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 min-h-11 rounded-[10px] bg-[#4fd1c5] text-[13.5px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {pending
            ? mode === 'signin'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'signin'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-[12.5px] text-[#7c88a3]">
        {mode === 'signin' ? 'New to SkillNorth?' : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-semibold text-[#4fd1c5] hover:underline"
        >
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  )
}

function LinkedInGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="#0A66C2">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z" />
    </svg>
  )
}
