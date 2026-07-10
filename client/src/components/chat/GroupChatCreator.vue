<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'

const characterStore = useCharacterStore()
const chatStore = useChatStore()

const isOpen = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const groupTitle = ref('')
const mode = ref<'round_robin' | 'random' | 'manual'>('round_robin')

onMounted(async () => {
  await characterStore.loadCharacters()
})

function open() {
  selectedIds.value = new Set()
  groupTitle.value = ''
  mode.value = 'round_robin'
  isOpen.value = true
}

function toggleCharacter(id: string) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const selectedCount = computed(() => selectedIds.value.size)

async function createGroup() {
  if (selectedIds.value.size < 2) return
  const ids = Array.from(selectedIds.value)
  await chatStore.createGroupChat(ids, groupTitle.value || `群聊 (${ids.length})`, mode.value)
  isOpen.value = false
}

defineExpose({ open })
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="isOpen = false"
  >
    <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-bg-secondary">
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-text-primary">创建群聊</h3>
        <button class="text-text-secondary hover:text-text-primary" @click="isOpen = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <div>
          <label class="mb-1 block text-sm text-text-secondary">群聊名称</label>
          <input
            v-model="groupTitle"
            class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
            placeholder="群聊名称"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm text-text-secondary">发言模式</label>
          <select
            v-model="mode"
            class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none"
          >
            <option value="round_robin">轮流发言</option>
            <option value="random">随机发言</option>
            <option value="manual">手动指定</option>
          </select>
        </div>

        <div>
          <div class="mb-2 flex items-center justify-between">
            <label class="text-sm text-text-secondary">选择角色 ({{ selectedCount }} 已选)</label>
            <span class="text-xs text-text-secondary">至少选择 2 个</span>
          </div>
          <div v-if="characterStore.characters.length === 0" class="rounded-lg bg-bg-tertiary p-4 text-center text-sm text-text-secondary">
            还没有角色卡，请先创建角色
          </div>
          <div v-else class="max-h-60 space-y-2 overflow-y-auto">
            <div
              v-for="char in characterStore.characters"
              :key="char.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-bg-primary p-3 transition-colors"
              :class="selectedIds.has(char.id) ? 'border-accent' : 'hover:border-text-secondary'"
              @click="toggleCharacter(char.id)"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary"
              >
                <img
                  v-if="char.hasAvatar"
                  :src="characterStore.avatarUrl(char.id)"
                  class="h-full w-full object-cover"
                />
                <span v-else class="text-lg">👤</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-medium text-text-primary">{{ char.name }}</div>
                <div class="truncate text-xs text-text-secondary">{{ char.description || '暂无描述' }}</div>
              </div>
              <div
                class="flex h-5 w-5 items-center justify-center rounded border"
                :class="selectedIds.has(char.id) ? 'border-accent bg-accent' : 'border-border'"
                :style="selectedIds.has(char.id) ? 'background: var(--accent-color)' : ''"
              >
                <svg v-if="selectedIds.has(char.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <button
          class="rounded-lg border border-border px-4 py-2 text-text-secondary hover:bg-bg-tertiary"
          @click="isOpen = false"
        >
          取消
        </button>
        <button
          class="rounded-lg px-4 py-2 text-white hover:opacity-80 disabled:opacity-40"
          style="background: var(--accent-color)"
          :disabled="selectedCount < 2"
          @click="createGroup"
        >
          创建群聊
        </button>
      </div>
    </div>
  </div>
</template>