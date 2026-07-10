<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useCharacterStore } from '@/stores/character'
import { useSettingsStore } from '@/stores/settings'
import { useWorldInfoStore } from '@/stores/worldinfo'
import { usePersonaStore } from '@/stores/persona'
import { buildPrompt } from '@/services/prompt-builder'
import type { WorldBookEntry } from '@shared/types'

const chatStore = useChatStore()
const characterStore = useCharacterStore()
const settingsStore = useSettingsStore()
const worldInfoStore = useWorldInfoStore()
const personaStore = usePersonaStore()

const wiEntries = ref<WorldBookEntry[]>([])

onMounted(async () => {
  await personaStore.loadPersonas()
})

const currentCharacter = computed(() => {
  const charId = chatStore.activeSession?.characterId
  if (!charId) return null
  return characterStore.characters.find((c) => c.id === charId) ?? null
})

// Load world info entries when character changes
watch(
  () => currentCharacter.value?.worldBookId,
  async (bookId) => {
    if (!bookId) {
      wiEntries.value = []
      return
    }
    const book = await worldInfoStore.loadBook(bookId)
    wiEntries.value = book?.entries ?? []
  },
  { immediate: true }
)

const isOpen = ref(false)
const activeTab = ref<'parts' | 'messages'>('parts')

const currentPersona = computed(() => {
  const id = settingsStore.settings.activePersonaId
  if (!id) return null
  return personaStore.personas.find((p) => p.id === id) ?? null
})

const preview = computed(() => {
  if (!chatStore.activeSession) return null
  return buildPrompt({
    character: currentCharacter.value,
    messages: chatStore.messages,
    authorNote: chatStore.authorNote,
    contextSize: settingsStore.settings.contextSize,
    maxResponseTokens: 2048,
    worldInfoEntries: wiEntries.value,
    persona: currentPersona.value
      ? { id: currentPersona.value.id, name: currentPersona.value.name, description: currentPersona.value.description }
      : null,
  })
})

function partColor(type: string): string {
  const colors: Record<string, string> = {
    system: 'border-blue-500',
    character_description: 'border-purple-500',
    character_personality: 'border-purple-400',
    character_scenario: 'border-indigo-500',
    mes_example: 'border-cyan-500',
    world_info: 'border-green-500',
    persona: 'border-yellow-500',
    chat_history: 'border-gray-500',
    author_note: 'border-orange-500',
    post_history: 'border-red-500',
  }
  return colors[type] || 'border-gray-600'
}
</script>

<template>
  <div class="relative">
    <!-- Toggle button -->
    <button
      class="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
      @click="isOpen = !isOpen"
      title="提示词预览"
    >
      🔍 预览
    </button>

    <!-- Panel -->
    <Transition name="slide-up">
      <div
        v-if="isOpen"
        class="fixed bottom-20 right-4 z-40 flex h-[60vh] w-[500px] flex-col rounded-lg border border-border bg-bg-secondary shadow-2xl"
      >
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-text-primary">提示词预览</span>
            <span v-if="preview" class="text-xs text-text-secondary">
              {{ preview.totalTokens }} / {{ preview.contextSize }} tokens
            </span>
            <span v-if="preview?.truncated" class="rounded bg-orange-600/30 px-2 py-0.5 text-xs text-orange-400">
              已截断
            </span>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="isOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-border px-4">
          <button
            class="border-b-2 px-4 py-2 text-sm transition-colors"
            :class="
              activeTab === 'parts'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            "
            @click="activeTab = 'parts'"
          >
            组成部分 ({{ preview?.parts.length ?? 0 }})
          </button>
          <button
            class="border-b-2 px-4 py-2 text-sm transition-colors"
            :class="
              activeTab === 'messages'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            "
            @click="activeTab = 'messages'"
          >
            发送消息 ({{ preview?.messages.length ?? 0 }})
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Parts view -->
          <div v-if="activeTab === 'parts'" class="space-y-3">
            <div
              v-for="(part, idx) in preview?.parts"
              :key="idx"
              class="rounded-lg border-l-4 bg-bg-primary p-3"
              :class="partColor(part.type)"
            >
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm font-medium text-text-primary">{{ part.label }}</span>
                <span class="text-xs text-text-secondary">~{{ part.tokenCount }} tokens</span>
              </div>
              <p class="whitespace-pre-wrap text-xs text-text-secondary line-clamp-4">{{ part.content }}</p>
            </div>
            <div v-if="!preview?.parts.length" class="py-8 text-center text-sm text-text-secondary">
              暂无内容
            </div>
          </div>

          <!-- Messages view -->
          <div v-if="activeTab === 'messages'" class="space-y-2">
            <div
              v-for="(msg, idx) in preview?.messages"
              :key="idx"
              class="rounded-lg p-3 text-xs"
              :class="
                msg.role === 'system'
                  ? 'bg-blue-900/20 text-blue-300'
                  : msg.role === 'user'
                    ? 'bg-msg-user text-text-primary'
                    : 'bg-msg-assistant text-text-primary'
              "
            >
              <div class="mb-1 flex items-center gap-2">
                <span class="rounded px-1.5 py-0.5 text-xs font-medium" :class="msg.role === 'system' ? 'bg-blue-600/30' : msg.role === 'user' ? 'bg-green-600/30' : 'bg-purple-600/30'">
                  {{ msg.role }}
                </span>
                <span class="text-text-secondary">~{{ Math.ceil(msg.content.length / 4) }} tokens</span>
              </div>
              <p class="whitespace-pre-wrap break-words">{{ msg.content }}</p>
            </div>
            <div v-if="!preview?.messages.length" class="py-8 text-center text-sm text-text-secondary">
              暂无消息
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>