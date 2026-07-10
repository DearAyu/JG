<script setup lang="ts">
import type { ChatMessage } from '@shared/types'

const props = defineProps<{
  message: ChatMessage
  isGenerating?: boolean
}>()

const emit = defineEmits<{
  select: [direction: 'prev' | 'next']
  regenerate: []
}>()

function onPrev() {
  emit('select', 'prev')
}
function onNext() {
  emit('select', 'next')
}
</script>

<template>
  <div
    v-if="props.message.swipes && props.message.swipes.length > 0"
    class="flex items-center gap-2 text-xs text-text-secondary"
  >
    <button
      class="disabled:opacity-30"
      :disabled="(props.message.swipeIndex ?? 0) === 0"
      @click="onPrev"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
    <span class="tabular-nums">
      {{ (props.message.swipeIndex ?? 0) + 1 }} / {{ props.message.swipes!.length }}
    </span>
    <button
      class="disabled:opacity-30"
      :disabled="(props.message.swipeIndex ?? 0) === props.message.swipes!.length - 1"
      @click="onNext"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
    <button
      v-if="!isGenerating"
      class="ml-1 hover:text-text-primary"
      title="生成新回复"
      @click="emit('regenerate')"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  </div>
</template>