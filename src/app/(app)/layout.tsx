import { RailNav } from '@/components/rail-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-5">
      <div className="glass grid min-h-[86vh] overflow-hidden rounded-3xl md:grid-cols-[232px_1fr]">
        <RailNav />
        <div className="flex min-w-0 flex-col">{children}</div>
      </div>
    </div>
  )
}
