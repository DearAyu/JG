import { ref, type Ref } from 'vue'
import { api } from '@/services/api'
import type { ConnectionConfig, GenerationPreset, ChatMessage } from '@shared/types'

export interface SSEChunk {
  type: 'token' | 'done' | 'error'
  content?: string
  message?: string
}

export interface SimpleMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function useStreaming() {
  const isStreaming = ref(false)
  const streamingContent = ref('')
  let abortController: AbortController | null = null

  async function streamGenerate(
    messages: SimpleMessage[] | ChatMessage[],
    preset: Partial<GenerationPreset>,
    connection: ConnectionConfig,
    onToken: (token: string) => void,
    onDone: (fullContent: string) => void,
    onError: (message: string) => void
  ): Promise<void> {
    isStreaming.value = true
    streamingContent.value = ''
    abortController = new AbortController()

    try {
      const response = await api.generate({
        messages,
        preset,
        connection,
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Request failed' }))
        onError(err.message || `HTTP ${response.status}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('No response stream')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      let finished = false

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
          try {
            const chunk: SSEChunk = JSON.parse(data)
            if (chunk.type === 'token' && chunk.content) {
              streamingContent.value += chunk.content
              onToken(chunk.content)
            } else if (chunk.type === 'done') {
              finished = true
              onDone(streamingContent.value)
            } else if (chunk.type === 'error') {
              finished = true
              onError(chunk.message || 'Unknown error')
            }
          } catch {
            // skip unparseable
          }
        }
      }

      if (!finished && streamingContent.value) {
        onDone(streamingContent.value)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError((err as Error).message)
      }
    } finally {
      isStreaming.value = false
      abortController = null
    }
  }

  function stopStreaming(): void {
    abortController?.abort()
    isStreaming.value = false
  }

  return {
    isStreaming: isStreaming as Ref<boolean>,
    streamingContent: streamingContent as Ref<string>,
    streamGenerate,
    stopStreaming,
  }
}