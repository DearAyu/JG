export type ConnectionType =
  | 'openai'
  | 'deepseek'
  | 'claude'
  | 'kobold'
  | 'ollama'
  | 'gemini'
  | 'custom'

export type ConnectionVerificationStatus = 'unverified' | 'available' | 'failed'

export interface ConnectionConfig {
  id: string
  name: string
  type: ConnectionType
  apiUrl: string
  apiKey: string
  hasApiKey?: boolean
  model: string
  isDefault: boolean
  createdAt: number
  updatedAt: number
  verificationStatus?: ConnectionVerificationStatus
  lastVerifiedAt?: number
  verificationMessage?: string
}
