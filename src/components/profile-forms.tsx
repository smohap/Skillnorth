'use client'

import { useActionState, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import {
  addCertificationAction,
  addEducationAction,
  addExperienceAction,
  addSkillAction,
  deleteEntryAction,
  updateBasicsAction,
  type ActionResult,
} from '@/app/(app)/profile/actions'

const EMPTY: ActionResult = {}

const inputClass =
  'min-h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.14)] bg-[rgba(0,0,0,0.25)] px-3.5 text-[13.5px] text-[#f3f6fb] placeholder:text-[#5a647d] focus:border-[#4fd1c5]'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11.5px] font-medium text-[#c3cbdc]">{label}</span>
      {children}
    </label>
  )
}

function Feedback({ state }: { state: ActionResult }) {
  if (!state.error) return null
  return (
    <p
      role="alert"
      className="rounded-[10px] border border-[rgba(255,107,107,0.3)] bg-[rgba(255,107,107,0.12)] px-3 py-2 text-[12px] text-[#ff9b9b]"
    >
      {state.error}
    </p>
  )
}

/**
 * A disclosure that holds an add-form.
 *
 * Collapsed by default so a profile with plenty of entries stays readable — the
 * list is what you came to see; the form is what you occasionally need.
 */
function AddPanel({
  label,
  children,
  open,
  onToggle,
}: {
  label: string
  children: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 items-center gap-2 rounded-[10px] border border-dashed border-[rgba(255,255,255,0.18)] px-3.5 text-[12.5px] font-semibold text-[#4fd1c5] transition hover:bg-[rgba(255,255,255,0.04)]"
      >
        {open ? <X size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
        {open ? 'Cancel' : label}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.18)] p-4">
          {children}
        </div>
      )}
    </div>
  )
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-[10px] bg-[#4fd1c5] px-5 text-[13px] font-semibold text-[#06231f] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? 'Saving…' : label}
    </button>
  )
}

/** Delete control. A plain form post, so it works without client JS. */
export function DeleteButton({ table, id, label }: { table: string; id: string; label: string }) {
  return (
    <form action={deleteEntryAction}>
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Remove ${label}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7c88a3] transition hover:bg-[rgba(255,107,107,0.14)] hover:text-[#ff6b6b]"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </form>
  )
}

export function AddSkillForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addSkillAction, EMPTY)
  const ref = useRef<HTMLFormElement>(null)
  if (state.ok && ref.current) ref.current.reset()

  return (
    <AddPanel label="Add a skill" open={open} onToggle={() => setOpen(!open)}>
      <form ref={ref} action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Skill">
            <input name="name" required placeholder="e.g. Terraform" className={inputClass} />
          </Field>
          <Field label="Category (optional)">
            <input name="category" placeholder="e.g. tool" className={inputClass} />
          </Field>
          <Field label="Level (optional)">
            <select name="level" className={inputClass} defaultValue="">
              <option value="">Not specified</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </Field>
          <Field label="Years (optional)">
            <input name="years" type="number" min="0" max="60" className={inputClass} />
          </Field>
        </div>
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Add skill" />
      </form>
    </AddPanel>
  )
}

export function AddCertificationForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addCertificationAction, EMPTY)

  return (
    <AddPanel label="Add a certification" open={open} onToggle={() => setOpen(!open)}>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Certification">
            <input
              name="name"
              required
              placeholder="e.g. Terraform Associate"
              className={inputClass}
            />
          </Field>
          <Field label="Issuer">
            <input name="issuer" required placeholder="e.g. HashiCorp" className={inputClass} />
          </Field>
          <Field label="Issued (optional)">
            <input name="issued" placeholder="YYYY-MM" className={inputClass} />
          </Field>
          <Field label="Expires (optional)">
            <input name="expires" placeholder="YYYY-MM" className={inputClass} />
          </Field>
        </div>
        <Field label="Credential ID (optional)">
          <input name="credentialId" className={inputClass} />
        </Field>
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Add certification" />
      </form>
    </AddPanel>
  )
}

export function AddExperienceForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addExperienceAction, EMPTY)

  return (
    <AddPanel label="Add a role" open={open} onToggle={() => setOpen(!open)}>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job title">
            <input name="title" required className={inputClass} />
          </Field>
          <Field label="Company">
            <input name="company" required className={inputClass} />
          </Field>
          <Field label="Location (optional)">
            <input name="location" className={inputClass} />
          </Field>
          <Field label="Started">
            <input name="startDate" placeholder="YYYY-MM" className={inputClass} />
          </Field>
          <Field label="Ended (leave blank if current)">
            <input name="endDate" placeholder="YYYY-MM" className={inputClass} />
          </Field>
          <label className="flex items-center gap-2.5 self-end pb-2.5">
            <input type="checkbox" name="isCurrent" className="accent-[#4fd1c5]" />
            <span className="text-[12.5px] text-[#c3cbdc]">This is my current role</span>
          </label>
        </div>
        <Field label="Achievements — one per line">
          <textarea
            name="bullets"
            rows={4}
            placeholder={
              'Rebuilt the reporting pipeline, cutting nightly runtime by 40%\nLed migration of 3 legacy marts onto Snowflake'
            }
            className={`${inputClass} min-h-[110px] py-3 leading-[1.6]`}
          />
        </Field>
        <p className="text-[11px] leading-[1.6] text-[#7c88a3]">
          These are the most valuable lines on your profile. Every bullet SkillNorth writes on a
          tailored CV has to cite one of them — so anything not captured here can never appear.
        </p>
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Add role" />
      </form>
    </AddPanel>
  )
}

export function AddEducationForm() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(addEducationAction, EMPTY)

  return (
    <AddPanel label="Add a qualification" open={open} onToggle={() => setOpen(!open)}>
      <form action={action} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Qualification">
            <input
              name="qualification"
              required
              placeholder="e.g. Bachelor of Science"
              className={inputClass}
            />
          </Field>
          <Field label="Institution">
            <input name="institution" required className={inputClass} />
          </Field>
          <Field label="Field (optional)">
            <input name="field" placeholder="e.g. Statistics" className={inputClass} />
          </Field>
          <Field label="Finished (optional)">
            <input name="endDate" placeholder="YYYY" className={inputClass} />
          </Field>
        </div>
        <Feedback state={state} />
        <SubmitButton pending={pending} label="Add qualification" />
      </form>
    </AddPanel>
  )
}

export function BasicsForm({
  defaults,
}: {
  defaults: { fullName: string; headline?: string; location?: string; phone?: string; summary?: string }
}) {
  const [state, action, pending] = useActionState(updateBasicsAction, EMPTY)

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <input name="fullName" required defaultValue={defaults.fullName} className={inputClass} />
        </Field>
        <Field label="Headline">
          <input
            name="headline"
            defaultValue={defaults.headline}
            placeholder="e.g. Analytics Engineer"
            className={inputClass}
          />
        </Field>
        <Field label="Location">
          <input
            name="location"
            defaultValue={defaults.location}
            placeholder="e.g. Auckland, New Zealand"
            className={inputClass}
          />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={defaults.phone} className={inputClass} />
        </Field>
      </div>
      <Field label="Summary">
        <textarea
          name="summary"
          rows={3}
          defaultValue={defaults.summary}
          placeholder="A sentence or two on what you do and what you're aiming at."
          className={`${inputClass} min-h-[86px] py-3 leading-[1.6]`}
        />
      </Field>
      <Feedback state={state} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} label="Save details" />
        {state.ok && <span className="text-[12px] text-[#4fd1c5]">Saved</span>}
      </div>
    </form>
  )
}
