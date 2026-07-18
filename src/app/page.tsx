import Link from 'next/link'
import { CompassMark, CompassScore } from '@/components/compass'
import { Journey3D } from '@/components/journey-3d'

/**
 * Landing page.
 *
 * The limits are stated on the page rather than buried in terms. An agent that
 * prepares job applications for you only works if you trust it, and trust starts
 * with not overclaiming in the hero.
 */

const BANDS = [
  {
    range: '90+',
    color: '#4fd1c5',
    title: 'Prepared and ready',
    body: 'CV and cover letter written, checked, and queued. One click sends it.',
  },
  {
    range: '80–89',
    color: '#ffd166',
    title: 'Waiting on you',
    body: 'Worth a look, worth your judgement. Nothing is prepared until you say so.',
  },
  {
    range: '60–79',
    color: '#f5a623',
    title: 'Close the gaps first',
    body: "You'd be filtered out today. Here's exactly what would change that.",
  },
  {
    range: 'Below 60',
    color: '#ff6b6b',
    title: 'Out of the queue',
    body: 'Not worth your evening. Filtered before you ever see it.',
  },
]

const LIMITS = [
  {
    title: 'It won’t invent your experience',
    body: 'Every line traces back to something you actually told us, and every number has to appear in the source it came from. Anything that can’t be traced is removed before you see it — not flagged, removed.',
  },
  {
    title: 'It won’t fake an ATS score',
    body: 'Workday and Greenhouse don’t publish a score, so nobody can simulate one honestly. We measure what’s real: whether your CV parses cleanly and covers the posting. We call it our score, because it is.',
  },
  {
    title: 'It won’t apply behind your back',
    body: 'Automated submission breaks the terms of every major job board, and it’s your account they ban, not ours. SkillNorth does all the work and hands you a finished application. The last click is yours.',
  },
]

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
      <header className="glass mb-6 flex items-center justify-between rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <CompassMark size={26} />
          <span className="font-[family-name:var(--font-display)] text-[15px] font-bold">
            SkillNorth
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/signin"
            className="rounded-[10px] border border-[rgba(255,255,255,0.14)] px-4 py-2.5 text-[13px] font-semibold text-[#c3cbdc] transition hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f3f6fb]"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-[10px] bg-[#4fd1c5] px-4 py-2.5 text-[13px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98]"
          >
            See the demo
          </Link>
        </div>
      </header>

      {/* The journey, in 3D — the signature moment */}
      <section className="glass mb-5 overflow-hidden rounded-3xl px-6 py-12 sm:px-12">
        <div className="mx-auto mb-8 max-w-[54ch] text-center">
          <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-[#8b7fff] uppercase">
            One continuous loop
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.01em]">
            From a skill gap to a signed offer.
          </h2>
          <p className="mt-3 text-[14.5px] leading-[1.7] text-[#c3cbdc]">
            SkillNorth walks the whole path with you — closing gaps, tailoring the CV, preparing the
            application, then getting you ready for the room.
          </p>
        </div>
        <Journey3D />
      </section>

      <section className="glass relative mb-5 overflow-hidden rounded-3xl px-8 py-14 sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'conic-gradient(from 220deg at 82% 22%, rgba(79,209,197,0.20), rgba(139,127,255,0.13), transparent 60%)',
          }}
        />
        <div className="relative max-w-[62ch]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,209,197,0.35)] bg-[rgba(79,209,197,0.14)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-[#4fd1c5] uppercase">
            Career agent
          </span>

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(34px,5.2vw,60px)] leading-[1.04] font-bold tracking-[-0.02em]">
            Stop rewriting your CV
            <br />
            for every job.
          </h1>

          <p className="mt-5 text-[17px] leading-[1.65] text-[#c3cbdc]">
            Bring your career history once. From then on, paste any job link and SkillNorth scores
            the fit, shows you the exact gaps, and writes a tailored CV and cover letter built to
            survive the screen.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-[10px] bg-[#4fd1c5] px-6 py-3 text-[14px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98]"
            >
              Explore the demo
            </Link>
            <span className="text-[13px] text-[#7c88a3]">
              No account needed — it runs on sample data.
            </span>
          </div>
        </div>

        <div className="relative mt-12 flex flex-wrap gap-x-12 gap-y-6">
          {[
            { stat: 'Never', label: 'invents experience you don’t have' },
            { stat: 'Every', label: 'score breaks down into why' },
            { stat: 'You', label: 'press send, always' },
          ].map((item) => (
            <div key={item.label}>
              <div className="font-[family-name:var(--font-display)] text-[20px] font-semibold text-[#4fd1c5]">
                {item.stat}
              </div>
              <div className="mt-0.5 max-w-[24ch] text-[12.5px] leading-[1.5] text-[#7c88a3]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass mb-5 rounded-3xl px-8 py-12 sm:px-12">
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-[54ch]">
            <h2 className="font-[family-name:var(--font-display)] text-[26px] font-semibold tracking-[-0.01em]">
              A match score is a bearing, not a verdict.
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-[#c3cbdc]">
              Every job gets a reading out of 100, broken into six things you can actually argue
              with: skills, experience, day-to-day overlap, qualifications, seniority, and
              logistics. When SkillNorth says 87, you can see precisely which 13 points are missing
              — and what closing each one is worth.
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.7] text-[#c3cbdc]">
              The needle&rsquo;s colour tells you what happens next. That&rsquo;s the whole
              interface.
            </p>
          </div>
          <div className="flex items-center justify-center gap-5">
            <CompassScore score={94} size={90} />
            <CompassScore score={83} size={90} />
            <CompassScore score={68} size={90} />
          </div>
        </div>
      </section>

      <section className="glass mb-5 rounded-3xl px-8 py-12 sm:px-12">
        <h2 className="font-[family-name:var(--font-display)] text-[26px] font-semibold tracking-[-0.01em]">
          You set the bar. It does the work up to it.
        </h2>
        <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.7] text-[#c3cbdc]">
          SkillNorth does everything a human assistant would — reads the posting, tailors the CV,
          drafts the letter, fills in the answers. It just doesn&rsquo;t press send. Every boundary
          below is yours to move.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BANDS.map((band) => (
            <div key={band.range} className="panel p-5">
              <div
                className="font-[family-name:var(--font-mono)] text-[13px] font-bold"
                style={{ color: band.color }}
              >
                {band.range}
              </div>
              <div className="mt-2.5 font-[family-name:var(--font-display)] text-[14px] font-semibold">
                {band.title}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#7c88a3]">{band.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass mb-5 rounded-3xl px-8 py-12 sm:px-12">
        <h2 className="font-[family-name:var(--font-display)] text-[26px] font-semibold tracking-[-0.01em]">
          What SkillNorth won&rsquo;t do
        </h2>
        <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.7] text-[#c3cbdc]">
          Most tools in this category quietly overpromise. Here are the real lines, up front, so
          nothing about this product surprises you later.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {LIMITS.map((item) => (
            <div key={item.title} className="panel p-6">
              <h3 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
                {item.title}
              </h3>
              <p className="mt-2.5 text-[13px] leading-[1.7] text-[#7c88a3]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col items-center gap-3 py-10 text-center">
        <CompassMark size={22} />
        <p className="text-[12px] text-[#7c88a3]">SkillNorth — point your career true north.</p>
      </footer>
    </main>
  )
}
