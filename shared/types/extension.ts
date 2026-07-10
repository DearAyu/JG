export interface ExtensionSetting {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'color'
  default: string | number | boolean
  options?: { label: string; value: string }[]
  placeholder?: string
  description?: string
}

export interface ExtensionContext {
  sendMessage: (text: string) => void
  getMessages: () => { role: string; content: string; id?: string }[]
  getLastMessage: () => { role: string; content: string; id?: string } | null
  insertText: (text: string) => void
  settings: Record<string, string | number | boolean>
  t: (key: string) => string
}

export interface ExtensionAction {
  id: string
  label: string
  icon: string
  handler: (ctx: ExtensionContext) => void | Promise<void>
}

export type ExtensionHookType =
  | 'onMessageReceived'
  | 'onMessageSent'
  | 'onChatLoad'
  | 'onGenerateStart'
  | 'onGenerateEnd'

export interface ExtensionHook {
  type: ExtensionHookType
  handler: (ctx: ExtensionContext, data?: unknown) => void | Promise<void>
}

export interface ExtensionManifest {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string
  settings: ExtensionSetting[]
  actions: ExtensionAction[]
  hooks?: ExtensionHook[]
  panel?: {
    component: string
    label: string
  }
}

export interface ExtensionState {
  id: string
  enabled: boolean
  settings: Record<string, string | number | boolean>
  installedAt: number
}