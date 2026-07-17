export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-6 py-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[19px] font-semibold">
          {title}
        </h1>
        <p className="mt-0.5 text-[11.5px] text-[#7c88a3]">{sub}</p>
      </div>
      <span className="rounded-full border border-[rgba(139,127,255,0.35)] bg-[rgba(139,127,255,0.16)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.1em] text-[#8b7fff] uppercase">
        Demo data
      </span>
    </header>
  )
}
