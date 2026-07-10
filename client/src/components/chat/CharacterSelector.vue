<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'
import type { Character } from '@shared/types'

const characterStore = useCharacterStore()
const chatStore = useChatStore()

const isOpen = ref(false)

onMounted(async () => {
  await characterStore.loadCharacters()
})

const currentCharacter = computed<Character | null>(() => {
  const charId = chatStore.activeSession?.characterId
  if (!charId) return null
  return characterStore.characters.find((c) => c.id === charId) ?? null
})

async function selectCharacter(char: Character) {
  if (chatStore.activeSession) {
    await chatStore.linkCharacter(chatStore.activeSession.id, char.id)
  }
  characterStore.selectCharacter(char)
  isOpen.value = false
}

function clearCharacter() {
  if (chatStore.activeSession) {
    chatStore.linkCharacter(chatStore.activeSession.id, '')
  }
  characterStore.selectCharacter(null)
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <!-- Current character display -->
    <button
      class="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-tertiary"
      @click="isOpen = !isOpen"
    >
      <div
        v-if="currentCharacter"
        class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border"
      >
        <img
          v-if="currentCharacter.hasAvatar"
          :src="characterStore.avatarUrl(currentCharacter.id)"
          class="h-full w-full object-cover"
        />
        <span v-else class="text-xs">👤</span>
      </div>
      <span v-if="currentCharacter" class="text-text-primary">{{ currentCharacter.name }}</span>
      <span v-else class="text-text-secondary">选择角色</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-lg"
    >
      <div class="border-b border-border p-2">
        <button
          class="w-full rounded px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-tertiary"
          @click="clearCharacter"
        >
          无角色
        </button>
      </div>
      <div v-if="characterStore.characters.length === 0" class="p-4 text-center text-sm text-text-secondary">
        还没有角色卡
      </div>
      <div
        v-for="char in characterStore.characters"
        :key="char.id"
        class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-bg-tertiary"
        :class="currentCharacter?.id === char.id ? 'bg-bg-tertiary' : ''"
        @click="selectCharacter(char)"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-primary"
        >
          <img
            v-if="char.hasAvatar"
            :src="characterStore.avatarUrl(char.id)"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-sm">👤</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm text-text-primary">{{ char.name || '未命名' }}</div>
          <div class="truncate text-xs text-text-secondary">{{ char.description || '暂无描述' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>