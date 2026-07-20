import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { CvReview, CvUploader, UploadStatusNotice } from '@/components/cv-import'
import { getUpload, type CvUpload } from '@/lib/db/cv'
import { NotConfiguredError } from '@/lib/db/profile'
import { countEntries } from '@/lib/cv/parse'

/**
 * Import a CV.
 *
 * One page, two states, keyed off `?upload=` — pick a file, then review what the
 * parser found. Keeping the review on a URL rather than in component state means a
 * refresh (or a closed laptop) doesn't lose a parse that cost a model call.
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>
}) {
  const { upload: uploadId } = await searchParams

  let upload: CvUpload | null = null
  let error: string | null = null

  if (uploadId) {
    try {
      upload = await getUpload(uploadId)
    } catch (err) {
      error =
        err instanceof NotConfiguredError
          ? 'Connect Supabase before importing a CV.'
          : err instanceof Error
            ? err.message
            : 'Could not load that upload.'
    }
  }

  return (
    <>
      <PageHeader title="Import your CV" sub="Read it once, review it, then it's yours to edit" />

      <div className="animate-fade-up flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <Link
          href="/profile"
          className="flex w-fit items-center gap-1.5 text-[12.5px] text-[#7c88a3] transition hover:text-[#c3cbdc]"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to profile
        </Link>

        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.1)] px-4 py-3.5 text-[13px] text-[#f5a623]"
          >
            {error}
          </p>
        )}

        {!uploadId && !error && (
          <>
            <p className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-4 py-3.5 text-[12.5px] leading-[1.6] text-[#c3cbdc]">
              Uploading a CV fills in your profile in one go instead of typing each role by hand.
              SkillNorth transcribes what the document says — it won’t rewrite your achievements
              or invent dates. You review everything before it’s saved.
            </p>
            <CvUploader />
          </>
        )}

        {upload?.status === 'parsed' && (
          <>
            <p className="text-[12.5px] text-[#7c88a3]">
              Found <span className="tnum font-semibold text-[#c3cbdc]">{countEntries(upload.parsed)}</span>{' '}
              entries in <span className="text-[#c3cbdc]">{upload.filename}</span>. Untick anything
              that came out wrong — you can edit the rest on your profile afterwards.
            </p>
            <CvReview uploadId={upload.id} parsed={upload.parsed} />
          </>
        )}

        {upload && upload.status !== 'parsed' && upload.status !== 'imported' && (
          <>
            <UploadStatusNotice status={upload.status} error={upload.error} />
            <CvUploader />
          </>
        )}

        {upload?.status === 'imported' && (
          <p className="rounded-2xl border border-[rgba(79,209,197,0.28)] bg-[rgba(79,209,197,0.1)] px-4 py-3.5 text-[13px] text-[#c3cbdc]">
            That CV has already been imported.{' '}
            <Link href="/profile" className="font-semibold text-[#4fd1c5] hover:underline">
              View your profile
            </Link>
            .
          </p>
        )}

        {uploadId && !upload && !error && (
          <>
            <p className="rounded-2xl border border-[rgba(255,255,255,0.12)] px-4 py-3.5 text-[12.5px] text-[#7c88a3]">
              We couldn’t find that upload. Try again.
            </p>
            <CvUploader />
          </>
        )}
      </div>
    </>
  )
}
