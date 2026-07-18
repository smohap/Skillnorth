'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  GraduationCap,
  MessagesSquare,
  Send,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

/**
 * The 3D journey.
 *
 * Five stages of a job search arranged on a ring in real 3D space (perspective +
 * preserve-3d, not a fake drop-shadow). It auto-advances; the active card turns to
 * face you and lifts toward the camera while its neighbours recede and angle away.
 *
 * This is CSS 3D rather than WebGL on purpose: it's a few kilobytes, it composites
 * on the GPU, it never blocks the main thread, and it collapses to a clean static
 * row under prefers-reduced-motion — none of which a Three.js scene gives for free.
 */

interface Stage {
  n: string
  title: string
  line: string
  Icon: LucideIcon
  /** Each stage advances the palette from violet (start) to teal (offer). */
  color: string
}

const STAGES: Stage[] = [
  {
    n: '01',
    title: 'Skill up',
    line: 'Close the gaps that are holding you back, in ranked order.',
    Icon: GraduationCap,
    color: '#8b7fff',
  },
  {
    n: '02',
    title: 'Build the CV',
    line: 'A tailored, ATS-ready CV and cover letter for the exact role.',
    Icon: FileText,
    color: '#7f9bff',
  },
  {
    n: '03',
    title: 'Apply',
    line: 'Everything prepared and checked. You press send.',
    Icon: Send,
    color: '#5fbfd6',
  },
  {
    n: '04',
    title: 'Interview',
    line: 'Practise the questions this role is actually likely to ask.',
    Icon: MessagesSquare,
    color: '#54ccc9',
  },
  {
    n: '05',
    title: 'Get the job',
    line: 'Offer in hand — the whole point of all of it.',
    Icon: Trophy,
    color: '#4fd1c5',
  },
]

const ADVANCE_MS = 2800

export function Journey3D() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Honour reduced-motion: don't auto-advance, just show a readable static state.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || paused) return

    timer.current = setInterval(() => setActive((a) => (a + 1) % STAGES.length), ADVANCE_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused])

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex w-full items-center justify-center"
        style={{ height: 340, perspective: '1400px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="group"
        aria-label="How SkillNorth works, in five stages"
      >
        <div
          className="relative h-full w-full"
          style={{ transformStyle: 'preserve-3d', transform: 'rotateX(6deg)' }}
        >
          {STAGES.map((stage, i) => {
            // Signed distance from the active card, wrapped to the shorter way round.
            let offset = i - active
            if (offset > STAGES.length / 2) offset -= STAGES.length
            if (offset < -STAGES.length / 2) offset += STAGES.length

            const abs = Math.abs(offset)
            const isActive = offset === 0

            // The card turns toward the viewer, slides sideways, and the further ones
            // sink backward into the scene.
            const transform = [
              `translateX(${offset * 220}px)`,
              `translateZ(${-abs * 190}px)`,
              `rotateY(${offset * -34}deg)`,
              `scale(${isActive ? 1 : 0.86})`,
            ].join(' ')

            return (
              <button
                key={stage.n}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Stage ${stage.n}: ${stage.title}`}
                aria-current={isActive ? 'step' : undefined}
                tabIndex={isActive ? 0 : -1}
                className="absolute top-1/2 left-1/2 origin-center transition-[transform,opacity] duration-700 ease-out"
                style={{
                  width: 250,
                  height: 300,
                  marginLeft: -125,
                  marginTop: -150,
                  transform,
                  opacity: abs > 2 ? 0 : isActive ? 1 : 0.42,
                  zIndex: 10 - abs,
                  pointerEvents: abs > 2 ? 'none' : 'auto',
                }}
              >
                <JourneyCard stage={stage} isActive={isActive} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Progress path — the compass journey, flattened into a track */}
      <div className="mt-2 flex items-center gap-2" role="tablist" aria-label="Journey stages">
        {STAGES.map((stage, i) => {
          const done = i <= active
          return (
            <button
              key={stage.n}
              role="tab"
              aria-selected={i === active}
              aria-label={stage.title}
              onClick={() => setActive(i)}
              className="group flex items-center gap-2"
            >
              <span
                className="block h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: i === active ? 30 : 10,
                  background: done ? stage.color : 'rgba(255,255,255,0.16)',
                  boxShadow: i === active ? `0 0 12px ${stage.color}` : 'none',
                }}
              />
            </button>
          )
        })}
      </div>

      <p className="mt-4 h-5 text-center font-[family-name:var(--font-display)] text-[14px] font-semibold text-[#c3cbdc]">
        {STAGES[active].title}
        <span className="text-[#7c88a3]"> — {STAGES[active].line}</span>
      </p>
    </div>
  )
}

function JourneyCard({ stage, isActive }: { stage: Stage; isActive: boolean }) {
  const { Icon } = stage
  return (
    <div
      className="glass flex h-full w-full flex-col items-center justify-center gap-5 rounded-3xl p-6 text-center"
      style={{
        transformStyle: 'preserve-3d',
        borderColor: isActive
          ? `color-mix(in srgb, ${stage.color} 55%, transparent)`
          : undefined,
        boxShadow: isActive
          ? `0 24px 60px rgba(0,0,0,0.45), 0 0 40px color-mix(in srgb, ${stage.color} 22%, transparent), inset 0 1px 0 rgba(255,255,255,0.08)`
          : undefined,
      }}
    >
      {/* The icon floats above the card face in Z, so it reads as genuinely 3D. */}
      <span
        className="flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${stage.color} 30%, transparent), color-mix(in srgb, ${stage.color} 8%, transparent))`,
          border: `1px solid color-mix(in srgb, ${stage.color} 40%, transparent)`,
          transform: isActive ? 'translateZ(60px)' : 'translateZ(20px)',
          transition: 'transform 0.7s ease-out',
          color: stage.color,
        }}
      >
        <Icon size={34} strokeWidth={1.7} aria-hidden="true" />
      </span>

      <div style={{ transform: isActive ? 'translateZ(30px)' : 'none', transition: 'transform 0.7s ease-out' }}>
        <div
          className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em]"
          style={{ color: stage.color }}
        >
          {stage.n}
        </div>
        <div className="mt-1.5 font-[family-name:var(--font-display)] text-[19px] font-semibold text-[#f3f6fb]">
          {stage.title}
        </div>
      </div>
    </div>
  )
}
