import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Character, CharacterCardV2 } from '@shared/types'
import { api } from '@/services/api'

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<(Character & { hasAvatar?: boolean })[]>([])
  const selectedCharacter = ref<Character | null>(null)
  const isLoaded = ref(false)

  const characterCount = computed(() => characters.value.length)

  function avatarUrl(id: string): string {
    return api.characterAvatarUrl(id)
  }

  async function loadCharacters() {
    try {
      characters.value = await api.getCharacters()
    } catch (e) {
      console.error('Failed to load characters:', e)
    }
    isLoaded.value = true
  }

  async function createCharacter(data: Partial<Character>): Promise<Character> {
    const char = await api.createCharacter(data)
    characters.value.unshift(char)
    return char
  }

  async function updateCharacter(id: string, data: Partial<Character>): Promise<Character> {
    const char = await api.updateCharacter(id, data)
    const idx = characters.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      characters.value[idx] = { ...characters.value[idx], ...char }
    }
    return char
  }

  async function deleteCharacter(id: string) {
    await api.deleteCharacter(id)
    characters.value = characters.value.filter((c) => c.id !== id)
    if (selectedCharacter.value?.id === id) {
      selectedCharacter.value = null
    }
  }

  async function uploadAvatar(id: string, avatar: string) {
    await api.uploadAvatar(id, avatar)
    const idx = characters.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      characters.value[idx].hasAvatar = true
    }
  }

  async function importCharacter(card: CharacterCardV2): Promise<Character> {
    const char = await api.importCharacter(card)
    characters.value.unshift(char)
    return char
  }

  async function exportCharacter(id: string): Promise<CharacterCardV2> {
    return await api.exportCharacter(id)
  }

  function selectCharacter(char: Character | null) {
    selectedCharacter.value = char
  }

  return {
    characters,
    selectedCharacter,
    isLoaded,
    characterCount,
    avatarUrl,
    loadCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    uploadAvatar,
    importCharacter,
    exportCharacter,
    selectCharacter,
  }
})