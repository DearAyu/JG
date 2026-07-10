import type { GenerateRequest, SSEChunk } from './index.js'

export async function* generateClaude(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const { connection, preset, messages } = req

  const apiUrl = connection.apiUrl.replace(/\/$/, '') || 'https://api.anthropic.com'
  const endpoint = `${apiUrl}/v1/messages`

  // Claude requires separating system messages from conversation
  const systemMessages = messages.filter((m) => m.role === 'system')
  const convMessages = messages.filter((m) => m.role !== 'system')

  const systemText = systemMessages.map((m) => m.content).join('\n\n')

  const mappedMessages = convMessages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const body: Record<string, unknown> = {
    model: connection.model,
    messages: mappedMessages,
    max_tokens: preset.max_tokens ?? 2048,
    temperature: preset.temperature ?? 1.0,
    stream: preset.stream !== false,
  }

  if (systemText) {
    body.system = systemText
  }

  if (preset.top_p) body.top_p = preset.top_p
  if (preset.stop?.length) body.stop_sequences = preset.stop

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  if (connection.apiKey) {
    headers['x-api-key'] = connection.apiKey
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `Claude API returned ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMsg = errorJson.error?.message || errorMsg
    } catch {
      if (errorText) errorMsg = errorText
    }
    yield { type: 'error', message: errorMsg }
    return
  }

  // Non-streaming
  if (!preset.stream || preset.stream === false) {
    const data = await response.json()
    const content = data.content?.[0]?.text
    if (content) {
      yield { type: 'token', content }
    }
    yield { type: 'done' }
    return
  }

  // Streaming via SSE
  if (!response.body) {
    yield { type: 'error', message: 'No response body' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    let eventType = ''
    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('event: ')) {
        eventType = trimmed.slice(7)
        continue
      }

      if (!trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      try {
        const parsed = JSON.parse(data)

        if (eventType === 'content_block_delta') {
          const delta = parsed.delta
          if (delta?.type === 'text_delta' && delta.text) {
            yield { type: 'token', content: delta.text }
          }
        } else if (eventType === 'message_stop') {
          yield { type: 'done' }
          return
        } else if (eventType === 'error') {
          yield { type: 'error', message: parsed.error?.message || 'Claude stream error' }
          return
        }
      } catch {
        // skip
      }
    }
  }

  yield { type: 'done' }
}