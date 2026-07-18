/**
 * The single seam through which SkillNorth talks to a language model.
 *
 * No feature module imports the Anthropic SDK directly. They call this. That keeps
 * the model swappable, keeps every call in one place for caching and cost control,
 * and — most usefully — lets the pure engine stay pure: the model is called here,
 * at the edge, and its result is handed to `scoreMatch` as a plain value.
 *
 * When no API key is present the client reports itself unconfigured rather than
 * throwing, so the app runs in demo mode out of the box.
 */

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

/** Sonnet 5: strong at long-context structured extraction and instruction-following. */
const MODEL = 'claude-sonnet-5'
const MAX_TOKENS = 4096

let client: Anthropic | null = null

export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LlmNotConfiguredError()
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set. The app runs in demo mode until it is.')
    this.name = 'LlmNotConfiguredError'
  }
}

export class LlmParseError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message)
    this.name = 'LlmParseError'
  }
}

export interface CachedBlock {
  /** Text to cache across calls — the candidate's profile is the obvious one. */
  text: string
}

export interface CompleteJsonArgs<T> {
  system: string
  /** Long, stable context to cache. Anthropic prompt caching cuts the repeat cost. */
  cached?: CachedBlock
  user: string
  schema: z.ZodType<T>
  /** Lower for extraction and judging, higher only where phrasing variety helps. */
  temperature?: number
}

/**
 * Ask the model for JSON matching a schema, and validate it before returning.
 *
 * The retry is deliberately narrow: models occasionally wrap JSON in prose or a
 * fenced block, so we extract and re-validate once before giving up. We do not
 * retry on a genuine schema mismatch — that means the prompt is wrong, and hiding
 * it behind retries just burns tokens.
 */
export async function completeJson<T>(args: CompleteJsonArgs<T>): Promise<T> {
  const { system, cached, user, schema, temperature = 0.2 } = args

  const systemBlocks: Anthropic.TextBlockParam[] = [{ type: 'text', text: system }]
  if (cached) {
    systemBlocks.push({
      type: 'text',
      text: cached.text,
      cache_control: { type: 'ephemeral' },
    })
  }

  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature,
    system: systemBlocks,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return parseJsonWithSchema(text, schema)
}

/** Exported for unit testing against recorded and malformed model output. */
export function parseJsonWithSchema<T>(text: string, schema: z.ZodType<T>): T {
  const candidate = extractJson(text)
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch {
    throw new LlmParseError('Model did not return valid JSON.', text)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new LlmParseError(
      `Model JSON did not match the expected shape: ${result.error.message}`,
      text,
    )
  }
  return result.data
}

/** Pull JSON out of prose or a ```json fence, if the model wrapped it. */
function extractJson(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) return fence[1].trim()

  const firstBrace = trimmed.search(/[[{]/)
  const lastBrace = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}
