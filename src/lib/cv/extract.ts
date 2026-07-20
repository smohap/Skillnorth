/**
 * Turn an uploaded CV file into plain text.
 *
 * Extraction is kept separate from parsing for the same reason job fetching is
 * separate from job parsing: it fails in ways the user must be told about. A
 * scanned CV is a picture of a document, and no amount of prompting recovers text
 * that was never in the file — so we detect that case and say so, rather than
 * handing the model an empty string and returning a confidently blank profile.
 *
 * The format decisions (which types, how big, is the result usable) are pure
 * functions so they can be unit-tested without a real PDF on disk.
 */

import mammoth from 'mammoth'
import { extractText as extractPdfText } from 'unpdf'

export type CvFileKind = 'pdf' | 'docx' | 'text'

/** 10MB. Comfortably above any real CV, low enough to bound extraction cost. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * Below this many characters the extraction effectively failed — a scanned or
 * image-only PDF yields a handful of stray glyphs, not a document.
 */
const MIN_USABLE_CHARS = 200

export class CvExtractError extends Error {
  constructor(
    message: string,
    readonly kind: 'unsupported' | 'too_large' | 'empty' | 'unreadable',
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'CvExtractError'
  }
}

/**
 * Decide how to read a file, preferring the extension over the browser-supplied
 * MIME type — browsers disagree about DOCX in particular, and some send
 * `application/octet-stream` for a perfectly ordinary file.
 */
export function detectKind(filename: string, mimeType: string): CvFileKind {
  const ext = filename.toLowerCase().split('.').pop() ?? ''

  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf'
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx'
  if (ext === 'txt' || ext === 'md' || mimeType.startsWith('text/')) return 'text'

  if (ext === 'doc') {
    throw new CvExtractError(
      'Legacy .doc files aren’t supported. Re-save it as .docx or PDF and try again.',
      'unsupported',
    )
  }
  throw new CvExtractError('Upload a PDF, DOCX, or plain text file.', 'unsupported')
}

/** Collapse the ragged whitespace PDF extraction produces, keeping line breaks. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // Soft hyphens and the zero-width characters PDFs love to sprinkle in.
    .replace(/[­​-‍﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** True when extraction produced enough text to be worth sending to the model. */
export function isUsableText(text: string): boolean {
  return text.length >= MIN_USABLE_CHARS
}

export interface UploadedFile {
  filename: string
  mimeType: string
  bytes: ArrayBuffer
}

export async function extractCvText(file: UploadedFile): Promise<string> {
  if (file.bytes.byteLength === 0) {
    throw new CvExtractError('That file is empty.', 'empty')
  }
  if (file.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new CvExtractError('That file is larger than 10MB.', 'too_large')
  }

  const kind = detectKind(file.filename, file.mimeType)
  const raw = await readByKind(kind, file.bytes)
  const text = cleanText(raw)

  if (!isUsableText(text)) {
    throw new CvExtractError(
      kind === 'pdf'
        ? 'We couldn’t read any text from that PDF. It looks like a scan or an image — export a text-based PDF from Word or Google Docs, or paste your CV as text.'
        : 'We couldn’t read any text from that file.',
      'unreadable',
    )
  }
  return text
}

async function readByKind(kind: CvFileKind, bytes: ArrayBuffer): Promise<string> {
  try {
    switch (kind) {
      case 'pdf': {
        const { text } = await extractPdfText(new Uint8Array(bytes), { mergePages: true })
        return text
      }
      case 'docx': {
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) })
        return value
      }
      case 'text':
        return new TextDecoder().decode(bytes)
    }
  } catch (err) {
    // A corrupt or password-protected file lands here. The underlying message is
    // library jargon, so replace it — but keep the cause for server logs.
    throw new CvExtractError(
      'That file couldn’t be opened. It may be corrupted or password-protected.',
      'unreadable',
      { cause: err },
    )
  }
}
