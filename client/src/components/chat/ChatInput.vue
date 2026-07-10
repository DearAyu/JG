<script setup lang="ts">
import { ref, nextTick } from 'vue'

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const props = defineProps<{
  isGenerating: boolean
}>()

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function handleSubmit() {
  const text = input.value.trim()
  if (!text || props.isGenerating) return
  emit('send', text)
  input.value = ''
  nextTick(() => autoResize())
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="border-t border-border bg-bg-secondary px-4 py-3">
    <div class="mx-auto flex max-w-4xl items-end gap-2">
      <textarea
        ref="textareaRef"
        v-model="input"
        rows="1"
        class="flex-1 resize-none rounded-2xl border border-border bg-bg-primary px-4 py-3 text-text-primary outline-none focus:border-accent"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        :disabled="isGenerating"
        @keydown="handleKeyDown"
        @input="autoResize"
      />
      <button
        v-if="!isGenerating"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        style="background: var(--accent-color)"
        :disabled="!input.trim()"
        @click="handleSubmit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
      <button
        v-else
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white transition-opacity hover:opacity-80"
        @click="$emit('stop')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"></rect>
        </svg>
      </button>
    </div>
  </div>
</template>