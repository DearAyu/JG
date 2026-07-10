<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { usePresetStore } from '@/stores/preset'
import { useChatStore } from '@/stores/chat'
import type { GenerationPreset } from '@shared/types'

const presetStore = usePresetStore()
const chatStore = useChatStore()
const isOpen = ref(false)

onMounted(async () => {
  await presetStore.loadPresets()
})

const activePresetId = ref<string | null>(null)

watch(
  () => chatStore.activeSession?.presetId,
  (id) => {
    activePresetId.value = id ?? presetStore.defaultPreset?.id ?? null
  },
  { immediate: true }
)

const activePreset = computed<GenerationPreset | null>(() => {
  return presetStore.getPreset(activePresetId.value)
})

async function selectPreset(preset: GenerationPreset) {
  activePresetId.value = preset.id
  if (chatStore.activeSession) {
    await chatStore.linkPreset(chatStore.activeSession.id, preset.id)
  }
  isOpen.value = false
}

async function clearPreset() {
  activePresetId.value = null
  if (chatStore.activeSession) {
    await chatStore.linkPreset(chatStore.activeSession.id, null)
  }
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-bg-tertiary"
      @click="isOpen = !isOpen"
      title="生成预设"
    >
      <span v-if="activePreset" class="text-text-primary">⚙ {{ activePreset.name }}</span>
      <span v-else class="text-text-secondary">⚙ 预设</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 top-full z-50 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-lg"
    >
      <div class="border-b border-border p-2">
        <button
          class="w-full rounded px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-tertiary"
          @click="clearPreset"
        >
          使用默认
        </button>
      </div>
      <div v-if="presetStore.presets.length === 0" class="p-4 text-center text-sm text-text-secondary">
        还没有预设
      </div>
      <div
        v-for="preset in presetStore.presets"
        :key="preset.id"
        class="cursor-pointer px-3 py-2 hover:bg-bg-tertiary"
        :class="activePresetId === preset.id ? 'bg-bg-tertiary' : ''"
        @click="selectPreset(preset)"
      >
        <div class="text-sm text-text-primary">{{ preset.name }}</div>
        <div class="text-xs text-text-secondary">
          T={{ preset.temperature }} · max={{ preset.max_tokens }}
        </div>
      </div>
    </div>
  </div>
</template>