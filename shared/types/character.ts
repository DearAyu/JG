// Character Card V2 Spec (SillyTavern compatible)

export interface CharacterCardV2Data {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes: string
  system_prompt: string
  post_history_instructions: string
  tags: string[]
  creator: string
  character_version: string
  alternate_greetings: string[]
  extensions: Record<string, unknown>
  avatar?: string
}

export interface CharacterCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: CharacterCardV2Data
}

export interface Character extends CharacterCardV2Data {
  id: string
  avatarPath?: string
  hasAvatar?: boolean
  worldBookId?: string | null
  createdAt: number
  updatedAt: number
}