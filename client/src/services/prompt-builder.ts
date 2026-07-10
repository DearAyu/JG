import type {
  Character,
  ChatMessage,
  AuthorNoteConfig,
  PromptPart,
  PromptPartType,
  PromptPreview,
} from '@shared/types'
import { defaultPromptOrder, defaultAuthorNote } from '@shared/types'
import { tokenCounter } from './token-counter'

export interface Persona {
  id: string
  name: string
  description: string
}

export interface WorldBookEntry {
  id: string
  keys: string[]
  secondaryKeys: string[]
  content: string
  enabled: boolean
  selective: boolean
  insertionOrder: number
  position: 'before_char' | 'after_char' | 'at_depth'
  depth: number
  constant: boolean
}

export interface PromptBuildContext {
  character?: Character | null
  persona?: Persona | null
  messages: ChatMessage[]
  authorNote?: AuthorNoteConfig
  systemPromptOverride?: string
  contextSize?: number
  maxResponseTokens?: number
  worldInfoEntries?: WorldBookEntry[]
}

const DEFAULT_SYSTEM_PROMPT = `You are a creative AI roleplay assistant. Stay in character and respond naturally to the user's messages. Use the character description, personality, and scenario to guide your responses.`

function buildPart(type: PromptPartType, label: string, content: string): PromptPart | null {
  if (!content || !content.trim()) return null
  return {
    type,
    label,
    content: content.trim(),
    enabled: true,
    order: 0,
    tokenCount: tokenCounter.estimate(content),
  }
}

function scanWorldInfo(
  entries: WorldBookEntry[],
  messages: ChatMessage[],
  scanDepth: number = 20
): { activated: WorldBookEntry[]; content: string } {
  const recentMessages = messages.slice(-scanDepth)
  const scanText = recentMessages
    .map((m) => m.content)
    .join(' ')
    .toLowerCase()

  const activated = entries
    .filter((e) => e.enabled)
    .filter((e) => {
      if (e.constant) return true
      const keys = [...e.keys, ...e.secondaryKeys].map((k) => k.toLowerCase())
      if (e.selective) {
        const primary = e.keys.some((k) => scanText.includes(k.toLowerCase()))
        const secondary = e.secondaryKeys.length === 0 || e.secondaryKeys.some((k) => scanText.includes(k.toLowerCase()))
        return primary && secondary
      }
      return keys.some((k) => scanText.includes(k))
    })
    .sort((a, b) => a.insertionOrder - b.insertionOrder)

  const content = activated.map((e) => e.content).join('\n\n')
  return { activated, content }
}

function formatCharacterBlock(character: Character): string {
  const parts: string[] = []
  if (character.name) parts.push(`Name: ${character.name}`)
  if (character.description) parts.push(character.description)
  return parts.join('\n')
}

function formatPersonaBlock(persona: Persona): string {
  const parts: string[] = []
  if (persona.name) parts.push(`User's name: ${persona.name}`)
  if (persona.description) parts.push(persona.description)
  return parts.join('\n')
}

