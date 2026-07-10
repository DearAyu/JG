export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  swipes?: string[]
  swipeIndex?: number
  isSystem?: boolean
  characterId?: string | null
}

export interface ChatSession {
  id: string
  characterId: string | null
  characterIds?: string[]
  personaId: string | null
  title: string
  presetId: string | null
  authorNote: string
  isGroupChat?: boolean
  groupChatMode?: 'round_robin' | 'random' | 'manual'
  createdAt: number
  updatedAt: number
  messageCount: number
  messages: ChatMessage[]
}