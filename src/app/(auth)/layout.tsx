import Link from 'next/link'
import { CompassMark } from '@/components/compass'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <CompassMark size={30} />
        <span className="font-[family-name:var(--font-display)] text-[18px] font-bold">
          SkillNorth
        </span>
      </Link>
      {children}
    </main>
  )
}
