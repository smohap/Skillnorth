import Link from 'next/link'
import { Check } from 'lucide-react'

/**
 * Pricing.
 *
 * Tiers follow the PRD's monetisation section. The price POINTS are placeholders —
 * they're the one thing here that needs a real commercial decision, not a designer's
 * guess, so they're kept in this single array to change in one place.
 */

interface Tier {
  name: string
  price: string
  cadence?: string
  tagline: string
  features: string[]
  cta: string
  href: string
  featured?: boolean
}

const TIERS: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    tagline: 'Enough to see whether this works for you.',
    features: [
      '10 tailored CVs per month',
      'Job matching with full score breakdown',
      'Skill gap analysis',
      'Manual applications',
    ],
    cta: 'Start free',
    href: '/signin',
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: '/month',
    tagline: 'For an active search, where volume actually matters.',
    features: [
      'Unlimited CVs and cover letters',
      'Full Readiness scoring and optimisation',
      'Automation bands — prepared, ready to send',
      'Application tracker',
      'Interview preparation',
    ],
    cta: 'Start free trial',
    href: '/signin',
    featured: true,
  },
  {
    name: 'Premium',
    price: '$39',
    cadence: '/month',
    tagline: 'For senior and executive searches run in parallel.',
    features: [
      'Everything in Pro',
      'Multiple CV profiles for parallel searches',
      'Executive templates',
      'AI career coaching and weekly report',
      'Priority processing',
    ],
    cta: 'Go Premium',
    href: '/signin',
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="glass mb-5 scroll-mt-6 rounded-3xl px-8 py-12 sm:px-12">
      <div className="mx-auto max-w-[52ch] text-center">
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-[#4fd1c5] uppercase">
          Pricing
        </span>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(24px,3.4vw,32px)] font-semibold tracking-[-0.01em]">
          Start free. Upgrade when it&rsquo;s earning its keep.
        </h2>
        <p className="mt-3 text-[14.5px] leading-[1.7] text-[#c3cbdc]">
          Every plan includes the full match breakdown and the anti-fabrication guarantee. Those
          aren&rsquo;t premium features — they&rsquo;re the product.
        </p>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="relative flex flex-col rounded-3xl p-6"
            style={
              tier.featured
                ? {
                    background: 'rgba(79,209,197,0.08)',
                    border: '1px solid rgba(79,209,197,0.4)',
                    boxShadow: '0 18px 46px rgba(0,0,0,0.32)',
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }
            }
          >
            {tier.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-[#4fd1c5] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[9.5px] tracking-[0.1em] text-[#06231f] uppercase">
                Most popular
              </span>
            )}

            <h3 className="font-[family-name:var(--font-display)] text-[17px] font-semibold">
              {tier.name}
            </h3>
            <p className="mt-1.5 min-h-[36px] text-[12.5px] leading-[1.5] text-[#7c88a3]">
              {tier.tagline}
            </p>

            <p className="mt-4 flex items-baseline gap-1">
              <span className="tnum font-[family-name:var(--font-mono)] text-[34px] font-bold text-[#f3f6fb]">
                {tier.price}
              </span>
              {tier.cadence && <span className="text-[13px] text-[#7c88a3]">{tier.cadence}</span>}
            </p>

            <ul className="mt-5 flex flex-1 flex-col gap-2.5">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check
                    size={15}
                    strokeWidth={2.2}
                    className="mt-0.5 flex-none text-[#4fd1c5]"
                    aria-hidden="true"
                  />
                  <span className="text-[12.5px] leading-[1.55] text-[#c3cbdc]">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={`mt-6 flex min-h-11 items-center justify-center rounded-[10px] text-[13px] font-semibold transition active:scale-[0.98] ${
                tier.featured
                  ? 'bg-[#4fd1c5] text-[#06231f] hover:brightness-110'
                  : 'border border-[rgba(255,255,255,0.16)] text-[#f3f6fb] hover:bg-[rgba(255,255,255,0.07)]'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[11.5px] text-[#7c88a3]">
        Universities, career centres, and outplacement teams —{' '}
        <Link href="/signin" className="text-[#4fd1c5] hover:underline">
          talk to us about Enterprise
        </Link>
        .
      </p>
    </section>
  )
}
