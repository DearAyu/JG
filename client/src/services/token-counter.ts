import { getEncoding } from 'js-tiktoken'
import type { TiktokenEncoding } from 'js-tiktoken'

let encoder: ReturnType<typeof getEncoding> | null = null
let currentEncoding: TiktokenEncoding = 'o200k_base'

function getEncoder(encoding: TiktokenEncoding = 'o200k_base'): ReturnType<typeof getEncoding> {
  if (encoder && currentEncoding === encoding) return encoder
  encoder = getEncoding(encoding)
  currentEncoding = encoding
  return encoder
}

function countTokens(text: string): number {
  if (!text) return 0
  try {
    const enc = getEncoder()
    return enc.encode(text).length
  } catch {
    return Math.ceil(text.length / 4)
  }
}

function countMessageTokens(content: string, _role?: string): number {
  const roleOverhead = 4
  return countTokens(content) + roleOverhead
}

function countMessagesTokens(messages: { role: string; content: string }[]): number {
  let total = 3
  for (const msg of messages) {
    total += countMessageTokens(msg.content, msg.role)
  }
  return total
}

export const tokenCounter = {
  count: countTokens,
  countMessage: countMessageTokens,
  countMessages: countMessagesTokens,
}

export { countTokens, countMessageTokens, countMessagesTokens }