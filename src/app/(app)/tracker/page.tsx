import { PageHeader } from '@/components/page-header'
import { initials } from '@/lib/demo'

const COLUMNS: Array<{
  title: string
  cards: Array<{ company: string; role: string; note: string }>
}> = [
  {
    title: 'Prepared',
    cards: [
      {
        company: 'Snowbird Data',
        role: 'Senior Analytics Engineer',
        note: 'Ready to send · 94 match',
      },
    ],
  },
  {
    title: 'Applied',
    cards: [
      { company: 'Harborline', role: 'Product Analyst', note: 'Sent 3 days ago' },
      { company: 'Kestrel Labs', role: 'Data Engineer', note: 'Sent last week' },
    ],
  },
  {
    title: 'Interview',
    cards: [{ company: 'Cobalt Analytics', role: 'Analytics Engineer', note: 'Screening · Thu 10am' }],
  },
  { title: 'Offer', cards: [] },
  {
    title: 'Closed',
    cards: [{ company: 'Vantage Corp', role: 'BI Lead', note: 'Filled internally' }],
  },
]

export default function TrackerPage() {
  return (
    <>
      <PageHeader title="Tracker" sub="Every application, one pipeline" />

      <div className="animate-fade-up overflow-x-auto p-5 sm:p-6">
        <div className="grid min-w-[820px] grid-cols-5 gap-3">
          {COLUMNS.map((col) => (
            <section
              key={col.title}
              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3"
            >
              <h2 className="mb-3 flex items-center justify-between font-[family-name:var(--font-display)] text-[12px] font-semibold text-[#c3cbdc]">
                {col.title}
                <span className="tnum font-[family-name:var(--font-mono)] text-[11px] text-[#7c88a3]">
                  {col.cards.length}
                </span>
              </h2>

              {col.cards.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-[rgba(255,255,255,0.1)] px-3 py-6 text-center text-[11px] leading-[1.5] text-[#7c88a3]">
                  Nothing here yet
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {col.cards.map((card) => (
                    <li
                      key={`${card.company}-${card.role}`}
                      className="rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.09)] p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 flex-none items-center justify-center rounded-md font-[family-name:var(--font-display)] text-[9px] font-bold text-[#8b7fff]"
                          style={{ background: 'rgba(139,127,255,0.18)' }}
                          aria-hidden="true"
                        >
                          {initials(card.company)}
                        </span>
                        <span className="truncate text-[12px] font-semibold">{card.company}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[#c3cbdc]">{card.role}</p>
                      <p className="mt-0.5 text-[10.5px] text-[#7c88a3]">{card.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
