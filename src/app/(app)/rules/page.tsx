import { PageHeader } from '@/components/page-header'
import { DEFAULT_BAND_SETTINGS } from '@/lib/types'

const RULES = [
  {
    range: `≥ ${DEFAULT_BAND_SETTINGS.autoBandMin}%`,
    color: '#4fd1c5',
    title: 'Prepare automatically',
    body: 'CV and cover letter are generated, provenance-checked, and queued as ready to send. You still press send.',
    on: true,
  },
  {
    range: `${DEFAULT_BAND_SETTINGS.confirmBandMin}–${DEFAULT_BAND_SETTINGS.autoBandMin - 1}%`,
    color: '#ffd166',
    title: 'Ask before preparing',
    body: 'Nothing is generated until you confirm. This is the band where your judgement is worth the most.',
    on: true,
  },
  {
    range: `${DEFAULT_BAND_SETTINGS.improveBandMin}–${DEFAULT_BAND_SETTINGS.confirmBandMin - 1}%`,
    color: '#f5a623',
    title: 'Suggest improvements',
    body: 'No application prepared. Shows the ranked gaps and the CV edits that would lift the score.',
    on: true,
  },
  {
    range: `< ${DEFAULT_BAND_SETTINGS.improveBandMin}%`,
    color: '#ff6b6b',
    title: 'Filter out',
    body: 'Kept out of your active queue entirely.',
    on: false,
  },
]

const SITES = [
  { name: 'Greenhouse-hosted boards', supported: true },
  { name: 'Lever-hosted boards', supported: true },
  { name: 'LinkedIn Jobs', supported: false },
  { name: 'Seek', supported: false },
  { name: 'Indeed', supported: false },
]

export default function RulesPage() {
  return (
    <>
      <PageHeader title="Automation Rules" sub="Set the bands that control what runs without you" />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
            Match-score bands
          </h2>
          <p className="mt-1 mb-4 max-w-[70ch] text-[11.5px] leading-[1.6] text-[#7c88a3]">
            These decide what happens the moment a job is scored. The defaults are a starting
            point, not a rule — every boundary is yours to move.
          </p>

          <ul className="flex flex-col">
            {RULES.map((rule) => (
              <li
                key={rule.range}
                className="flex items-center gap-4 border-b border-[rgba(255,255,255,0.08)] py-4 last:border-0"
              >
                <span
                  className="w-[92px] flex-none rounded-lg px-2.5 py-1.5 text-center font-[family-name:var(--font-mono)] text-[12px]"
                  style={{
                    color: rule.color,
                    background: `color-mix(in srgb, ${rule.color} 16%, transparent)`,
                  }}
                >
                  {rule.range}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-[family-name:var(--font-display)] text-[13px] font-semibold">
                    {rule.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-[1.55] text-[#7c88a3]">
                    {rule.body}
                  </span>
                </span>
                <span
                  className="flex h-6 w-11 flex-none items-center rounded-full border p-0.5"
                  style={{
                    background: rule.on ? 'rgba(79,209,197,0.18)' : 'rgba(255,255,255,0.1)',
                    borderColor: rule.on ? 'rgba(79,209,197,0.4)' : 'rgba(255,255,255,0.08)',
                    justifyContent: rule.on ? 'flex-end' : 'flex-start',
                  }}
                  role="img"
                  aria-label={`${rule.title}: ${rule.on ? 'on' : 'off'}`}
                >
                  <span
                    className="h-[18px] w-[18px] rounded-full"
                    style={{ background: rule.on ? '#4fd1c5' : '#fff' }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              Where preparation runs
            </h2>
            <p className="mt-1 mb-4 text-[11.5px] leading-[1.6] text-[#7c88a3]">
              SkillNorth prepares applications everywhere. Deep-linking into a prefilled form only
              works on boards that allow it.
            </p>

            <ul className="flex flex-col gap-2">
              {SITES.map((site) => (
                <li
                  key={site.name}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[12px]"
                >
                  <span>{site.name}</span>
                  <span
                    className="flex-none font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.06em] uppercase"
                    style={{ color: site.supported ? '#4fd1c5' : '#7c88a3' }}
                  >
                    {site.supported ? 'Prefill' : 'Manual'}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[11px] leading-[1.6] text-[#7c88a3]">
              LinkedIn, Seek, and Indeed prohibit automated submission in their terms, and it&rsquo;s
              your account at risk, not ours. SkillNorth prepares everything and opens the form —
              you paste and send.
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              Weekly preparation cap
            </h2>
            <p className="mt-1 mb-5 text-[11.5px] leading-[1.6] text-[#7c88a3]">
              A safety limit, so the queue can never run away from you.
            </p>

            <div className="flex items-baseline gap-2">
              <span className="tnum font-[family-name:var(--font-mono)] text-[32px] font-bold text-[#4fd1c5]">
                15
              </span>
              <span className="text-[12px] text-[#7c88a3]">applications / week</span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-md bg-[rgba(255,255,255,0.06)]">
              <div className="h-full w-[30%] rounded-md bg-gradient-to-r from-[#8b7fff] to-[#4fd1c5]" />
            </div>
            <p className="mt-2 font-[family-name:var(--font-mono)] text-[10px] text-[#7c88a3]">
              1 / 50
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
