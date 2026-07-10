import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Persona } from '@shared/types'
import { api } from '@/services/api'

export const usePersonaStore = defineStore('persona', () => {
  const personas = ref<(Persona & { hasAvatar?: boolean })[]>([])
  const isLoaded = ref(false)

  const personaCount = computed(() => personas.value.length)

  function avatarUrl(id: string): string {
    return api.personaAvatarUrl(id)
  }

  async function loadPersonas() {
    try {
      personas.value = await api.getPersonas()
    } catch (e) {
      console.error('Failed to load personas:', e)
    }
    isLoaded.value = true
  }

  async function createPersona(data: Partial<Persona>): Promise<Persona> {
    const persona = await api.createPersona(data)
    personas.value.unshift(persona)
    return persona
  }

  async function updatePersona(id: string, data: Partial<Persona>): Promise<Persona> {
    const persona = await api.updatePersona(id, data)
    const idx = personas.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      personas.value[idx] = { ...personas.value[idx], ...persona }
    }
    return persona
  }

  async function deletePersona(id: string) {
    await api.deletePersona(id)
    personas.value = personas.value.filter((p) => p.id !== id)
  }

  async function uploadAvatar(id: string, avatar: string) {
    await api.uploadPersonaAvatar(id, avatar)
    const idx = personas.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      personas.value[idx].hasAvatar = true
    }
  }

  return {
    personas,
    isLoaded,
    personaCount,
    avatarUrl,
    loadPersonas,
    createPersona,
    updatePersona,
    deletePersona,
    uploadAvatar,
  }
})