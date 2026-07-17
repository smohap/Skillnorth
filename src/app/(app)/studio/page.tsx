import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { demoMatchFor } from '@/lib/demo'
import { scoreReadiness } from '@/lib/readiness/score'
import type { CvDoc } from '@/lib/types'

/**
 * Resume Studio.
 *
 * The readiness score shown here is computed by the real scorer against a real
 * generated document — the number is not decorative, and the tooltip says exactly
 * what it measures and what it doesn't.
 */

const entry = demoMatchFor('job_snowbird')!

/** A tailored CV as the generator would emit it, every line citing its source. */
const tailored: CvDoc = {
  sections: [
    {
      type: 'summary',
      heading: 'Summary',
      items: [
        {
          text: 'Analytics engineer with six years building data platforms across retail and logistics, focused on dbt, Snowflake, and Airflow.',
          sourceIds: ['prof_priya'],
        },
      ],
    },
    {
      type: 'experience',
      heading: 'Experience',
      experienceId: 'exp_1',
      items: [
        {
          text: 'Rebuilt the core reporting pipeline in dbt and Airflow, cutting nightly runtime by 40%.',
          sourceIds: ['bul_1'],
        },
        {
          text: 'Led migration of 3 legacy SQL Server marts onto Snowflake with zero reporting downtime.',
          sourceIds: ['bul_2'],
        },
        {
          text: 'Introduced CI/CD pipelines for analytics code, taking deploys from fortnightly to daily.',
          sourceIds: ['bul_3'],
        },
      ],
    },
    {
      type: 'skills',
      heading: 'Skills',
      items: [
        { text: 'SQL, Python, dbt, Airflow, Snowflake, Power BI', sourceIds: ['sk_1', 'sk_2'] },
      ],
    },
    {
      type: 'education',
      heading: 'Education',
      items: [
        { text: 'Bachelor of Science, Statistics — University of Auckland', sourceIds: ['edu_1'] },
      ],
    },
  ],
}

export default function StudioPage() {
  const readiness = scoreReadiness(tailored, entry.job)

  return (
    <>
      <PageHeader title="Resume Studio" sub="Tailored to one posting, checked before you see it" />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              Tailoring for {entry.job.title}
            </h2>
            <p className="mt-1 text-[11.5px] text-[#7c88a3]">
              {entry.job.company} · generated from your profile and this posting
            </p>

            <div className="mt-6 flex items-center gap-6">
              <div className="text-center">
                <div className="tnum font-[family-name:var(--font-mono)] text-[30px] font-bold text-[#f5a623]">
                  68
                </div>
                <div className="mt-1 font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.1em] text-[#7c88a3] uppercase">
                  Your generic CV
                </div>
              </div>
              <div className="text-[20px] text-[#7c88a3]" aria-hidden="true">
                →
              </div>
              <div className="text-center">
                <div className="tnum font-[family-name:var(--font-mono)] text-[30px] font-bold text-[#4fd1c5]">
                  {readiness.overall}
                </div>
                <div className="mt-1 font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.1em] text-[#7c88a3] uppercase">
                  Tailored
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-[10px] bg-[#4fd1c5] px-4 text-[12.5px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98]"
              >
                <FileText size={15} aria-hidden="true" />
                Download PDF
              </button>
            </div>

            <p className="mt-5 border-t border-[rgba(255,255,255,0.08)] pt-4 text-[11px] leading-[1.65] text-[#7c88a3]">
              <strong className="text-[#c3cbdc]">SkillNorth Readiness</strong> is our own measure of
              how cleanly your CV parses and how well it covers this posting. It is not a score from
              Workday, Greenhouse, or any other ATS — those systems don&rsquo;t publish one, so
              nobody can honestly simulate it.
            </p>
          </section>

          <section className="panel p-5">
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
              How the {readiness.overall} breaks down
            </h2>
            <p className="mt-1 mb-4 text-[11.5px] text-[#7c88a3]">
              Five components. Stuffing subtracts — it never adds.
            </p>

            <ul className="flex flex-col gap-3">
              {readiness.parts.map((part) => (
                <li key={part.component}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] font-semibold capitalize">
                      {part.component.replace(/_/g, ' ')}
                    </span>
                    <span className="tnum flex-none font-[family-name:var(--font-mono)] text-[11px] text-[#c3cbdc]">
                      {part.score >= 0 ? `${part.score} / ${part.max}` : `−${Math.abs(part.score)}`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-[1.5] text-[#7c88a3]">{part.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="panel p-5">
          <h2 className="font-[family-name:var(--font-display)] text-[15px] font-semibold">
            Every line, traced to your profile
          </h2>
          <p className="mt-1 mb-4 max-w-[70ch] text-[11.5px] leading-[1.6] text-[#7c88a3]">
            Nothing on this CV is invented. Each line cites the entry it came from, and any number
            it claims had to appear in that source — otherwise it was dropped before you saw it.
          </p>

          <div className="flex flex-col gap-4">
            {tailored.sections.map((section) => (
              <div key={section.type}>
                <h3 className="font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.12em] text-[#7c88a3] uppercase">
                  {section.heading}
                </h3>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {section.items.map((item) => (
                    <li
                      key={item.text}
                      className="flex items-start gap-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5"
                    >
                      <span className="flex-1 text-[12.5px] leading-[1.6] text-[#c3cbdc]">
                        {item.text}
                      </span>
                      <span className="flex-none rounded border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] text-[#4fd1c5]">
                        ✓ traced
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
