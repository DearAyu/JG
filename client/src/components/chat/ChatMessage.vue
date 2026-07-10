<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import type { ChatMessage, Character } from '@shared/types'
import SwipeNavigator from './SwipeNavigator.vue'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps<{
  message: ChatMessage
  isGenerating?: boolean
  character?: Character | null
  avatarUrl?: string
  personaName?: string
  personaAvatarUrl?: string
}>()

const emit = defineEmits<{
  edit: [id: string, content: string]
  delete: [id: string]
  regenerate: []
  selectSwipe: [id: string, direction: 'prev' | 'next']
  branch: [id: string]
}>()

const isEditing = ref(false)
const editContent = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const renderedContent = computed(() => renderMarkdown(props.message.content))

function startEdit() {
  editContent.value = props.message.content
  isEditing.value = true
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
    }
  })
}

function saveEdit() {
  emit('edit', props.message.id, editContent.value)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 300)}px`
}
</script>

<template>
  <div
    class="flex gap-3 px-4 py-3"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <!-- AI Avatar -->
    <div
      v-if="message.role === 'assistant'"
      class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm text-white"
      style="background: var(--accent-color)"
    >
      <img
        v-if="avatarUrl && character?.hasAvatar"
        :src="avatarUrl"
        class="h-full w-full object-cover"
      />
      <span v-else>AI</span>
    </div>

    <!-- Message bubble -->
    <div class="group relative max-w-[70%]" :data-msg-id="message.id">
      <!-- Edit mode -->
      <div v-if="isEditing" class="rounded-2xl border border-border bg-bg-primary p-3">
        <textarea
          ref="textareaRef"
          v-model="editContent"
          rows="1"
          class="w-full resize-none rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          @input="autoResize"
        />
        <div class="mt-2 flex justify-end gap-2">
          <button
            class="rounded border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
            @click="cancelEdit"
          >
            取消
          </button>
          <button
            class="rounded px-3 py-1 text-xs text-white"
            style="background: var(--accent-color)"
            @click="saveEdit"
          >
            保存
          </button>
        </div>
      </div>

      <!-- Display mode -->
      <div v-else>
        <div
          v-if="message.role === 'assistant' && character?.name"
          class="mb-0.5 text-xs font-medium text-text-secondary"
        >
          {{ character.name }}
        </div>
        <div
          v-if="message.role === 'user' && personaName"
          class="mb-0.5 text-right text-xs font-medium text-text-secondary"
        >
          {{ personaName }}
        </div>
        <div
          class="rounded-2xl px-4 py-3 text-text-primary"
          :class="
            message.role === 'user'
              ? 'rounded-br-md bg-msg-user'
              : 'rounded-bl-md bg-msg-assistant'
          "
        >
          <div
            v-if="!isEditing && message.content"
            class="markdown-body break-words text-sm leading-relaxed"
            v-html="renderedContent"
          ></div>
          <p v-else-if="!message.content && !isGenerating" class="text-sm italic text-text-secondary">
            (空消息)
          </p>
          <span
            v-if="isGenerating"
            class="ml-0.5 inline-block h-4 w-1 animate-pulse rounded"
            style="background: var(--accent-color)"
          />
        </div>

        <!-- Swipe navigator -->
        <div
          v-if="message.role === 'assistant' && message.swipes && message.swipes.length > 0"
          class="mt-1 flex justify-center"
        >
          <SwipeNavigator
            :message="message"
            :is-generating="isGenerating"
            @select="(dir) => emit('selectSwipe', message.id, dir)"
            @regenerate="emit('regenerate')"
          />
        </div>

        <!-- Action buttons -->
        <div
          class="mt-1 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <button
            v-if="message.role === 'assistant'"
            class="text-xs text-text-secondary hover:text-text-primary"
            @click="emit('regenerate')"
          >
            ↻ 重新生成
          </button>
          <button
            class="text-xs text-text-secondary hover:text-text-primary"
            @click="emit('branch', message.id)"
            title="从此消息创建分支"
          >
            🌿 分支
          </button>
          <button
            class="text-xs text-text-secondary hover:text-text-primary"
            data-action="edit"
            @click="startEdit"
          >
            ✎ 编辑
          </button>
          <button
            class="text-xs text-text-secondary hover:text-red-400"
            @click="emit('delete', message.id)"
          >
            🗑 删除
          </button>
        </div>
      </div>
    </div>

    <!-- User Avatar -->
    <div
      v-if="message.role === 'user'"
      class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary text-sm text-text-secondary"
    >
      <img
        v-if="personaAvatarUrl"
        :src="personaAvatarUrl"
        class="h-full w-full object-cover"
      />
      <span v-else>{{ personaName?.charAt(0).toUpperCase() || '我' }}</span>
    </div>
  </div>
</template>