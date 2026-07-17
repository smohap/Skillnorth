import Link from 'next/link'
import { BandPill, CompassScore } from '@/components/compass'
import { PageHeader } from '@/components/page-header'
import { demoMatches, initials } from '@/lib/demo'

export default function MatchesPage() {
  const matches = demoMatches()

  return (
    <>
      <PageHeader title="Job Matches" sub="Ranked by fit against your live profile" />

      <div className="animate-fade-up flex flex-col gap-2.5 overflow-y-auto p-5 sm:p-6">
        {matches.map(({ job, match }) => (
          <Link
            key={job.id}
            href={`/matches/${job.id}`}
            className="flex items-start gap-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 transition hover:border-[rgba(255,255,255,0.16)] hover:bg-[rgba(255,255,255,0.06)]"
          >
            <span
              className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] font-[family-name:var(--font-display)] text-[14px] font-bold text-[#8b7fff]"
              style={{ background: 'rgba(139,127,255,0.18)' }}
              aria-hidden="true"
            >
              {initials(job.company)}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{job.title}</span>
              <span className="mt-0.5 block text-[11.5px] text-[#7c88a3]">
                {job.company} · {job.location}
                {job.logistics.remote === 'remote' && ' · Remote'}
              </span>

              <span className="mt-2.5 flex flex-wrap items-center gap-2">
                <BandPill band={match.band} />
                {match.gaps.slice(0, 2).map((gap) => (
                  <span
                    key={gap.requirementId}
                    className="rounded-md bg-[rgba(255,107,107,0.16)] px-2 py-1 font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.04em] text-[#ff6b6b] uppercase"
                  >
                    Missing: {gap.name}
                  </span>
                ))}
              </span>
            </span>

            <CompassScore score={match.overall} size={62} />
          </Link>
        ))}
      </div>
    </>
  )
}
