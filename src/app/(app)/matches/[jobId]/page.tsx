import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BandPill, CompassScore } from '@/components/compass'
import { PageHeader } from '@/components/page-header'
import { DIMENSION_LABEL, demoMatchFor } from '@/lib/demo'

/**
 * The explainability screen.
 *
 * A number nobody can interrogate is a number nobody should act on — and users are
 * pointing automation at these. So every dimension shows its score, its weight, and
 * a sentence of reasoning, and every gap shows what closing it is actually worth.
 */

// `params` is a Promise in Next.js 16 — synchronous access was removed.
export default async function MatchDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const entry = demoMatchFor(jobId)
  if (!entry) notFound()

  const { job, match } = entry
  const canPrepare = match.band === 'ready' || match.band === 'confirm'

  return (
    <>
      <PageHeader title={job.title} sub={`${job.company} · ${job.location}`} />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <Link href="/matches" className="text-[12px] text-[#7c88a3] hover:text-[#c3cbdc]">
          ← All matches
        </Link>

        {/* Headline */}
        <section className="panel flex flex-wrap items-center gap-6 p-6">
          <CompassScore score={match.overall} size={104} />
          <div className="min-w-0 flex-1">
            <BandPill band={match.band} />
            <p className="mt-3 max-w-[56ch] text-[13.5px] leading-[1.65] text-[#c3cbdc]">
              {match.band === 'ready' &&
                'This clears your auto-prepare bar. Your CV and cover letter are written and checked — review them and send when you’re ready.'}
              {match.band === 'confirm' &&
                'A strong match that’s worth your judgement. Confirm and SkillNorth will tailor your CV and letter for it.'}
              {match.band === 'improve' &&
                'You’d likely be screened out today. The gaps below are ranked by what closing each one is actually worth.'}
              {match.band === 'filtered' &&
                'Too far off to be worth your evening. It stays out of your active queue.'}
            </p>
          </div>
          {canPrepare && (
            <button
              type="button"
              className="min-h-11 rounded-[10px] bg-[#4fd1c5] px-5 text-[13px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98]"
            >
              {match.band === 'ready' ? 'Review & send' : 'Prepare application'}
            </button>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Breakdown */}
          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              Why {match.overall}?
            </h2>
            <p className="mt-1 mb-4 text-[11.5px] text-[#7c88a3]">
              Six dimensions, weighted. Nothing here is a black box.
            </p>

            <ul className="flex flex-col gap-4">
              {match.subscores.map((sub) => (
                <li key={sub.dimension}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] font-semibold text-[#f3f6fb]">
                      {DIMENSION_LABEL[sub.dimension]}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#7c88a3]">
                        weight {sub.weight}%
                      </span>
                      <span className="tnum font-[family-name:var(--font-mono)] text-[13px] font-bold text-[#f3f6fb]">
                        {Math.round(sub.score)}
                      </span>
                    </span>
                  </div>

                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-md bg-[rgba(255,255,255,0.06)]"
                    role="img"
                    aria-label={`${DIMENSION_LABEL[sub.dimension]}: ${Math.round(sub.score)} out of 100`}
                  >
                    <div
                      className="h-full rounded-md"
                      style={{
                        width: `${sub.score}%`,
                        background:
                          sub.score >= 80
                            ? 'linear-gradient(90deg,#8b7fff,#4fd1c5)'
                            : sub.score >= 60
                              ? 'linear-gradient(90deg,#f5a623,#ffd166)'
                              : 'linear-gradient(90deg,#ff6b6b,#f5a623)',
                      }}
                    />
                  </div>

                  <p className="mt-1.5 text-[11.5px] leading-[1.55] text-[#7c88a3]">
                    {sub.rationale}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Gaps */}
          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              {match.gaps.length > 0 ? 'What’s missing' : 'Nothing missing'}
            </h2>
            <p className="mt-1 mb-4 text-[11.5px] text-[#7c88a3]">
              {match.gaps.length > 0
                ? 'Ranked by the points each one would recover.'
                : 'You meet every requirement this posting lists.'}
            </p>

            {match.gaps.length === 0 ? (
              <div className="rounded-2xl border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] p-4 text-[12.5px] leading-[1.6] text-[#c3cbdc]">
                Every requirement on this posting is covered by your profile. Any remaining points
                sit in experience and seniority, which a course can&rsquo;t fix — only time can.
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {match.gaps.map((gap) => (
                  <li
                    key={gap.requirementId}
                    className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold">{gap.name}</span>
                      <span className="tnum flex-none font-[family-name:var(--font-mono)] text-[11px] font-bold text-[#4fd1c5]">
                        +{gap.pointsRecoverable}
                      </span>
                    </div>
                    <span
                      className="mt-1.5 inline-block rounded px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] tracking-[0.06em] uppercase"
                      style={
                        gap.kind === 'must_have'
                          ? { background: 'rgba(255,107,107,0.16)', color: '#ff6b6b' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#7c88a3' }
                      }
                    >
                      {gap.kind === 'must_have' ? 'Must have' : 'Nice to have'}
                    </span>
                    <p className="mt-2 text-[11.5px] leading-[1.6] text-[#7c88a3]">
                      {gap.suggestion}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Evidence — where the score came from */}
        {match.evidence.length > 0 && (
          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              Where the credit came from
            </h2>
            <p className="mt-1 mb-4 max-w-[70ch] text-[11.5px] leading-[1.6] text-[#7c88a3]">
              Each requirement SkillNorth counted as met, and what on your profile satisfied it.
              Some were matched from your skills list; others were found in the prose of a role you
              wrote up but never thought to list.
            </p>

            <div className="flex flex-wrap gap-2">
              {match.evidence.map((ev) => {
                const req = job.requirements.find((r) => r.id === ev.requirementId)
                return (
                  <span
                    key={ev.requirementId}
                    className="rounded-lg border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] px-2.5 py-1.5 text-[11.5px] text-[#c3cbdc]"
                  >
                    <strong className="text-[#4fd1c5]">{req?.name}</strong>
                    <span className="text-[#7c88a3]"> — via {ev.sourceLabel}</span>
                  </span>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
