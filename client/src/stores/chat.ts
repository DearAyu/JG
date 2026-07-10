import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ChatMessage,
  ChatSession,
  ConnectionConfig,
  GenerationPreset,
  AuthorNoteConfig,
  PromptPreview,
  WorldBookEntry,
} from '@shared/types'
import { defaultAuthorNote } from '@shared/types'
import { api, type ChatListItem } from '@/services/api'
import { useStreaming } from '@/composables/useStreaming'
import { useSettingsStore } from './settings'
import { useCharacterStore } from './character'
import { useWorldInfoStore } from './worldinfo'
import { usePersonaStore } from './persona'
import { buildPrompt } from '@/services/prompt-builder'

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatListItem[]>([])
  const activeSession = ref<ChatSession | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isGenerating = ref(false)
  const error = ref<string | null>(null)
  const isLoaded = ref(false)
  const authorNote = ref<AuthorNoteConfig>({ ...defaultAuthorNote })
  const lastPromptPreview = ref<PromptPreview | null>(null)

  const { streamGenerate, stopStreaming } = useStreaming()

  const messageCount = computed(() => messages.value.length)
  const activeSessionId = computed(() => activeSession.value?.id ?? null)

  function generateMsgId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  }

  async function getWorldInfoEntries(): Promise<WorldBookEntry[]> {
    const characterStore = useCharacterStore()
    const worldInfoStore = useWorldInfoStore()
    const character = activeSession.value?.characterId
      ? characterStore.characters.find((c) => c.id === activeSession.value!.characterId) ?? null
      : null
    if (!character?.worldBookId) return []
    const book = await worldInfoStore.loadBook(character.worldBookId)
    return book?.entries ?? []
  }

  // --- Session management ---

  async function loadSessions() {
    try {
      sessions.value = await api.getChats()
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
    isLoaded.value = true
  }

  async function createSession(title?: string): Promise<ChatSession> {
    const session = await api.createChat({ title: title || 'New Chat' })
    sessions.value.unshift({
      id: session.id,
      characterId: session.characterId,
      personaId: session.personaId,
      title: session.title,
      presetId: session.presetId,
      authorNote: session.authorNote,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
    })
    await selectSession(session.id)
    return session
  }

  async function selectSession(id: string) {
    try {
      const session = await api.getChat(id)
      activeSession.value = session
      messages.value = session.messages
      error.value = null
      // Load author note from session
      if (session.authorNote !== undefined) {
        authorNote.value = { ...defaultAuthorNote, content: session.authorNote }
      }
    } catch (e) {
      console.error('Failed to load session:', e)
      error.value = 'Failed to load chat'
    }
  }

  async function deleteSession(id: string) {
    await api.deleteChat(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    if (activeSession.value?.id === id) {
      activeSession.value = null
      messages.value = []
    }
  }

  async function renameSession(id: string, title: string) {
    const updated = await api.updateChat(id, { title })
    const item = sessions.value.find((s) => s.id === id)
    if (item) item.title = updated.title
    if (activeSession.value?.id === id) activeSession.value.title = updated.title
  }

  async function linkCharacter(chatId: string, characterId: string) {
    const updated = await api.updateChat(chatId, { characterId })
    const item = sessions.value.find((s) => s.id === chatId)
    if (item) item.characterId = updated.characterId
    if (activeSession.value?.id === chatId) activeSession.value.characterId = updated.characterId
  }

  async function linkPreset(chatId: string, presetId: string | null) {
    const updated = await api.updateChat(chatId, { presetId })
    const item = sessions.value.find((s) => s.id === chatId)
    if (item) item.presetId = updated.presetId
    if (activeSession.value?.id === chatId) activeSession.value.presetId = updated.presetId
  }

  async function createGroupChat(
    characterIds: string[],
    title?: string,
    mode: 'round_robin' | 'random' | 'manual' = 'round_robin'
  ): Promise<ChatSession> {
    const session = await api.createChat({
      title: title || 'Group Chat',
      characterIds,
      isGroupChat: true,
      groupChatMode: mode,
    })
    sessions.value.unshift({
      id: session.id,
      characterId: session.characterId,
      characterIds: session.characterIds,
      personaId: session.personaId,
      title: session.title,
      presetId: session.presetId,
      authorNote: session.authorNote,
      isGroupChat: session.isGroupChat,
      groupChatMode: session.groupChatMode,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
    })
    await selectSession(session.id)
    return session
  }

  async function addCharacterToGroup(chatId: string, characterId: string) {
    const chat = activeSession.value
    if (!chat || !chat.isGroupChat) return
    const ids = [...(chat.characterIds || []), characterId]
    const updated = await api.updateChat(chatId, { characterIds: ids })
    if (activeSession.value?.id === chatId) {
      activeSession.value.characterIds = updated.characterIds
    }
    const item = sessions.value.find((s) => s.id === chatId)
    if (item) item.characterIds = updated.characterIds
  }

  async function removeCharacterFromGroup(chatId: string, characterId: string) {
    const chat = activeSession.value
    if (!chat || !chat.isGroupChat) return
    const ids = (chat.characterIds || []).filter((id) => id !== characterId)
    const updated = await api.updateChat(chatId, { characterIds: ids })
    if (activeSession.value?.id === chatId) {
      activeSession.value.characterIds = updated.characterIds
    }
    const item = sessions.value.find((s) => s.id === chatId)
    if (item) item.characterIds = updated.characterIds
  }

  function getNextGroupSpeaker(excludeLast: boolean = true): string | null {
    const chat = activeSession.value
    if (!chat || !chat.isGroupChat || !chat.characterIds?.length) return null
    const ids = chat.characterIds
    const lastMsg = [...messages.value].reverse().find((m) => m.role === 'assistant')
    if (chat.groupChatMode === 'random') {
      const candidates = excludeLast && lastMsg?.characterId
        ? ids.filter((id) => id !== lastMsg.characterId)
        : ids
      return candidates[Math.floor(Math.random() * candidates.length)] ?? ids[0]
    }
    // round_robin
    const lastIdx = lastMsg?.characterId ? ids.indexOf(lastMsg.characterId) : -1
    const nextIdx = (lastIdx + 1) % ids.length
    return ids[nextIdx]
  }

  async function saveMessages() {
    if (!activeSession.value) return
    await api.replaceMessages(activeSession.value.id, messages.value)
    // Update session list metadata
    const item = sessions.value.find((s) => s.id === activeSession.value!.id)
    if (item) {
      item.messageCount = messages.value.length
      item.updatedAt = Date.now()
    }
  }

  function clearActiveSession() {
    activeSession.value = null
    messages.value = []
    error.value = null
    authorNote.value = { ...defaultAuthorNote }
    lastPromptPreview.value = null
  }

  async function setAuthorNote(content: string) {
    authorNote.value.content = content
    if (activeSession.value) {
      await api.updateChat(activeSession.value.id, { authorNote: content })
      const item = sessions.value.find((s) => s.id === activeSession.value!.id)
      if (item) item.authorNote = content
    }
  }

  async function setAuthorNoteDepth(depth: number) {
    authorNote.value.depth = depth
  }

  async function setAuthorNotePosition(position: 'before' | 'after') {
    authorNote.value.position = position
  }

  // --- Message management ---

  function addMessage(role: ChatMessage['role'], content: string): ChatMessage {
    const msg: ChatMessage = {
      id: generateMsgId(),
      role,
      content,
      timestamp: Date.now(),
    }
    messages.value.push(msg)
    return msg
  }

  function deleteMessage(id: string) {
    messages.value = messages.value.filter((m) => m.id !== id)
    saveMessages()
  }

  function editMessage(id: string, content: string) {
    const msg = messages.value.find((m) => m.id === id)
    if (msg) {
      msg.content = content
      saveMessages()
    }
  }

  function clearMessages() {
    messages.value = []
    error.value = null
    if (activeSession.value) {
      saveMessages()
    }
  }

  // --- Generate ---

  async function sendMessage(
    text: string,
    connection?: ConnectionConfig | null,
    preset?: Partial<GenerationPreset> | null
  ): Promise<void> {
    if (!text.trim() || isGenerating.value) return

    const settingsStore = useSettingsStore()
    const conn = connection ?? settingsStore.activeConnection

    if (!conn) {
      error.value = '请先在设置中配置 API 连接'
      return
    }

    // Auto-create session if none active
    if (!activeSession.value) {
      await createSession(text.slice(0, 30))
    }

    // Resolve preset from session or default
    const presetStore = await import('./preset')
    const pStore = presetStore.usePresetStore()
    if (!pStore.isLoaded) await pStore.loadPresets()
    const sessionPreset = activeSession.value?.presetId
      ? pStore.getPreset(activeSession.value.presetId)
      : pStore.defaultPreset
    const effectivePreset = preset ?? sessionPreset ?? { stream: true }

    error.value = null

    // Add user message
    addMessage('user', text.trim())

    // Add empty assistant message for streaming
    const assistantMsg = addMessage('assistant', '')

    isGenerating.value = true

    // Build prompt using PromptBuilder
    const characterStore = useCharacterStore()
    const character = activeSession.value?.characterId
      ? characterStore.characters.find((c) => c.id === activeSession.value!.characterId) ?? null
      : null

    const worldInfoEntries = await getWorldInfoEntries()

    const personaStore = usePersonaStore()
    await personaStore.loadPersonas()
    const persona = settingsStore.settings.activePersonaId
      ? personaStore.personas.find((p) => p.id === settingsStore.settings.activePersonaId) ?? null
      : null

    const preview = buildPrompt({
      character,
      messages: messages.value.slice(0, -1),
      authorNote: authorNote.value,
      contextSize: settingsStore.settings.contextSize,
      maxResponseTokens: effectivePreset.max_tokens ?? 2048,
      worldInfoEntries,
      persona: persona ? { id: persona.id, name: persona.name, description: persona.description } : null,
    })
    lastPromptPreview.value = preview

    await streamGenerate(
      preview.messages,
      effectivePreset,
      conn,
      (token) => {
        assistantMsg.content += token
      },
      async (fullContent) => {
        assistantMsg.content = fullContent
        isGenerating.value = false
        await saveMessages()
      },
      async (message) => {
        error.value = message
        if (!assistantMsg.content) {
          messages.value = messages.value.filter((m) => m.id !== assistantMsg.id)
        }
        isGenerating.value = false
        await saveMessages()
      }
    )
  }

  async function regenerate(
    connection?: ConnectionConfig | null,
    preset?: Partial<GenerationPreset>
  ): Promise<void> {
    if (isGenerating.value || messages.value.length === 0) return

    const lastAssistantIdx = [...messages.value]
      .reverse()
      .findIndex((m) => m.role === 'assistant')
    if (lastAssistantIdx === -1) return

    const actualIdx = messages.value.length - 1 - lastAssistantIdx
    const lastAssistant = messages.value[actualIdx]

    // Save current content as a swipe if not already
    if (lastAssistant.content && !lastAssistant.swipes) {
      lastAssistant.swipes = [lastAssistant.content]
    } else if (lastAssistant.content && lastAssistant.swipes) {
      if (!lastAssistant.swipes.includes(lastAssistant.content)) {
        lastAssistant.swipes.push(lastAssistant.content)
      }
    }
    lastAssistant.swipeIndex = lastAssistant.swipes ? lastAssistant.swipes.length - 1 : 0

    // Clear for new generation
    lastAssistant.content = ''

    const settingsStore = useSettingsStore()
    const conn = connection ?? settingsStore.activeConnection

    if (!conn) {
      error.value = '请先在设置中配置 API 连接'
      return
    }

    // Resolve preset from session or default
    const presetStore = await import('./preset')
    const pStore = presetStore.usePresetStore()
    if (!pStore.isLoaded) await pStore.loadPresets()
    const sessionPreset = activeSession.value?.presetId
      ? pStore.getPreset(activeSession.value.presetId)
      : pStore.defaultPreset
    const effectivePreset = preset ?? sessionPreset ?? { stream: true }

    isGenerating.value = true

    // Build prompt using PromptBuilder
    const characterStore = useCharacterStore()
    const character = activeSession.value?.characterId
      ? characterStore.characters.find((c) => c.id === activeSession.value!.characterId) ?? null
      : null

    const worldInfoEntries = await getWorldInfoEntries()

    const personaStore = usePersonaStore()
    await personaStore.loadPersonas()
    const persona = settingsStore.settings.activePersonaId
      ? personaStore.personas.find((p) => p.id === settingsStore.settings.activePersonaId) ?? null
      : null

    const preview = buildPrompt({
      character,
      messages: messages.value.slice(0, actualIdx),
      authorNote: authorNote.value,
      contextSize: settingsStore.settings.contextSize,
      maxResponseTokens: effectivePreset.max_tokens ?? 2048,
      worldInfoEntries,
      persona: persona ? { id: persona.id, name: persona.name, description: persona.description } : null,
    })
    lastPromptPreview.value = preview

    await streamGenerate(
      preview.messages,
      effectivePreset,
      conn,
      (token) => {
        lastAssistant.content += token
      },
      async (fullContent) => {
        lastAssistant.content = fullContent
        // Add to swipes
        if (!lastAssistant.swipes) lastAssistant.swipes = []
        if (!lastAssistant.swipes.includes(fullContent)) {
          lastAssistant.swipes.push(fullContent)
        }
        lastAssistant.swipeIndex = lastAssistant.swipes.length - 1
        isGenerating.value = false
        await saveMessages()
      },
      async (message) => {
        error.value = message
        isGenerating.value = false
        await saveMessages()
      }
    )
  }

  function selectSwipe(msgId: string, direction: 'prev' | 'next') {
    const msg = messages.value.find((m) => m.id === msgId)
    if (!msg || !msg.swipes || msg.swipes.length === 0) return
    const currentIdx = msg.swipeIndex ?? 0
    let newIdx = direction === 'prev' ? currentIdx - 1 : currentIdx + 1
    if (newIdx < 0) newIdx = 0
    if (newIdx >= msg.swipes.length) newIdx = msg.swipes.length - 1
    msg.swipeIndex = newIdx
    msg.content = msg.swipes[newIdx]
    saveMessages()
  }

  async function branchFromMessage(msgId: string): Promise<ChatSession | null> {
    if (!activeSession.value) return null
    const idx = messages.value.findIndex((m) => m.id === msgId)
    if (idx === -1) return null

    const branchMessages = messages.value.slice(0, idx + 1).map((m) => ({
      ...m,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    }))

    const baseTitle = activeSession.value.title
    const session = await api.createChat({
      title: `${baseTitle} (分支)`,
      characterId: activeSession.value.characterId,
      personaId: activeSession.value.personaId,
      presetId: activeSession.value.presetId,
      authorNote: activeSession.value.authorNote,
      messages: branchMessages,
    })

    sessions.value.unshift({
      id: session.id,
      characterId: session.characterId,
      personaId: session.personaId,
      title: session.title,
      presetId: session.presetId,
      authorNote: session.authorNote,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
    })

    await selectSession(session.id)
    return session
  }

  function stopGeneration() {
    stopStreaming()
    isGenerating.value = false
    saveMessages()
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    messages,
    isGenerating,
    error,
    isLoaded,
    authorNote,
    lastPromptPreview,
    messageCount,
    loadSessions,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    linkCharacter,
    linkPreset,
    saveMessages,
    clearActiveSession,
    setAuthorNote,
    setAuthorNoteDepth,
    setAuthorNotePosition,
    addMessage,
    deleteMessage,
    editMessage,
    clearMessages,
    sendMessage,
    regenerate,
    selectSwipe,
    branchFromMessage,
    createGroupChat,
    addCharacterToGroup,
    removeCharacterFromGroup,
    getNextGroupSpeaker,
    stopGeneration,
  }
})