'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { CompassMark } from '@/components/compass'

/**
 * The role switcher from the original mockup is deliberately absent. The provider
 * and recruiter portals are Phase 2 products; shipping a switcher into empty rooms
 * is worse than not shipping it.
 */
const NAV = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/profile', label: 'Your Profile', Icon: UserRound },
  { href: '/matches', label: 'Job Matches', Icon: Search },
  { href: '/studio', label: 'Resume Studio', Icon: FileText },
  { href: '/rules', label: 'Automation Rules', Icon: SlidersHorizontal },
  { href: '/tracker', label: 'Tracker', Icon: ListChecks },
]

export interface RailUser {
  name: string
  email: string | null
}

export function RailNav({ user }: { user: RailUser | null }) {
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

      <div className="mt-auto hidden flex-col gap-2 border-t border-[rgba(255,255,255,0.08)] pt-4 md:flex">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 flex-none rounded-full bg-gradient-to-br from-[#8b7fff] to-[#4fd1c5]" />
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-semibold">
              {user ? user.name : 'Demo profile'}
            </div>
            <div className="truncate text-[10.5px] text-[#7c88a3]">
              {user ? (user.email ?? 'Signed in') : 'Sample data'}
            </div>
          </div>
        </div>
        {user ? (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-[9px] px-2 py-1.5 text-left text-[11.5px] text-[#7c88a3] transition hover:bg-[rgba(255,255,255,0.05)] hover:text-[#c3cbdc]"
            >
              <LogOut size={14} strokeWidth={1.7} aria-hidden="true" />
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/signin"
            className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11.5px] text-[#4fd1c5] transition hover:bg-[rgba(255,255,255,0.05)]"
          >
            <LogOut size={14} strokeWidth={1.7} aria-hidden="true" />
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
