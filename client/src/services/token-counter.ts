const AVG_CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN)
}

function estimateMessageTokens(content: string, _role?: string): number {
  const roleOverhead = 4
  return estimateTokens(content) + roleOverhead
}

function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
  let total = 3
  for (const msg of messages) {
    total += estimateMessageTokens(msg.content, msg.role)
  }
  return total
}

export const tokenCounter = {
  estimate: estimateTokens,
  estimateMessage: estimateMessageTokens,
  estimateMessages: estimateMessagesTokens,
  AVG_CHARS_PER_TOKEN,
}