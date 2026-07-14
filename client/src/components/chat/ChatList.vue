<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import GroupChatCreator from './GroupChatCreator.vue'

const chatStore = useChatStore()
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const groupChatCreator = ref<InstanceType<typeof GroupChatCreator> | null>(null)

const sortedSessions = computed(() =>
  [...chatStore.sessions].sort((a, b) => b.updatedAt - a.updatedAt)
)

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  const hour = Math.floor(min / 60)
  const day = Math.floor(hour / 24)
  if (day > 0) return `${day}天前`
  if (hour > 0) return `${hour}小时前`
  if (min > 0) return `${min}分钟前`
  return '刚刚'
}

async function handleSelect(id: string) {
  await chatStore.selectSession(id)
}

function handleNewGroupChat() {
  groupChatCreator.value?.open()
}

async function handleDelete(id: string, e: Event) {
  e.stopPropagation()
  if (confirm('确定删除这个对话吗？')) {
    await chatStore.deleteSession(id)
  }
}

function startRename(id: string, currentTitle: string, e: Event) {
  e.stopPropagation()
  renamingId.value = id
  renameValue.value = currentTitle
}

async function commitRename(e: Event) {
  e.stopPropagation()
  if (renamingId.value && renameValue.value.trim()) {
    await chatStore.renameSession(renamingId.value, renameValue.value.trim())
  }
  renamingId.value = null
}
</script>

<template>
  <div class="flex w-64 shrink-0 flex-col border-r border-border bg-bg-secondary">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-3 py-3">
      <span class="text-sm font-semibold text-text-primary">对话</span>
      <div class="flex gap-1">
        <button
          class="rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          @click="handleNewGroupChat"
          title="新建群聊"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Chat list -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="sortedSessions.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
        还没有对话
      </div>
      <div
        v-for="session in sortedSessions"
        :key="session.id"
        class="group cursor-pointer border-b border-border/50 px-3 py-2.5 hover:bg-bg-tertiary"
        :class="chatStore.activeSessionId === session.id ? 'bg-bg-tertiary' : ''"
        @click="handleSelect(session.id)"
      >
        <div v-if="renamingId === session.id" class="flex items-center gap-1">
          <input
            v-model="renameValue"
            class="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none"
            @click.stop
            @keydown.enter="commitRename"
            @blur="commitRename"
          />
        </div>
        <div v-else>
          <div class="flex items-center justify-between">
            <div class="flex min-w-0 items-center gap-1">
              <span v-if="session.isGroupChat" class="text-xs" title="群聊">👥</span>
              <span class="truncate text-sm text-text-primary">{{ session.title }}</span>
            </div>
            <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="text-text-secondary hover:text-text-primary"
                @click="startRename(session.id, session.title, $event)"
                title="重命名"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                class="text-text-secondary hover:text-red-400"
                @click="handleDelete(session.id, $event)"
                title="删除"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div class="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
            <span>{{ session.messageCount }} 条消息</span>
            <span>·</span>
            <span>{{ formatTime(session.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <GroupChatCreator ref="groupChatCreator" />
  </div>
</template>