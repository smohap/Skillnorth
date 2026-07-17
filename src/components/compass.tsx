import type { Band } from '@/lib/types'

/**
 * The compass is the product's core idea, not its decoration.
 *
 * A match score is a bearing: the needle swings to your fit and takes its colour
 * from the band. The mark in the nav and the score on a job card are the same
 * object at different sizes, which is why "how good is this match" never needs a
 * legend — you have already learned to read it.
 */

export const BAND_COLOR: Record<Band, string> = {
  ready: '#4fd1c5',
  confirm: '#ffd166',
  improve: '#f5a623',
  filtered: '#ff6b6b',
}

export const BAND_LABEL: Record<Band, string> = {
  ready: 'Ready to send',
  confirm: 'Confirm to prepare',
  improve: 'Close the gaps first',
  filtered: 'Filtered out',
}

export function bandFor(score: number): Band {
  if (score >= 90) return 'ready'
  if (score >= 80) return 'confirm'
  if (score >= 60) return 'improve'
  return 'filtered'
}

/** The brand mark. Decorative wherever a text label sits beside it. */
export function CompassMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="20" r="18" fill="none" stroke="#4fd1c5" strokeWidth="2" opacity="0.5" />
      <path d="M20 6 L24 20 L20 34 L16 20 Z" fill="#4fd1c5" />
      <path d="M20 6 L24 20 L20 20 Z" fill="#8b7fff" />
      <circle cx="20" cy="20" r="3" fill="#0a0f1e" />
    </svg>
  )
}

/**
 * A match score drawn as a compass bearing.
 *
 * The arc sweeps to the score and the needle points at it. Colour comes from the
 * band, so the same 87 reads identically here, on a job row, and in the tracker.
 */
export function CompassScore({
  score,
  size = 64,
  showLabel = true,
}: {
  score: number
  size?: number
  showLabel?: boolean
}) {
  const band = bandFor(score)
  const color = BAND_COLOR[band]

  const r = 26
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  // 0 → −135°, 100 → +135°. A 270° sweep reads as a dial; a full circle reads as a
  // progress ring, which is a different (and wrong) metaphor for a bearing.
  const angle = -135 + (score / 100) * 270

  return (
    <div
      className="relative flex-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${score} out of 100. ${BAND_LABEL[band]}.`}
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3.5"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          opacity="0.9"
        />
        <g transform={`rotate(${angle} 32 32)`}>
          <path d="M32 13 L35 32 L32 37 L29 32 Z" fill={color} />
          <path d="M32 51 L35 32 L32 27 L29 32 Z" fill="rgba(255,255,255,0.18)" />
        </g>
        <circle cx="32" cy="32" r="3" fill="#0a0f1e" stroke={color} strokeWidth="1.2" />
      </svg>
      {showLabel && (
        <div
          className="tnum absolute inset-0 flex items-center justify-center font-bold"
          style={{
            color,
            fontFamily: 'var(--font-mono)',
            fontSize: size * 0.22,
            // Keep the number clear of the needle hub.
            paddingTop: size * 0.42,
          }}
        >
          {score}
        </div>
      )}
    </div>
  )
}

/** Compact status pill. Text + colour, never colour alone. */
export function BandPill({ band }: { band: Band }) {
  const color = BAND_COLOR[band]
  return (
    <span
      className="inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        fontFamily: 'var(--font-display)',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {BAND_LABEL[band]}
    </span>
  )
}
