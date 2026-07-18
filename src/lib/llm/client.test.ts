import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { LlmParseError, parseJsonWithSchema } from './client'

const schema = z.object({ score: z.number(), rationale: z.string() })

describe('parseJsonWithSchema', () => {
  it('parses clean JSON', () => {
    const result = parseJsonWithSchema('{"score":80,"rationale":"solid"}', schema)
    expect(result.score).toBe(80)
  })

  it('recovers JSON wrapped in a ```json fence', () => {
    const text = 'Here is my assessment:\n```json\n{"score":75,"rationale":"ok"}\n```\nHope that helps.'
    expect(parseJsonWithSchema(text, schema).score).toBe(75)
  })

  it('recovers JSON surrounded by prose', () => {
    const text = 'The score is {"score":60,"rationale":"borderline"} based on the rubric.'
    expect(parseJsonWithSchema(text, schema).rationale).toBe('borderline')
  })

  it('throws on output that is not JSON at all', () => {
    expect(() => parseJsonWithSchema('I could not complete this task.', schema)).toThrow(
      LlmParseError,
    )
  })

  it('throws when JSON is valid but the wrong shape', () => {
    // A schema mismatch means the prompt is wrong; surfacing it beats silent coercion.
    expect(() => parseJsonWithSchema('{"grade":"A"}', schema)).toThrow(LlmParseError)
  })

  it('keeps the raw output on the error, for debugging', () => {
    try {
      parseJsonWithSchema('not json', schema)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(LlmParseError)
      expect((err as LlmParseError).raw).toBe('not json')
    }
  })
})
