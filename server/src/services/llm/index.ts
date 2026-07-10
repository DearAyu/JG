import type { ConnectionConfig, GenerationPreset, ChatMessage } from '../../../../shared/types/index.js'
import { generateOpenAI } from './openai.js'
import { generateClaude } from './claude.js'
import { generateOllama } from './ollama.js'
import { generateGemini } from './gemini.js'
import { generateKobold } from './kobold.js'

export interface GenerateRequest {
  messages: ChatMessage[]
  preset: Partial<GenerationPreset>
  connection: ConnectionConfig
}

export interface SSEChunk {
  type: 'token' | 'done' | 'error'
  content?: string
  message?: string
}

export async function* generateLLM(req: GenerateRequest): AsyncGenerator<SSEChunk> {
  const type = req.connection.type

  switch (type) {
    case 'openai':
    case 'custom':
      yield* generateOpenAI(req)
      break
    case 'claude':
      yield* generateClaude(req)
      break
    case 'ollama':
      // Ollama has its own native API, but also supports OpenAI-compatible endpoint
      // Check if the URL contains /v1 (OpenAI-compatible) or not (native)
      if (req.connection.apiUrl.includes('/v1')) {
        yield* generateOpenAI(req)
      } else {
        yield* generateOllama(req)
      }
      break
    case 'kobold':
      yield* generateKobold(req)
      break
    case 'gemini':
      yield* generateGemini(req)
      break
    default:
      yield* generateOpenAI(req)
  }
}