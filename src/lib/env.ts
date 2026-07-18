/**
 * Typed access to environment, and one honest question: is this a real deployment
 * or a demo?
 *
 * `demoMode` is true whenever the LLM key is absent. The app leans on it to run
 * end to end with no credentials — the match engine is live, only the model-backed
 * steps stand down.
 */

export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const

export function isDemoMode(): boolean {
  return !env.anthropicKey
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}
