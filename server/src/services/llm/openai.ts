import type { GenerateRequest, SSEChunk } from './index.js'

export async function* generateOpenAI(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const { connection, preset, messages } = req

  const apiUrl = connection.apiUrl.replace(/\/$/, '')
  const endpoint = `${apiUrl}/chat/completions`

  const mappedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const body: Record<string, unknown> = {
    model: connection.model,
    messages: mappedMessages,
    temperature: preset.temperature ?? 1.0,
    max_tokens: preset.max_tokens ?? 2048,
    top_p: preset.top_p ?? 1.0,
    frequency_penalty: preset.frequency_penalty ?? 0,
    presence_penalty: preset.presence_penalty ?? 0,
    stop: preset.stop?.length ? preset.stop : undefined,
    stream: preset.stream !== false,
  }

  if (preset.top_k && preset.top_k > 0) {
    body.top_k = preset.top_k
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (connection.apiKey) {
    headers.Authorization = `Bearer ${connection.apiKey}`
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `API returned ${response.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMsg = errorJson.error?.message || errorMsg
    } catch {
      if (errorText) errorMsg = errorText
    }
    yield { type: 'error', message: errorMsg }
    return
  }

  if (!preset.stream || preset.stream === false) {
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (content) {
      yield { type: 'token', content }
    }
    yield { type: 'done' }
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
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      const data = trimmed.slice(6)
      if (data === '[DONE]') {
        yield { type: 'done' }
        return
      }

      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) {
          yield { type: 'token', content: token }
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  yield { type: 'done' }
}