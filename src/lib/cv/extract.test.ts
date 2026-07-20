import { describe, expect, it } from 'vitest'
import { CvExtractError, cleanText, detectKind, isUsableText } from './extract'

describe('detectKind', () => {
  it('recognises the formats a CV actually arrives in', () => {
    expect(detectKind('cv.pdf', 'application/pdf')).toBe('pdf')
    expect(
      detectKind(
        'cv.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe('docx')
    expect(detectKind('cv.txt', 'text/plain')).toBe('text')
  })

  it('trusts the extension when the browser sends a useless MIME type', () => {
    // Windows browsers routinely send octet-stream for DOCX.
    expect(detectKind('resume.docx', 'application/octet-stream')).toBe('docx')
    expect(detectKind('resume.pdf', '')).toBe('pdf')
  })

  it('is case-insensitive about extensions', () => {
    expect(detectKind('RESUME.PDF', '')).toBe('pdf')
  })

  it('tells the user what to do about a legacy .doc rather than failing vaguely', () => {
    try {
      detectKind('old.doc', 'application/msword')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(CvExtractError)
      expect((err as CvExtractError).kind).toBe('unsupported')
      expect((err as CvExtractError).message).toContain('.docx')
    }
  })

  it('rejects a format that is not a document at all', () => {
    expect(() => detectKind('headshot.png', 'image/png')).toThrow(CvExtractError)
  })
})

describe('cleanText', () => {
  it('collapses the ragged spacing PDF extraction produces', () => {
    expect(cleanText('Senior   Engineer  \n\n\n\n  Acme  Corp')).toBe(
      'Senior Engineer\n\nAcme Corp',
    )
  })

  it('strips the invisible characters PDFs embed mid-word', () => {
    // A soft hyphen inside "Engineer" would otherwise break skill matching.
    expect(cleanText('Engi­neer')).toBe('Engineer')
    expect(cleanText('Data​Science')).toBe('DataScience')
  })

  it('normalises Windows line endings', () => {
    expect(cleanText('one\r\ntwo')).toBe('one\ntwo')
  })

  it('keeps paragraph breaks, because they separate roles', () => {
    expect(cleanText('Role A\n\nRole B')).toContain('\n\n')
  })
})

describe('isUsableText', () => {
  it('rejects the handful of stray glyphs a scanned PDF yields', () => {
    expect(isUsableText('Page 1 of 2')).toBe(false)
  })

  it('accepts a document with real content', () => {
    expect(isUsableText('x'.repeat(200))).toBe(true)
  })
})
