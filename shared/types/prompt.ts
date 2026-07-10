export type PromptPartType =
  | 'system'
  | 'character_description'
  | 'character_personality'
  | 'character_scenario'
  | 'mes_example'
  | 'world_info'
  | 'persona'
  | 'chat_history'
  | 'author_note'
  | 'post_history'

export interface PromptPart {
  type: PromptPartType
  label: string
  content: string
  enabled: boolean
  order: number
  tokenCount?: number
}

export interface PromptOrderConfig {
  parts: PromptPartType[]
}

export const defaultPromptOrder: PromptOrderConfig = {
  parts: [
    'system',
    'character_description',
    'character_personality',
    'character_scenario',
    'mes_example',
    'world_info',
    'persona',
    'chat_history',
    'author_note',
    'post_history',
  ],
}

export interface AuthorNoteConfig {
  content: string
  depth: number
  position: 'before' | 'after'
}

export const defaultAuthorNote: AuthorNoteConfig = {
  content: '',
  depth: 4,
  position: 'before',
}

export interface PromptPreview {
  parts: PromptPart[]
  totalTokens: number
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
  contextSize: number
  truncated: boolean
}