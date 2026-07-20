'use client'

/**
 * The two halves of CV import: choosing a file, and reviewing what came back.
 *
 * The review step is not a formality. A parser reading a two-column PDF will
 * occasionally attach a bullet to the wrong role, and the user is the only one who
 * can catch that — so every entry arrives ticked but visible, and nothing is written
 * until they confirm.
 */

import { useActionState, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Upload } from 'lucide-react'
import {
  confirmImportAction,
  type ImportActionResult,
} from '@/app/(app)/profile/import/actions'
import type { ParsedCv } from '@/lib/cv/parse'
import { allKeys } from '@/lib/cv/import'

const ACCEPT = '.pdf,.docx,.txt,.md'

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export function CvUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function send(file: File) {
    setBusy(true)
    setError(null)

    const body = new FormData()
    body.append('file', file)

    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', body })
      const data = (await res.json()) as { uploadId?: string; error?: string }

      if (!res.ok || !data.uploadId) {
        setError(data.error ?? 'That upload didn’t work. Try again.')
        return
      }
      router.push(`/profile/import?upload=${data.uploadId}`)
    } catch {
      setError('We couldn’t reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void send(file)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition ${
          dragging
            ? 'border-[#4fd1c5] bg-[rgba(79,209,197,0.08)]'
            : 'border-[rgba(255,255,255,0.18)]'
        }`}
      >
        {busy ? (
          <>
            <Loader2 size={26} className="animate-spin text-[#4fd1c5]" aria-hidden="true" />
            <p className="text-[13px] text-[#c3cbdc]">Reading your CV…</p>
            <p className="text-[11.5px] text-[#7c88a3]">
              This takes a few seconds. Don’t close the tab.
            </p>
          </>
        ) : (
          <>
            <Upload size={26} className="text-[#4fd1c5]" aria-hidden="true" />
            <div>
              <p className="text-[13.5px] font-semibold">Drop your CV here</p>
              <p className="mt-1 text-[11.5px] text-[#7c88a3]">
                PDF, DOCX, or plain text — up to 10MB. Nothing is saved to your profile until
                you review it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-[10px] bg-[#4fd1c5] px-5 text-[13px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98]"
            >
              Choose a file
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void send(file)
            // Let the same file be re-picked after an error.
            e.target.value = ''
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[10px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.12)] px-3.5 py-2.5 text-[12px] leading-[1.6] text-[#ff9b9b]"
        >
          {error}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

const EMPTY: ImportActionResult = {}

export function CvReview({ uploadId, parsed }: { uploadId: string; parsed: ParsedCv }) {
  const [state, formAction, pending] = useActionState(confirmImportAction, EMPTY)
  // Everything starts ticked: the common case is "yes, all of it", and a user who
  // must tick 40 boxes to import their own CV would reasonably give up.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allKeys(parsed)))

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })

  const total = allKeys(parsed).length
  const allOn = selected.size === total

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="uploadId" value={uploadId} />
      {[...selected].map((key) => (
        <input key={key} type="hidden" name="keys" value={key} />
      ))}

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] px-4 py-3">
        <p className="text-[12.5px] text-[#c3cbdc]">
          <span className="tnum font-semibold">{selected.size}</span> of {total} entries
          selected. Anything you already have is skipped automatically.
        </p>
        <button
          type="button"
          onClick={() => setSelected(allOn ? new Set() : new Set(allKeys(parsed)))}
          className="shrink-0 text-[12px] font-semibold text-[#4fd1c5] hover:underline"
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {parsed.experiences.length > 0 && (
        <Section title="Experience" count={parsed.experiences.length}>
          {parsed.experiences.map((exp, i) => (
            <Entry
              key={`experience:${i}`}
              entryKey={`experience:${i}`}
              checked={selected.has(`experience:${i}`)}
              onToggle={toggle}
              title={exp.title}
              sub={`${exp.company}${exp.location ? ` · ${exp.location}` : ''} · ${
                exp.startDate || '—'
              } to ${exp.isCurrent ? 'present' : exp.endDate || '—'}`}
              bullets={exp.bullets}
            />
          ))}
        </Section>
      )}

      {parsed.education.length > 0 && (
        <Section title="Education" count={parsed.education.length}>
          {parsed.education.map((edu, i) => (
            <Entry
              key={`education:${i}`}
              entryKey={`education:${i}`}
              checked={selected.has(`education:${i}`)}
              onToggle={toggle}
              title={`${edu.qualification}${edu.field ? `, ${edu.field}` : ''}`}
              sub={`${edu.institution}${edu.endDate ? ` · ${edu.endDate}` : ''}`}
            />
          ))}
        </Section>
      )}

      {parsed.certifications.length > 0 && (
        <Section title="Certifications" count={parsed.certifications.length}>
          {parsed.certifications.map((cert, i) => (
            <Entry
              key={`certification:${i}`}
              entryKey={`certification:${i}`}
              checked={selected.has(`certification:${i}`)}
              onToggle={toggle}
              title={cert.name}
              sub={[cert.issuer, cert.issued].filter(Boolean).join(' · ') || 'Issuer not stated'}
            />
          ))}
        </Section>
      )}

      {parsed.skills.length > 0 && (
        <Section title="Skills" count={parsed.skills.length}>
          <div className="flex flex-wrap gap-2">
            {parsed.skills.map((skill, i) => {
              const key = `skill:${i}`
              const on = selected.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(key)}
                  className={`min-h-9 rounded-full border px-3.5 text-[12.5px] transition ${
                    on
                      ? 'border-[#4fd1c5] bg-[rgba(79,209,197,0.16)] text-[#f3f6fb]'
                      : 'border-[rgba(255,255,255,0.12)] text-[#7c88a3]'
                  }`}
                >
                  {skill.name}
                  {skill.years != null && (
                    <span className="ml-1.5 font-[family-name:var(--font-mono)] text-[10px] opacity-70">
                      {skill.years}y
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-[10px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.12)] px-3.5 py-2.5 text-[12px] text-[#ff9b9b]"
        >
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(10,14,26,0.92)] py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending || selected.size === 0}
          className="min-h-11 rounded-[10px] bg-[#4fd1c5] px-5 text-[13px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? 'Importing…' : `Import ${selected.size} ${selected.size === 1 ? 'entry' : 'entries'}`}
        </button>
        <a href="/profile" className="text-[12.5px] text-[#7c88a3] hover:text-[#c3cbdc]">
          Skip for now
        </a>
      </div>
    </form>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="panel p-5">
      <h2 className="mb-3.5 flex items-center gap-2 font-[family-name:var(--font-display)] text-[15px] font-semibold">
        {title}
        <span className="tnum font-[family-name:var(--font-mono)] text-[11px] text-[#7c88a3]">
          {count}
        </span>
      </h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function Entry({
  entryKey,
  checked,
  onToggle,
  title,
  sub,
  bullets,
}: {
  entryKey: string
  checked: boolean
  onToggle: (key: string) => void
  title: string
  sub: string
  bullets?: string[]
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
        checked
          ? 'border-[rgba(79,209,197,0.35)] bg-[rgba(79,209,197,0.06)]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] opacity-60'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(entryKey)}
        className="mt-0.5 size-4 shrink-0 accent-[#4fd1c5]"
      />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11.5px] text-[#7c88a3]">{sub}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {bullets.map((text, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-[1.6] text-[#c3cbdc]">
                <span className="text-[#4fd1c5]">·</span>
                {text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </label>
  )
}

/** Shown when a previous upload is still parsing or failed. */
export function UploadStatusNotice({ status, error }: { status: string; error?: string }) {
  if (status === 'failed') {
    return (
      <p
        role="alert"
        className="flex items-start gap-2.5 rounded-2xl border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.12)] px-4 py-3.5 text-[12.5px] leading-[1.6] text-[#ff9b9b]"
      >
        <FileText size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {error ?? 'That CV couldn’t be read.'}
      </p>
    )
  }
  return (
    <p className="rounded-2xl border border-[rgba(255,255,255,0.12)] px-4 py-3.5 text-[12.5px] text-[#7c88a3]">
      That upload is still being read. Refresh in a moment.
    </p>
  )
}
