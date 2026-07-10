import type { GenerateRequest, SSEChunk } from './index.js'

export async function* generateOllama(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const { connection, preset, messages } = req

  const apiUrl = connection.apiUrl.replace(/\/$/, '') || 'http://localhost:11434'
  const endpoint = `${apiUrl}/api/chat`

  const mappedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const body: Record<string, unknown> = {
    model: connection.model,
    messages: mappedMessages,
    stream: preset.stream !== false,
    options: {
      temperature: preset.temperature ?? 0.8,
      top_p: preset.top_p ?? 0.9,
      top_k: preset.top_k ?? 40,
      num_predict: preset.max_tokens ?? 2048,
      frequency_penalty: preset.frequency_penalty ?? 0,
      presence_penalty: preset.presence_penalty ?? 0,
      repeat_penalty: preset.repetition_penalty ?? 1.1,
    },
  }

  if (preset.stop?.length) {
    body.options.stop = preset.stop
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `Ollama API returned ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMsg = errorJson.error || errorMsg
    } catch {
      if (errorText) errorMsg = errorText
    }
    yield { type: 'error', message: errorMsg }
    return
  }

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

    // Ollama sends newline-delimited JSON objects
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const parsed = JSON.parse(trimmed)
        if (parsed.message?.content) {
          yield { type: 'token', content: parsed.message.content }
        }
        if (parsed.done) {
          yield { type: 'done' }
          return
        }
      } catch {
        // skip
      }
    }
  }

  yield { type: 'done' }
}