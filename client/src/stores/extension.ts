import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExtensionManifest, ExtensionState, ExtensionContext } from '@shared/types'
import { api } from '@/services/api'

type SendMessageFn = (text: string) => void
type GetMessagesFn = () => { role: string; content: string; id?: string }[]
type InsertTextFn = (text: string) => void

export const useExtensionStore = defineStore('extension', () => {
  const manifests = ref<ExtensionManifest[]>([])
  const states = ref<Map<string, ExtensionState>>(new Map())
  const isLoaded = ref(false)

  let _sendMessage: SendMessageFn | null = null
  let _getMessages: GetMessagesFn | null = null
  let _insertText: InsertTextFn | null = null

  const enabledExtensions = computed(() =>
    manifests.value.filter((m) => states.value.get(m.id)?.enabled)
  )

  function register(manifest: ExtensionManifest): void {
    if (!manifests.value.find((m) => m.id === manifest.id)) {
      manifests.value.push(manifest)
    }
  }

  function setContextFns(send: SendMessageFn, getMsgs: GetMessagesFn, insert: InsertTextFn) {
    _sendMessage = send
    _getMessages = getMsgs
    _insertText = insert
  }

  function buildContext(settings: Record<string, string | number | boolean>): ExtensionContext {
    return {
      sendMessage: (text: string) => _sendMessage?.(text),
      getMessages: () => _getMessages?.() ?? [],
      getLastMessage: () => {
        const msgs = _getMessages?.() ?? []
        return msgs[msgs.length - 1] ?? null
      },
      insertText: (text: string) => _insertText?.(text),
      settings,
      t: (key: string) => key,
    }
  }

  function getSettings(extId: string): Record<string, string | number | boolean> {
    const state = states.value.get(extId)
    if (!state) return {}
    const manifest = manifests.value.find((m) => m.id === extId)
    if (!manifest) return state.settings
    const result: Record<string, string | number | boolean> = {}
    for (const setting of manifest.settings) {
      result[setting.key] = state.settings[setting.key] ?? setting.default
    }
    return result
  }

  function runAction(extId: string, actionId: string): void {
    const manifest = manifests.value.find((m) => m.id === extId)
    if (!manifest) return
    const state = states.value.get(extId)
    if (!state?.enabled) return
    const action = manifest.actions.find((a) => a.id === actionId)
    if (!action) return
    const ctx = buildContext(getSettings(extId))
    action.handler(ctx)
  }

  function runHook(hookType: string, data?: unknown): void {
    for (const manifest of enabledExtensions.value) {
      const hooks = manifest.hooks?.filter((h) => h.type === hookType) ?? []
      const ctx = buildContext(getSettings(manifest.id))
      for (const hook of hooks) {
        hook.handler(ctx, data)
      }
    }
  }

  function isEnabled(extId: string): boolean {
    return states.value.get(extId)?.enabled ?? false
  }

  async function loadStates() {
    try {
      const data = await api.getExtensionStates()
      states.value = new Map(data.map((s) => [s.id, s]))
    } catch {
      states.value = new Map()
    }
    isLoaded.value = true
  }

  async function saveState(extId: string, updates: Partial<ExtensionState>) {
    const current = states.value.get(extId)
    const updated: ExtensionState = {
      id: extId,
      enabled: current?.enabled ?? false,
      settings: current?.settings ?? {},
      installedAt: current?.installedAt ?? Date.now(),
      ...updates,
    }
    states.value.set(extId, updated)
    await api.updateExtensionState(extId, updated)
  }

  async function toggle(extId: string) {
    const current = states.value.get(extId)
    const enabled = !(current?.enabled ?? false)
    await saveState(extId, { enabled })
  }

  async function updateSetting(extId: string, key: string, value: string | number | boolean) {
    const current = states.value.get(extId)
    const settings = { ...(current?.settings ?? {}), [key]: value }
    await saveState(extId, { settings })
  }

  return {
    manifests,
    states,
    isLoaded,
    enabledExtensions,
    register,
    setContextFns,
    runAction,
    runHook,
    isEnabled,
    loadStates,
    saveState,
    toggle,
    updateSetting,
    getSettings,
  }
})