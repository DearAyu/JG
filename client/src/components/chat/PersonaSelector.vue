<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePersonaStore } from '@/stores/persona'
import { useSettingsStore } from '@/stores/settings'
import type { Persona } from '@shared/types'
import { usePopup } from '@/composables/usePopup'

const personaStore = usePersonaStore()
const settingsStore = useSettingsStore()
const { isOpen, open, close } = usePopup()

onMounted(async () => {
  await personaStore.loadPersonas()
})

const activePersona = computed<Persona | null>(() => {
  const id = settingsStore.settings.activePersonaId
  if (!id) return null
  return personaStore.personas.find((p) => p.id === id) ?? null
})

async function selectPersona(persona: Persona) {
  await settingsStore.updateSettings({ activePersonaId: persona.id })
  close()
}

async function clearPersona() {
  await settingsStore.updateSettings({ activePersonaId: null })
  close()
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg-tertiary"
      @click="isOpen ? close() : open()"
    >
      <div
        v-if="activePersona"
        class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border"
      >
        <img
          v-if="activePersona.hasAvatar"
          :src="personaStore.avatarUrl(activePersona.id)"
          class="h-full w-full object-cover"
        />
        <span v-else class="text-xs">🎭</span>
      </div>
      <span v-if="activePersona" class="text-text-primary">{{ activePersona.name }}</span>
      <span v-else class="text-text-secondary">人设</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-lg"
      @mousedown.stop
    >
      <div class="border-b border-border p-2">
        <button
          class="w-full rounded px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-tertiary"
          @click="clearPersona"
        >
          无人设
        </button>
      </div>
      <div v-if="personaStore.personas.length === 0" class="p-4 text-center text-sm text-text-secondary">
        还没有人设
      </div>
      <div
        v-for="persona in personaStore.personas"
        :key="persona.id"
        class="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-bg-tertiary"
        :class="activePersona?.id === persona.id ? 'bg-bg-tertiary' : ''"
        @click="selectPersona(persona)"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-primary"
        >
          <img
            v-if="persona.hasAvatar"
            :src="personaStore.avatarUrl(persona.id)"
            class="h-full w-full object-cover"
          />
          <span v-else class="text-sm">🎭</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm text-text-primary">{{ persona.name || '未命名' }}</div>
          <div class="truncate text-xs text-text-secondary">{{ persona.description || '暂无描述' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>