export function buildPrompt(context: PromptBuildContext): PromptPreview {
  const {
    character,
    persona,
    messages,
    authorNote = defaultAuthorNote,
    systemPromptOverride,
    contextSize = 8192,
    maxResponseTokens = 2048,
    worldInfoEntries = [],
  } = context

  const parts: PromptPart[] = []

  // 1. System Prompt
  const systemContent = systemPromptOverride || character?.system_prompt || DEFAULT_SYSTEM_PROMPT
  const sysPart = buildPart('system', 'System Prompt', systemContent)
  if (sysPart) parts.push(sysPart)

  // 2. Character Description
  if (character?.description) {
    const charPart = buildPart('character_description', `Character: ${character.name}`, formatCharacterBlock(character))
    if (charPart) parts.push(charPart)
  }

  // 3. Character Personality
  if (character?.personality) {
    const persPart = buildPart('character_personality', 'Personality', character.personality)
    if (persPart) parts.push(persPart)
  }

  // 4. Character Scenario
  if (character?.scenario) {
    const scenarioPart = buildPart('character_scenario', 'Scenario', character.scenario)
    if (scenarioPart) parts.push(scenarioPart)
  }

  // 5. Message Example
  if (character?.mes_example) {
    const examplePart = buildPart('mes_example', 'Example Messages', character.mes_example)
    if (examplePart) parts.push(examplePart)
  }

  // 6. World Info (scan and activate)
  if (worldInfoEntries.length > 0) {
    const { content: wiContent } = scanWorldInfo(worldInfoEntries, messages)
    if (wiContent) {
      const wiPart = buildPart('world_info', 'World Info', wiContent)
      if (wiPart) parts.push(wiPart)
    }
  }

  // 7. Persona
  if (persona?.description) {
    const personaPart = buildPart('persona', 'User Persona', formatPersonaBlock(persona))
    if (personaPart) parts.push(personaPart)
  }

  // Assign order based on default order
  const orderMap = new Map<PromptPartType, number>()
  defaultPromptOrder.parts.forEach((type, idx) => orderMap.set(type, idx))
  parts.forEach((p) => {
    p.order = orderMap.get(p.type) ?? 99
  })
  parts.sort((a, b) => a.order - b.order)

  // Calculate token budget
  const staticTokens = parts.reduce((sum, p) => sum + (p.tokenCount || 0), 0)
  const responseBudget = maxResponseTokens
  const historyBudget = contextSize - responseBudget - staticTokens - 100

  // Build chat history with Author's Note injection
  const historyMessages = buildChatHistory(messages, authorNote, historyBudget)

  // Post-history instructions
  if (character?.post_history_instructions) {
    const postPart = buildPart('post_history', 'Post-History Instructions', character.post_history_instructions)
    if (postPart) parts.push(postPart)
  }

  // Assemble final messages array
  const systemBlock = parts
    .filter((p) => p.type !== 'chat_history' && p.type !== 'author_note' && p.type !== 'post_history')
    .map((p) => `[${p.label}]\n${p.content}`)
    .join('\n\n')

  const finalMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = []

  if (systemBlock) {
    finalMessages.push({ role: 'system', content: systemBlock })
  }

  for (const msg of historyMessages) {
    finalMessages.push({ role: msg.role, content: msg.content })
  }

  // Post-history as final system message
  if (character?.post_history_instructions) {
    finalMessages.push({ role: 'system', content: character.post_history_instructions })
  }

  const totalTokens = tokenCounter.estimateMessages(finalMessages)
  const truncated = historyBudget < 0 || messages.length > historyMessages.length

  // Build author note part for display
  if (authorNote.content) {
    const anPart = buildPart('author_note', "Author's Note", authorNote.content)
    if (anPart) {
      anPart.order = orderMap.get('author_note') ?? 7
      parts.push(anPart)
    }
  }

  // Add chat history part for display
  const historyContent = historyMessages.map((m) => `${m.role}: ${m.content}`).join('\n')
  if (historyContent) {
    const histPart = buildPart('chat_history', 'Chat History', historyContent)
    if (histPart) {
      histPart.order = orderMap.get('chat_history') ?? 7
      parts.push(histPart)
    }
  }

  parts.sort((a, b) => a.order - b.order)

  return {
    parts,
    totalTokens,
    messages: finalMessages,
    contextSize,
    truncated,
  }
}

function buildChatHistory(
  messages: ChatMessage[],
  authorNote: AuthorNoteConfig,
  tokenBudget: number
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  if (messages.length === 0) return []

  const result: { role: 'system' | 'user' | 'assistant'; content: string }[] = []
  let usedTokens = 0

  // Work backwards from the most recent message
  const reversed: ChatMessage[] = []
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'system') continue

    const msgTokens = tokenCounter.estimateMessage(msg.content, msg.role)
    if (usedTokens + msgTokens > tokenBudget) break

    reversed.unshift(msg)
    usedTokens += msgTokens
  }

  // Convert to {role, content} and inject Author's Note at specified depth
  for (let i = 0; i < reversed.length; i++) {
    const msg = reversed[i]
    result.push({ role: msg.role as 'user' | 'assistant', content: msg.content })

    // Inject Author's Note at specified depth before this message
    if (authorNote.content && authorNote.position === 'before') {
      const messagesFromHere = reversed.length - i
      if (messagesFromHere === authorNote.depth) {
        result.push({ role: 'system', content: `[Author's Note]\n${authorNote.content}` })
      }
    }

    // Inject after
    if (authorNote.content && authorNote.position === 'after') {
      const messagesFromEnd = reversed.length - i - 1
      if (messagesFromEnd === authorNote.depth) {
        result.push({ role: 'system', content: `[Author's Note]\n${authorNote.content}` })
      }
    }
  }

  return result
}

export function getPromptPreview(context: PromptBuildContext): PromptPreview {
  return buildPrompt(context)
}