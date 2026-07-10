<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '@/stores/chat'

const chatStore = useChatStore()
const isOpen = ref(false)
const localContent = ref('')
const localDepth = ref(4)
const localPosition = ref<'before' | 'after'>('before')

watch(
  () => chatStore.authorNote,
  (an) => {
    localContent.value = an.content
    localDepth.value = an.depth
    localPosition.value = an.position
  },
  { immediate: true, deep: true }
)

let saveTimer: ReturnType<typeof setTimeout> | null = null

function onInput() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    await chatStore.setAuthorNote(localContent.value)
    await chatStore.setAuthorNoteDepth(localDepth.value)
    await chatStore.setAuthorNotePosition(localPosition.value)
  }, 500)
}
</script>

<template>
  <div class="relative">
    <!-- Toggle button -->
    <button
      class="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
      :class="{ 'text-accent': chatStore.authorNote.content }"
      @click="isOpen = !isOpen"
      title="Author's Note"
    >
      📝
      <span v-if="chatStore.authorNote.content" class="text-accent" style="color: var(--accent-color)">●</span>
    </button>

    <!-- Panel -->
    <div
      v-if="isOpen"
      class="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-bg-secondary p-4 shadow-lg"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-text-primary">Author's Note</span>
        <button class="text-text-secondary hover:text-text-primary" @click="isOpen = false">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <textarea
        v-model="localContent"
        rows="3"
        class="mb-3 w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        placeholder="输入 Author's Note，将注入到聊天上下文中..."
        @input="onInput"
      ></textarea>

      <div class="mb-3 flex items-center gap-3">
        <div class="flex-1">
          <label class="mb-1 block text-xs text-text-secondary">注入深度 (消息数)</label>
          <input
            v-model.number="localDepth"
            type="number"
            min="0"
            max="50"
            class="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
            @input="onInput"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-text-secondary">位置</label>
          <select
            v-model="localPosition"
            class="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none"
            @change="onInput"
          >
            <option value="before">之前</option>
            <option value="after">之后</option>
          </select>
        </div>
      </div>

      <p class="text-xs text-text-secondary">
        Author's Note 会在指定深度的消息位置注入到上下文中，用于影响 AI 的生成方向。
      </p>
    </div>
  </div>
</template>