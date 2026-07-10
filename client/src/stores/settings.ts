import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConnectionConfig, AppSettings } from '@shared/types'
import { defaultSettings } from '@shared/types'
import { api } from '@/services/api'

export const useSettingsStore = defineStore('settings', () => {
  const connections = ref<ConnectionConfig[]>([])
  const settings = ref<AppSettings>({ ...defaultSettings })
  const activeConnection = ref<ConnectionConfig | null>(null)
  const isLoaded = ref(false)

  const defaultConnection = computed(() =>
    connections.value.find((c) => c.isDefault) ?? connections.value[0] ?? null
  )

  async function loadAll() {
    if (isLoaded.value) return
    await Promise.all([loadConnections(), loadSettings()])
    isLoaded.value = true
  }

  async function loadConnections() {
    try {
      connections.value = await api.getConnections()
      updateActiveConnection()
    } catch (e) {
      console.error('Failed to load connections:', e)
    }
  }

  async function loadSettings() {
    try {
      settings.value = await api.getSettings()
      updateActiveConnection()
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  function updateActiveConnection() {
    const id = settings.value.activeConnectionId
    if (id) {
      activeConnection.value = connections.value.find((c) => c.id === id) ?? null
    }
    if (!activeConnection.value) {
      activeConnection.value = defaultConnection.value
    }
  }

  async function createConnection(data: Partial<ConnectionConfig>) {
    const conn = await api.createConnection(data)
    connections.value.push(conn)
    if (conn.isDefault) {
      connections.value.forEach((c) => {
        if (c.id !== conn.id) c.isDefault = false
      })
    }
    if (!activeConnection.value) {
      activeConnection.value = conn
    }
    return conn
  }

  async function updateConnection(id: string, data: Partial<ConnectionConfig>) {
    const conn = await api.updateConnection(id, data)
    const idx = connections.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      connections.value[idx] = conn
    }
    if (data.isDefault) {
      connections.value.forEach((c) => {
        if (c.id !== id) c.isDefault = false
      })
    }
    updateActiveConnection()
    return conn
  }

  async function deleteConnection(id: string) {
    await api.deleteConnection(id)
    connections.value = connections.value.filter((c) => c.id !== id)
    if (activeConnection.value?.id === id) {
      activeConnection.value = defaultConnection.value
    }
  }

  async function setActiveConnection(id: string) {
    settings.value.activeConnectionId = id
    activeConnection.value = connections.value.find((c) => c.id === id) ?? null
    await api.updateSettings({ activeConnectionId: id })
  }

  async function updateSettings(data: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...data }
    await api.updateSettings(data)
  }

  return {
    connections,
    settings,
    activeConnection,
    defaultConnection,
    isLoaded,
    loadAll,
    loadConnections,
    loadSettings,
    createConnection,
    updateConnection,
    deleteConnection,
    setActiveConnection,
    updateSettings,
  }
})