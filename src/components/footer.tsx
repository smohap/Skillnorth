import Link from 'next/link'
import { CompassMark } from '@/components/compass'

/**
 * Two footers, deliberately different in weight.
 *
 * The marketing footer is where a visitor is still deciding, so it carries the
 * navigation and — importantly — repeats the product's honest limits. The app
 * footer sits under someone already working; anything more than a thin line of
 * orientation would be noise.
 */

const YEAR = new Date().getFullYear()

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: 'Product',
    links: [
      { label: 'Job matches', href: '/matches' },
      { label: 'Resume studio', href: '/studio' },
      { label: 'Automation rules', href: '/rules' },
      { label: 'Application tracker', href: '/tracker' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Pricing', href: '#pricing' },
      { label: 'How it works', href: '#journey' },
      { label: 'Sign in', href: '/signin' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="glass mt-5 rounded-3xl px-8 py-12 sm:px-12">
      <div className="grid gap-10 md:grid-cols-[1.4fr_2fr]">
        <div className="max-w-[38ch]">
          <div className="flex items-center gap-2.5">
            <CompassMark size={26} />
            <span className="font-[family-name:var(--font-display)] text-[16px] font-bold">
              SkillNorth
            </span>
          </div>
          <p className="mt-3.5 text-[13px] leading-[1.7] text-[#7c88a3]">
            The AI agent that points your career true north. Bring your history once, and every job
            posting becomes a tailored application you can actually stand behind.
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.14em] text-[#7c88a3] uppercase">
                {col.heading}
              </h3>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[#c3cbdc] transition hover:text-[#4fd1c5]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* The limits, repeated where a hesitant visitor will actually read them. */}
      <div className="mt-10 border-t border-[rgba(255,255,255,0.08)] pt-6">
        <p className="max-w-[80ch] text-[11.5px] leading-[1.7] text-[#7c88a3]">
          SkillNorth never invents experience you don&rsquo;t have. Our Readiness Score is our own
          measure of how cleanly a CV parses and how well it covers a posting — it is not a score
          from Workday, Greenhouse, or any other ATS, because none of them publish one. We prepare
          applications; you send them.
        </p>
        <p className="mt-4 text-[11.5px] text-[#7c88a3]">
          © {YEAR} SkillNorth. Not affiliated with LinkedIn, Seek, Indeed, or any ATS vendor.
        </p>
      </div>
    </footer>
  )
}

export function AppFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.08)] px-6 py-4">
      <p className="text-[11px] text-[#7c88a3]">
        © {YEAR} SkillNorth · Readiness is our own score, not a vendor ATS score
      </p>
      <div className="flex items-center gap-4">
        <Link href="/privacy" className="text-[11px] text-[#7c88a3] transition hover:text-[#c3cbdc]">
          Privacy
        </Link>
        <Link href="/terms" className="text-[11px] text-[#7c88a3] transition hover:text-[#c3cbdc]">
          Terms
        </Link>
      </div>
    </footer>
  )
}
