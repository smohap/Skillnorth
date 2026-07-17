'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, LayoutDashboard, ListChecks, Search, SlidersHorizontal } from 'lucide-react'
import { CompassMark } from '@/components/compass'

/**
 * The role switcher from the original mockup is deliberately absent. The provider
 * and recruiter portals are Phase 2 products; shipping a switcher into empty rooms
 * is worse than not shipping it.
 */
const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/matches', label: 'Job Matches', Icon: Search },
  { href: '/studio', label: 'Resume Studio', Icon: FileText },
  { href: '/rules', label: 'Automation Rules', Icon: SlidersHorizontal },
  { href: '/tracker', label: 'Tracker', Icon: ListChecks },
]

export function RailNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex gap-1 border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] max-md:overflow-x-auto max-md:border-b max-md:p-2 md:flex-col md:border-r md:p-3.5 md:pt-5"
      aria-label="Main"
    >
      <div className="mb-3.5 hidden items-center gap-2.5 border-b border-[rgba(255,255,255,0.08)] px-2 pb-5 md:flex">
        <CompassMark size={26} />
        <div>
          <div className="font-[family-name:var(--font-display)] text-[15px] font-bold">
            SkillNorth
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[9px] tracking-[0.13em] text-[#7c88a3] uppercase">
            Career agent
          </div>
        </div>
      </div>

      {NAV.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 flex-none items-center gap-3 rounded-[11px] px-3 text-[13px] whitespace-nowrap transition ${
              active
                ? 'bg-[rgba(79,209,197,0.18)] text-white shadow-[inset_0_0_0_1px_rgba(79,209,197,0.3)]'
                : 'text-[#c3cbdc] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#f3f6fb]'
            }`}
          >
            <Icon size={17} strokeWidth={1.7} className="flex-none" aria-hidden="true" />
            {label}
          </Link>
        )
      })}

      <div className="mt-auto hidden items-center gap-2.5 border-t border-[rgba(255,255,255,0.08)] pt-4 md:flex">
        <div className="h-8 w-8 flex-none rounded-full bg-gradient-to-br from-[#8b7fff] to-[#4fd1c5]" />
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold">Priya Nathan</div>
          <div className="truncate text-[10.5px] text-[#7c88a3]">Analytics Engineer</div>
        </div>
      </div>
    </nav>
  )
}
