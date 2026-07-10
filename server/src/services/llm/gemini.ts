import type { GenerateRequest, SSEChunk } from './index.js'

interface GeminiPart {
  text: string
}

interface GeminiContent {
  role: string
  parts: GeminiPart[]
}

export async function* generateGemini(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const { connection, preset, messages } = req

  const apiUrl = connection.apiUrl.replace(/\/$/, '') || 'https://generativelanguage.googleapis.com'
  const streamParam = preset.stream !== false ? 'streamGenerateContent' : 'generateContent'
  const endpoint = `${apiUrl}/v1beta/models/${connection.model}:${streamParam}?key=${connection.apiKey}`

  // Gemini uses systemInstruction for system messages
  const systemMessages = messages.filter((m) => m.role === 'system')
  const convMessages = messages.filter((m) => m.role !== 'system')

  const systemText = systemMessages.map((m) => m.content).join('\n\n')

  // Map roles: user -> user, assistant -> model
  const contents: GeminiContent[] = convMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: preset.temperature ?? 1.0,
      maxOutputTokens: preset.max_tokens ?? 2048,
      topP: preset.top_p ?? 1.0,
      topK: preset.top_k ?? 0,
    },
  }

  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] }
  }

  if (preset.stop?.length) {
    body.generationConfig.stopSequences = preset.stop
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMsg = `Gemini API returned ${response.status}`
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
  if (preset.stream === false) {
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) {
      yield { type: 'token', content: text }
    }
    yield { type: 'done' }
    return
  }

  // Streaming returns JSON array chunks
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

    // Gemini streaming returns array elements one at a time, like [{...},{...}
    // Try to parse complete JSON objects from the buffer
    while (buffer.length > 0) {
      const trimmed = buffer.trim()
      if (!trimmed) {
        buffer = ''
        break
      }

      // Check if we have a complete JSON object
      if (trimmed.startsWith('[')) {
        const arrMatch = trimmed.match(/^\[(\{.*?\})(?:,(\{.*?\}))*,?\]?/)
        if (!arrMatch) break
      }

      // Try parsing as JSON array chunks
      try {
        // Find the first complete JSON object
        let depth = 0
        let endIdx = -1
        for (let i = 0; i < buffer.length; i++) {
          if (buffer[i] === '{') depth++
          else if (buffer[i] === '}') {
            depth--
            if (depth === 0) {
              endIdx = i
              break
            }
          }
        }

        if (endIdx === -1) break

        const jsonStr = buffer.substring(0, endIdx + 1)
        buffer = buffer.substring(endIdx + 1).replace(/^,/, '')

        const parsed = JSON.parse(jsonStr)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          yield { type: 'token', content: text }
        }
      } catch {
        break
      }
    }
  }

  yield { type: 'done' }
}