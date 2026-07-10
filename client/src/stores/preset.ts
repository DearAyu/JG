import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GenerationPreset } from '@shared/types'
import { api } from '@/services/api'

export const usePresetStore = defineStore('preset', () => {
  const presets = ref<GenerationPreset[]>([])
  const isLoaded = ref(false)

  const presetCount = computed(() => presets.value.length)

  const defaultPreset = computed(() => presets.value.find((p) => p.name === 'Default') ?? presets.value[0] ?? null)

  async function loadPresets() {
    try {
      presets.value = await api.getPresets()
      // Auto-create a default preset if none exist
      if (presets.value.length === 0) {
        await createPreset('Default', {
          temperature: 1.0,
          max_tokens: 2048,
          top_p: 1.0,
          top_k: 0,
          frequency_penalty: 0,
          presence_penalty: 0,
          repetition_penalty: 1.0,
          stop: [],
          stream: true,
        })
      }
    } catch (e) {
      console.error('Failed to load presets:', e)
    }
    isLoaded.value = true
  }

  async function createPreset(name: string, data?: Partial<GenerationPreset>): Promise<GenerationPreset> {
    const preset = await api.createPreset({ name, ...data })
    presets.value.unshift(preset)
    return preset
  }

  async function updatePreset(id: string, data: Partial<GenerationPreset>): Promise<GenerationPreset> {
    const preset = await api.updatePreset(id, data)
    const idx = presets.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      presets.value[idx] = preset
    }
    return preset
  }

  async function deletePreset(id: string) {
    await api.deletePreset(id)
    presets.value = presets.value.filter((p) => p.id !== id)
  }

  async function importPreset(data: Partial<GenerationPreset>): Promise<GenerationPreset> {
    const preset = await api.importPreset(data)
    presets.value.unshift(preset)
    return preset
  }

  function getPreset(id: string | null): GenerationPreset | null {
    if (!id) return null
    return presets.value.find((p) => p.id === id) ?? null
  }

  return {
    presets,
    isLoaded,
    presetCount,
    defaultPreset,
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    importPreset,
    getPreset,
  }
})