import type {
  ConnectionConfig,
  AppSettings,
  GenerationPreset,
  ChatMessage,
  ChatSession,
  Character,
  CharacterCardV2,
  WorldBook,
  WorldBookEntry,
  Persona,
  ExtensionState,
} from '@shared/types'

const baseUrl = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export interface ChatListItem {
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
}

export const api = {
  // Health
  health: () => request<{ status: string; message: string }>('/health'),

  // Connections
  getConnections: () => request<ConnectionConfig[]>('/connections'),
  createConnection: (data: Partial<ConnectionConfig>) =>
    request<ConnectionConfig>('/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id: string, data: Partial<ConnectionConfig>) =>
    request<ConnectionConfig>(`/connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConnection: (id: string) =>
    request<{ success: boolean }>(`/connections/${id}`, { method: 'DELETE' }),
  testConnection: (id: string) =>
    request<{ success: boolean; models?: unknown }>(`/connections/${id}/test`, {
      method: 'POST',
    }),

  // Settings
  getSettings: () => request<AppSettings>('/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Chats
  getChats: () => request<ChatListItem[]>('/chats'),
  getChat: (id: string) => request<ChatSession>(`/chats/${id}`),
  createChat: (data: Partial<ChatSession>) =>
    request<ChatSession>('/chats', { method: 'POST', body: JSON.stringify(data) }),
  updateChat: (id: string, data: Partial<ChatSession>) =>
    request<ChatSession>(`/chats/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChat: (id: string) =>
    request<{ success: boolean }>(`/chats/${id}`, { method: 'DELETE' }),
  replaceMessages: (id: string, messages: ChatMessage[]) =>
    request<ChatSession>(`/chats/${id}/messages`, {
      method: 'PUT',
      body: JSON.stringify({ messages }),
    }),

  // Generate (SSE) - returns a ReadableStream
  generate: (data: {
    messages: { role: string; content: string }[]
    preset: Partial<GenerationPreset>
    connection: ConnectionConfig
  }) =>
    fetch(`${baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  // Characters
  getCharacters: () => request<(Character & { hasAvatar?: boolean })[]>('/characters'),
  getCharacter: (id: string) => request<Character>(`/characters/${id}`),
  createCharacter: (data: Partial<Character>) =>
    request<Character>('/characters', { method: 'POST', body: JSON.stringify(data) }),
  updateCharacter: (id: string, data: Partial<Character>) =>
    request<Character>(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCharacter: (id: string) =>
    request<{ success: boolean }>(`/characters/${id}`, { method: 'DELETE' }),
  uploadAvatar: (id: string, avatar: string) =>
    request<{ success: boolean }>(`/characters/${id}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ avatar }),
    }),
  exportCharacter: (id: string) =>
    request<CharacterCardV2>(`/characters/${id}/export`),
  importCharacter: (card: CharacterCardV2) =>
    request<Character>('/characters/import', { method: 'POST', body: JSON.stringify(card) }),
  characterAvatarUrl: (id: string) => `${baseUrl}/characters/${id}/avatar`,

  // World Info
  getWorldBooks: () => request<(WorldBook & { entryCount?: number })[]>('/worldinfo'),
  getWorldBook: (id: string) => request<WorldBook>(`/worldinfo/${id}`),
  createWorldBook: (data: Partial<WorldBook>) =>
    request<WorldBook>('/worldinfo', { method: 'POST', body: JSON.stringify(data) }),
  updateWorldBook: (id: string, data: Partial<WorldBook>) =>
    request<WorldBook>(`/worldinfo/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorldBook: (id: string) =>
    request<{ success: boolean }>(`/worldinfo/${id}`, { method: 'DELETE' }),
  addWorldBookEntry: (bookId: string, data: Partial<WorldBookEntry>) =>
    request<WorldBookEntry>(`/worldinfo/${bookId}/entries`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateWorldBookEntry: (bookId: string, entryId: string, data: Partial<WorldBookEntry>) =>
    request<WorldBookEntry>(`/worldinfo/${bookId}/entries/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteWorldBookEntry: (bookId: string, entryId: string) =>
    request<{ success: boolean }>(`/worldinfo/${bookId}/entries/${entryId}`, {
      method: 'DELETE',
    }),
  scanWorldBook: (bookId: string, messages: { content: string }[], scanDepth?: number) =>
    request<{ activated: WorldBookEntry[]; scanText: string }>(
      `/worldinfo/${bookId}/scan`,
      { method: 'POST', body: JSON.stringify({ messages, scanDepth }) }
    ),

  // Personas
  getPersonas: () => request<(Persona & { hasAvatar?: boolean })[]>('/personas'),
  getPersona: (id: string) => request<Persona>(`/personas/${id}`),
  createPersona: (data: Partial<Persona>) =>
    request<Persona>('/personas', { method: 'POST', body: JSON.stringify(data) }),
  updatePersona: (id: string, data: Partial<Persona>) =>
    request<Persona>(`/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePersona: (id: string) =>
    request<{ success: boolean }>(`/personas/${id}`, { method: 'DELETE' }),
  uploadPersonaAvatar: (id: string, avatar: string) =>
    request<{ success: boolean }>(`/personas/${id}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ avatar }),
    }),
  personaAvatarUrl: (id: string) => `${baseUrl}/personas/${id}/avatar`,

  // Presets
  getPresets: () => request<GenerationPreset[]>('/presets'),
  getPreset: (id: string) => request<GenerationPreset>(`/presets/${id}`),
  createPreset: (data: Partial<GenerationPreset>) =>
    request<GenerationPreset>('/presets', { method: 'POST', body: JSON.stringify(data) }),
  updatePreset: (id: string, data: Partial<GenerationPreset>) =>
    request<GenerationPreset>(`/presets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePreset: (id: string) =>
    request<{ success: boolean }>(`/presets/${id}`, { method: 'DELETE' }),
  importPreset: (data: Partial<GenerationPreset>) =>
    request<GenerationPreset>('/presets/import', { method: 'POST', body: JSON.stringify(data) }),

  // Extensions
  getExtensionStates: () => request<ExtensionState[]>('/extensions/states'),
  updateExtensionState: (id: string, state: ExtensionState) =>
    request<ExtensionState>(`/extensions/states/${id}`, {
      method: 'PUT',
      body: JSON.stringify(state),
    }),

  // Backup
  downloadBackup: () => `${baseUrl}/backup`,
  restoreBackup: (data: unknown) =>
    request<{ success: boolean; message: string }>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}