<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePersonaStore } from '@/stores/persona'
import { usePresetStore } from '@/stores/preset'
import { useSettingsStore } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'
import { usePopup } from '@/composables/usePopup'
import { buildPrompt } from '@/services/prompt-builder'
import type { Persona, GenerationPreset } from '@shared/types'

const personaStore = usePersonaStore()
const presetStore = usePresetStore()
const settingsStore = useSettingsStore()
const chatStore = useChatStore()

const { isOpen, toggle, close } = usePopup()
const authorNoteContent = ref('')
const authorNoteDepth = ref(4)

onMounted(async () => {
  await personaStore.loadPersonas()
  await presetStore.loadPresets()
  authorNoteContent.value = chatStore.authorNote.content
  authorNoteDepth.value = chatStore.authorNote.depth
})

const currentPersona = computed(() => {
  const id = settingsStore.settings.activePersonaId
  return id ? personaStore.personas.find((p) => p.id === id) ?? null : null
})

const currentPreset = computed(() => {
  const id = chatStore.activeSession?.presetId
  return id ? presetStore.presets.find((p) => p.id === id) ?? null : presetStore.defaultPreset
})

const previewTokenCount = computed(() => {
  const preview = buildPrompt({
    messages: chatStore.messages,
    authorNote: chatStore.authorNote,
    contextSize: settingsStore.settings.contextSize,
    maxResponseTokens: currentPreset.value?.max_tokens ?? 2048,
  })
  return preview.totalTokens
})

async function selectPersona(persona: Persona) {
  await settingsStore.updateSettings({ activePersonaId: persona.id })
}

async function selectPreset(preset: GenerationPreset) {
  if (chatStore.activeSession) {
    await chatStore.linkPreset(chatStore.activeSession.id, preset.id)
  }
}

async function saveAuthorNote() {
  await chatStore.setAuthorNote(authorNoteContent.value)
  await chatStore.setAuthorNoteDepth(authorNoteDepth.value)
}
</script>

<template>
  <div class="relative">
    <button
      class="flex h-8 w-8 items-center justify-center rounded text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
      @click="toggle"
      title="设置面板"
    >···</button>

    <!-- Right sidebar -->
    <Transition name="slide-right">
      <div
        v-if="isOpen"
        class="fixed right-0 top-0 z-40 flex h-screen w-80 flex-col border-l border-border bg-bg-secondary shadow-2xl"
        @mousedown.stop
      >
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <span class="text-sm font-semibold text-text-primary">设置</span>
          <button class="text-text-secondary hover:text-text-primary" @click="close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto p-4">
          <!-- Persona -->
          <section>
            <h4 class="mb-2 text-xs font-medium text-text-secondary">人设</h4>
            <div v-if="currentPersona" class="mb-2 flex items-center gap-2 rounded-lg bg-bg-tertiary p-2">
              <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-primary">
                <img v-if="currentPersona.hasAvatar" :src="personaStore.avatarUrl(currentPersona.id)" class="h-full w-full object-cover" />
                <span v-else class="text-sm">🎭</span>
              </div>
              <span class="text-sm text-text-primary">{{ currentPersona.name }}</span>
            </div>
            <p v-else class="text-xs text-text-secondary mb-2">未选择人设</p>
            <div class="max-h-32 space-y-1 overflow-y-auto">
              <div
                v-for="persona in personaStore.personas"
                :key="persona.id"
                class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-bg-tertiary"
                :class="currentPersona?.id === persona.id ? 'bg-bg-tertiary' : ''"
                @click="selectPersona(persona)"
              >
                <div class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-bg-primary">
                  <img v-if="persona.hasAvatar" :src="personaStore.avatarUrl(persona.id)" class="h-full w-full object-cover" />
                  <span v-else class="text-xs">🎭</span>
                </div>
                <span class="truncate text-text-primary">{{ persona.name || '未命名' }}</span>
              </div>
            </div>
          </section>

          <!-- Preset -->
          <section>
            <h4 class="mb-2 text-xs font-medium text-text-secondary">预设</h4>
            <div v-if="currentPreset" class="mb-2 rounded-lg bg-bg-tertiary p-2">
              <div class="text-sm text-text-primary">{{ currentPreset.name }}</div>
              <div class="text-xs text-text-secondary">T={{ currentPreset.temperature }} · max={{ currentPreset.max_tokens }}</div>
            </div>
            <p v-else class="text-xs text-text-secondary mb-2">使用默认预设</p>
            <div class="max-h-32 space-y-1 overflow-y-auto">
              <div
                v-for="preset in presetStore.presets"
                :key="preset.id"
                class="cursor-pointer rounded px-2 py-1 text-sm hover:bg-bg-tertiary"
                :class="currentPreset?.id === preset.id ? 'bg-bg-tertiary' : ''"
                @click="selectPreset(preset)"
              >
                <div class="text-text-primary">{{ preset.name }}</div>
                <div class="text-xs text-text-secondary">T={{ preset.temperature }} · max={{ preset.max_tokens }}</div>
              </div>
            </div>
          </section>

          <!-- Author's Note -->
          <section>
            <h4 class="mb-2 text-xs font-medium text-text-secondary">Author's Note</h4>
            <textarea
              v-model="authorNoteContent"
              rows="3"
              class="mb-2 w-full resize-none rounded border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              placeholder="输入 Author's Note..."
              @input="saveAuthorNote"
            />
            <div>
              <label class="mb-1 block text-xs text-text-secondary">注入深度: {{ authorNoteDepth }}</label>
              <input
                v-model.number="authorNoteDepth"
                type="range"
                min="0"
                max="20"
                class="w-full accent-current"
                style="accent-color: var(--accent-color)"
                @input="saveAuthorNote"
              />
            </div>
          </section>

          <!-- Token usage -->
          <section>
            <h4 class="mb-2 text-xs font-medium text-text-secondary">Token 用量</h4>
            <div class="rounded-lg bg-bg-tertiary p-3 text-center">
              <div class="text-lg font-medium text-text-primary">~{{ previewTokenCount }}</div>
              <div class="text-xs text-text-secondary">/ {{ settingsStore.settings.contextSize }} tokens</div>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.25s ease;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>