import Link from 'next/link'
import { CompassMark } from '@/components/compass'

export const metadata = { title: 'Privacy — SkillNorth' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
        <CompassMark size={26} />
        <span className="font-[family-name:var(--font-display)] text-[16px] font-bold">
          SkillNorth
        </span>
      </Link>

      <div className="glass rounded-3xl px-8 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-[26px] font-semibold">
          Privacy
        </h1>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.1em] text-[#f5a623] uppercase">
          Draft — not yet a final policy
        </p>

        <div className="mt-6 flex flex-col gap-4 text-[14px] leading-[1.75] text-[#c3cbdc]">
          <p>
            SkillNorth is in active development and this page is a plain-English summary of how the
            product handles your data, not a finished legal policy. It will be replaced by a full
            policy before general availability.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            What we store
          </h2>
          <p>
            The career history you give us (uploaded CV, skills, roles, education), the job postings
            you add, the match scores and documents generated from them, and your account email.
            Your data is stored in Supabase with row-level security, so your rows are only readable
            by your own authenticated session.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            What we send to third parties
          </h2>
          <p>
            To generate a tailored CV or score a match, relevant parts of your profile and the job
            posting are sent to Anthropic&rsquo;s API. Signing in with Google or LinkedIn shares only
            your name, email address, and profile picture with us — we do not read your LinkedIn
            connections, posts, or full profile.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            Deletion
          </h2>
          <p>
            Deleting your account removes your profile, jobs, matches, and generated documents.
            Until the in-app control ships, email us and we&rsquo;ll action it.
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-[13px] text-[#4fd1c5] hover:underline"
        >
          ← Back to SkillNorth
        </Link>
      </div>
    </main>
  )
}
