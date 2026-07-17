import Link from 'next/link'
import { BandPill, CompassScore } from '@/components/compass'
import { PageHeader } from '@/components/page-header'
import { demoMatches, initials } from '@/lib/demo'

export default function DashboardPage() {
  const matches = demoMatches()

  const ready = matches.filter((m) => m.match.band === 'ready').length
  const confirm = matches.filter((m) => m.match.band === 'confirm').length
  const improve = matches.filter((m) => m.match.band === 'improve').length

  // The single highest-leverage action across every job, which is the one thing
  // worth putting on a dashboard.
  const topGap = matches
    .flatMap((m) => m.match.gaps.map((g) => ({ gap: g, job: m.job })))
    .sort((a, b) => b.gap.pointsRecoverable - a.gap.pointsRecoverable)[0]

  const gapFrequency = new Map<string, number>()
  for (const m of matches) {
    for (const gap of m.match.gaps) {
      gapFrequency.set(gap.name, (gapFrequency.get(gap.name) ?? 0) + 1)
    }
  }
  const mostCommonGap = [...gapFrequency.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <>
      <PageHeader title="Dashboard" sub="Your job search, at a glance" />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: ready, label: 'Ready to send', color: '#4fd1c5' },
            { n: confirm, label: 'Waiting on you', color: '#ffd166' },
            { n: improve, label: 'Need work first', color: '#f5a623' },
          ].map((stat) => (
            <div key={stat.label} className="panel p-5">
              <div className="text-[11.5px] text-[#7c88a3]">{stat.label}</div>
              <div
                className="tnum mt-1.5 font-[family-name:var(--font-mono)] text-[28px] font-bold"
                style={{ color: stat.color }}
              >
                {stat.n}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <section className="panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-[16px] font-semibold">
                Your matches
              </h2>
              <Link href="/matches" className="text-[11.5px] text-[#4fd1c5] hover:underline">
                View all →
              </Link>
            </div>

            <ul className="flex flex-col gap-2.5">
              {matches.slice(0, 4).map(({ job, match }) => (
                <li key={job.id}>
                  <Link
                    href={`/matches/${job.id}`}
                    className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3.5 transition hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.06)]"
                  >
                    <span
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] font-[family-name:var(--font-display)] text-[13px] font-bold text-[#8b7fff]"
                      style={{ background: 'rgba(139,127,255,0.18)' }}
                      aria-hidden="true"
                    >
                      {initials(job.company)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {job.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-[#7c88a3]">
                        {job.company} · {job.location}
                      </span>
                      <span className="mt-2 block">
                        <BandPill band={match.band} />
                      </span>
                    </span>
                    <CompassScore score={match.overall} size={58} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel flex flex-col p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[14px] font-semibold">
              What to do next
            </h2>
            <p className="mt-1 text-[11px] text-[#7c88a3]">
              Ranked by the points it would actually recover.
            </p>

            {topGap ? (
              <div className="mt-4 rounded-2xl border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.1)] p-4">
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.1em] text-[#f5a623] uppercase">
                  Biggest single win
                </div>
                <div className="mt-2 font-[family-name:var(--font-display)] text-[15px] font-semibold">
                  {topGap.gap.name}
                </div>
                <p className="mt-1.5 text-[12px] leading-[1.6] text-[#c3cbdc]">
                  {topGap.gap.suggestion}
                </p>
                <div className="tnum mt-3 font-[family-name:var(--font-mono)] text-[11px] text-[#f5a623]">
                  +{topGap.gap.pointsRecoverable} pts on {topGap.job.company}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[12.5px] text-[#7c88a3]">
                No gaps across your current matches. Add more jobs to find your next move.
              </p>
            )}

            {mostCommonGap && mostCommonGap[1] > 1 && (
              <p className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4 text-[12px] leading-[1.6] text-[#7c88a3]">
                <strong className="text-[#f3f6fb]">{mostCommonGap[0]}</strong> is missing from{' '}
                {mostCommonGap[1]} of your {matches.length} matches. It&rsquo;s the skill holding
                back the most doors at once.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
