export type ConnectionType =
  | 'openai'
  | 'claude'
  | 'kobold'
  | 'ollama'
  | 'gemini'
  | 'custom'

export interface ConnectionConfig {
  id: string
  name: string
  type: ConnectionType
  apiUrl: string
  apiKey: string
  model: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
}