<script setup lang="ts">
import { ref, nextTick, watch, computed, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useCharacterStore } from '@/stores/character'
import { usePersonaStore } from '@/stores/persona'
import { useExtensionStore } from '@/stores/extension'
import { getBuiltinExtensions } from '@/extensions'
import { useShortcuts } from '@/composables/useShortcuts'
import { usePopup } from '@/composables/usePopup'
import ChatMessageComp from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import SidePanel from './SidePanel.vue'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const characterStore = useCharacterStore()
const personaStore = usePersonaStore()
const extStore = useExtensionStore()
const scrollContainer = ref<HTMLDivElement | null>(null)
const { isOpen: showExtActions, toggle: toggleExtActions, close: closeExtActions } = usePopup()

useShortcuts()

const hasConnection = computed(() => !!settingsStore.activeConnection)

const currentCharacter = computed(() => {
  const charId = chatStore.activeSession?.characterId
  if (!charId) return null
  return characterStore.characters.find((c) => c.id === charId) ?? null
})

const currentPersona = computed(() => {
  const id = settingsStore.settings.activePersonaId
  if (!id) return null
  return personaStore.personas.find((p) => p.id === id) ?? null
})

const searchQuery = ref('')
const showSearch = ref(false)

const enabledActions = computed(() => {
  return extStore.enabledExtensions.flatMap((ext) =>
    ext.actions.map((a) => ({ extId: ext.id, actionId: a.id, label: a.label, icon: a.icon }))
  )
})

function runExtAction(extId: string, actionId: string) {
  extStore.runAction(extId, actionId)
  closeExtActions()
}
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const q = searchQuery.value.toLowerCase()
  return chatStore.messages
    .map((m, idx) => ({ message: m, index: idx }))
    .filter((item) => item.message.content.toLowerCase().includes(q))
})

onMounted(async () => {
  await settingsStore.loadAll()
  await chatStore.loadSessions()
  await characterStore.loadCharacters()
  await personaStore.loadPersonas()

  for (const ext of getBuiltinExtensions()) {
    extStore.register(ext)
  }
  await extStore.loadStates()
  extStore.setContextFns(
    (text) => chatStore.sendMessage(text),
    () => chatStore.messages.map((m) => ({ role: m.role, content: m.content, id: m.id })),
    (text) => {
      const input = document.querySelector('textarea') as HTMLTextAreaElement | null
      if (input) {
        input.value = (input.value || '') + text
        input.dispatchEvent(new Event('input'))
      }
    }
  )
})

watch(
  () => chatStore.messages.map((m) => m.content).join(''),
  () => {
    nextTick(() => {
      if (scrollContainer.value && settingsStore.settings.autoScroll) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
      }
    })
  }
)

watch(
  () => chatStore.messages.length,
  () => {
    nextTick(() => {
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
      }
    })
  }
)

async function handleSend(text: string) {
  await chatStore.sendMessage(text)
}

async function handleRegenerate() {
  await chatStore.regenerate()
}

function handleDelete(id: string) {
  chatStore.deleteMessage(id)
}

function handleEdit(id: string, content: string) {
  chatStore.editMessage(id, content)
}

function handleStop() {
  chatStore.stopGeneration()
}

function handleSwipeSelect(id: string, direction: 'prev' | 'next') {
  chatStore.selectSwipe(id, direction)
}

async function handleBranch(id: string) {
  if (!confirm('将从这条消息处创建分支对话，确定吗？')) return
  await chatStore.branchFromMessage(id)
}

function scrollToMessage(idx: number) {
  const container = scrollContainer.value
  if (!container) return
  const msgElements = container.querySelectorAll('[data-msg-idx]')
  if (msgElements[idx]) {
    msgElements[idx].scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showSearch.value = false
    searchQuery.value = ''
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3"
    >
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold text-text-primary">
            {{ chatStore.activeSession?.title || '聊天' }}
          </h2>
        </div>
      <div class="flex gap-2">
        <!-- Extension actions -->
        <div v-if="enabledActions.length > 0" class="relative">
          <button
            class="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
              @click="toggleExtActions"
            title="扩展操作"
          >
            🧩 扩展
          </button>
          <div
            v-if="showExtActions"
            class="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-bg-secondary shadow-lg"
            @mousedown.stop
          >
            <div
              v-for="action in enabledActions"
              :key="action.extId + action.actionId"
              class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
              @click="runExtAction(action.extId, action.actionId)"
            >
              <span>{{ action.icon }}</span>
              <span>{{ action.label }}</span>
            </div>
          </div>
        </div>

        <button
          class="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
          @click="showSearch = !showSearch"
          title="搜索消息 (Ctrl+F)"
          data-search-toggle
        >
          🔍 搜索
        </button>
        <SidePanel v-if="chatStore.activeSession" />
      </div>
    </div>

    <!-- Search bar -->
    <div v-if="showSearch" class="border-b border-border bg-bg-secondary px-4 py-2">
      <div class="mx-auto flex max-w-4xl items-center gap-2">
        <input
          v-model="searchQuery"
          class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
          placeholder="搜索消息内容..."
          @keydown="handleSearchKeydown"
        />
        <span v-if="searchQuery" class="text-xs text-text-secondary">
          {{ searchResults.length }} 个结果
        </span>
        <button
          class="text-text-secondary hover:text-text-primary"
          @click="showSearch = false; searchQuery = ''"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div v-if="searchResults.length > 0" class="mt-2 max-h-32 overflow-y-auto">
        <div
          v-for="result in searchResults.slice(0, 10)"
          :key="result.message.id"
          class="cursor-pointer truncate rounded px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
          @click="scrollToMessage(result.index)"
        >
          <span class="text-text-primary">{{ result.message.role }}:</span>
          {{ result.message.content.slice(0, 80) }}...
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto py-4">
      <div
        v-if="chatStore.messages.length === 0"
        class="flex h-full flex-col items-center justify-center gap-4"
      >
        <div class="text-6xl">💬</div>
        <p class="text-text-secondary">
          {{ hasConnection ? '开始输入消息与 AI 对话吧！' : '请先前往设置配置 API 连接' }}
        </p>
      </div>

      <div v-else class="mx-auto max-w-4xl">
        <div v-for="(msg, idx) in chatStore.messages" :key="msg.id" :data-msg-idx="idx">
        <ChatMessageComp
          :message="msg"
          :character="msg.characterId ? characterStore.characters.find(c => c.id === msg.characterId) ?? currentCharacter : currentCharacter"
          :avatar-url="(msg.characterId || currentCharacter?.id) ? characterStore.avatarUrl(msg.characterId || currentCharacter!.id) : undefined"
          :persona-name="currentPersona?.name"
          :persona-avatar-url="currentPersona?.id && currentPersona.hasAvatar ? personaStore.avatarUrl(currentPersona.id) : undefined"
          :is-generating="
            msg.role === 'assistant' &&
            chatStore.isGenerating &&
            idx === chatStore.messages.length - 1
          "
          @regenerate="handleRegenerate"
          @delete="handleDelete"
          @edit="handleEdit"
          @select-swipe="handleSwipeSelect"
          @branch="handleBranch"
        />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div
      v-if="chatStore.error"
      class="mx-4 mb-2 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400"
    >
      {{ chatStore.error }}
    </div>

    <!-- Input -->
    <ChatInput
      :is-generating="chatStore.isGenerating"
      @send="handleSend"
      @stop="handleStop"
    />
  </div>
</template>