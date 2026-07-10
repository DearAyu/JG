import type { GenerateRequest, SSEChunk } from './index.js'

export async function* generateKobold(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const { connection, preset, messages } = req

  const apiUrl = connection.apiUrl.replace(/\/$/, '') || 'http://localhost:5001'
  const endpoint = `${apiUrl}/api/v1/generate`

  // KoboldAI uses a single prompt string, not chat format
  // We need to convert messages to a text prompt
  const promptParts: string[] = []
  for (const msg of messages) {
    if (msg.role === 'system') {
      promptParts.push(`[System: ${msg.content}]`)
    } else if (msg.role === 'user') {
      promptParts.push(`User: ${msg.content}`)
    } else if (msg.role === 'assistant') {
      promptParts.push(`${connection.model || 'AI'}: ${msg.content}`)
    }
  }
  promptParts.push(`${connection.model || 'AI'}:`)

  const body: Record<string, unknown> = {
    prompt: promptParts.join('\n'),
    max_context_length: 8192,
    max_length: preset.max_tokens ?? 2048,
    temperature: preset.temperature ?? 1.0,
    top_p: preset.top_p ?? 1.0,
    top_k: preset.top_k ?? 0,
    rep_penalty: preset.repetition_penalty ?? 1.1,
  }

  if (preset.stop?.length) {
    body.stop_sequence = preset.stop
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `KoboldAI API returned ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMsg = errorJson.detail || errorJson.error || errorMsg
    } catch {
      if (errorText) errorMsg = errorText
    }
    yield { type: 'error', message: errorMsg }
    return
  }

  const data = await response.json()
  const content = data.results?.[0]?.text
  if (content) {
    yield { type: 'token', content }
  }
  yield { type: 'done' }
}