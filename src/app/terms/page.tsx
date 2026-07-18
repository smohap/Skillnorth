import Link from 'next/link'
import { CompassMark } from '@/components/compass'

export const metadata = { title: 'Terms — SkillNorth' }

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-6 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2.5">
        <CompassMark size={26} />
        <span className="font-[family-name:var(--font-display)] text-[16px] font-bold">
          SkillNorth
        </span>
      </Link>

      <div className="glass rounded-3xl px-8 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-[26px] font-semibold">Terms</h1>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.1em] text-[#f5a623] uppercase">
          Draft — not yet final terms
        </p>

        <div className="mt-6 flex flex-col gap-4 text-[14px] leading-[1.75] text-[#c3cbdc]">
          <p>
            SkillNorth is in active development. This page sets out the important expectations while
            full terms are being prepared.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            What the product does and does not claim
          </h2>
          <p>
            SkillNorth rewrites and reorders career history you provide. It does not invent
            experience, dates, titles, or credentials — but you remain responsible for reviewing any
            document before you send it to an employer.
          </p>
          <p>
            The Readiness Score is SkillNorth&rsquo;s own heuristic for how cleanly a CV parses and
            how well it covers a posting. It is not a score produced by Workday, Greenhouse, iCIMS,
            or any other applicant tracking system, and it is not a prediction that you will be
            shortlisted.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            Applications are sent by you
          </h2>
          <p>
            SkillNorth prepares applications; you submit them. We do not automate submission to job
            boards whose terms prohibit it. You are responsible for complying with the terms of any
            job board or employer you apply through.
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-[16px] font-semibold text-[#f3f6fb]">
            No guarantee of outcome
          </h2>
          <p>
            Nothing in the product is a guarantee of an interview, an offer, or employment.
          </p>
        </div>

        <Link href="/" className="mt-8 inline-block text-[13px] text-[#4fd1c5] hover:underline">
          ← Back to SkillNorth
        </Link>
      </div>
    </main>
  )
}
