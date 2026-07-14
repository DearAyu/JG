<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { useChatStore } from '@/stores/chat'
import type { Character } from '@shared/types'
import CharacterEditor from '@/components/character/CharacterEditor.vue'

const characterStore = useCharacterStore()
const chatStore = useChatStore()
const router = useRouter()

const showEditor = ref(false)
const editingCharacter = ref<Partial<Character> | null>(null)
const isNew = ref(false)
const searchQuery = ref('')
const importError = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await characterStore.loadCharacters()
})

const filteredCharacters = computed(() => {
  if (!searchQuery.value.trim()) return characterStore.characters
  const q = searchQuery.value.toLowerCase()
  return characterStore.characters.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags?.some((t) => t.toLowerCase().includes(q))
  )
})

function startNew() {
  editingCharacter.value = null
  isNew.value = true
  showEditor.value = true
}

function startEdit(char: Character) {
  editingCharacter.value = char
  isNew.value = false
  showEditor.value = true
}

async function handleDelete(id: string) {
  if (confirm('确定删除这个角色吗？相关的对话不会被删除。')) {
    await characterStore.deleteCharacter(id)
  }
}

async function handleExport(id: string) {
  const card = await characterStore.exportCharacter(id)
  const blob = new Blob([JSON.stringify(card, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const char = characterStore.characters.find((c) => c.id === id)
  a.download = `${char?.name || 'character'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleImportClick() {
  fileInputRef.value?.click()
}

async function handleImportFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const card = JSON.parse(text)
    if (!card.spec || !card.data) {
      importError.value = '无效的角色卡格式'
      return
    }
    await characterStore.importCharacter(card)
    importError.value = null
  } catch (err) {
    importError.value = `导入失败: ${(err as Error).message}`
  }

  target.value = ''
}

async function startChatWithCharacter(char: Character) {
  characterStore.selectCharacter(char)
  // Create new chat with character
  const session = await chatStore.createSession(char.name)
  // Link character to chat
  await chatStore.linkCharacter(session.id, char.id)
  // Add first message if exists
  if (char.first_mes) {
    chatStore.addMessage('assistant', char.first_mes)
    await chatStore.saveMessages()
  }
  // Navigate to chat
  router.push('/chat')
}

function onSaved() {
  showEditor.value = false
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-5xl">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">角色卡管理</h1>
        <div class="flex gap-2">
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImportFile"
          />
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
            @click="handleImportClick"
          >
            📥 导入
          </button>
          <button
            class="rounded-lg px-4 py-2 text-sm text-white hover:opacity-80"
            style="background: var(--accent-color)"
            @click="startNew"
          >
            + 创建角色
          </button>
        </div>
      </div>

      <!-- Import error -->
      <div
        v-if="importError"
        class="mb-4 rounded-lg bg-red-900/30 px-4 py-2 text-sm text-red-400"
      >
        {{ importError }}
      </div>

      <!-- Search -->
      <div class="mb-4">
        <input
          v-model="searchQuery"
          class="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary outline-none focus:border-accent"
          placeholder="搜索角色..."
        />
      </div>

      <!-- Empty state -->
      <div
        v-if="filteredCharacters.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-20"
      >
        <div class="text-6xl">👤</div>
        <p class="text-text-secondary">
          {{ searchQuery ? '没有找到匹配的角色' : '还没有角色，点击"创建角色"开始' }}
        </p>
      </div>

      <!-- Character grid -->
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="char in filteredCharacters"
          :key="char.id"
          class="group flex flex-col rounded-lg border border-border bg-bg-secondary p-4 transition-colors hover:border-accent"
        >
          <!-- Avatar + Name -->
          <div class="mb-3 flex items-center gap-3">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary"
            >
              <img
                v-if="char.hasAvatar"
                :src="characterStore.avatarUrl(char.id)"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-xl text-text-secondary">👤</span>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="truncate font-medium text-text-primary">{{ char.name || '未命名' }}</h3>
              <p class="truncate text-xs text-text-secondary">
                {{ char.creator || '未知创作者' }}
              </p>
            </div>
          </div>

          <!-- Description -->
          <p class="mb-3 line-clamp-2 flex-1 text-sm text-text-secondary">
            {{ char.description || '暂无描述' }}
          </p>

          <!-- Tags -->
          <div v-if="char.tags && char.tags.length > 0" class="mb-3 flex flex-wrap gap-1">
            <span
              v-for="tag in char.tags.slice(0, 3)"
              :key="tag"
              class="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary"
            >
              {{ tag }}
            </span>
            <span
              v-if="char.tags.length > 3"
              class="text-xs text-text-secondary"
            >
              +{{ char.tags.length - 3 }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 border-t border-border pt-3">
            <button
              class="flex-1 rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary hover:opacity-80"
              @click="startChatWithCharacter(char)"
            >
              💬 开始聊天
            </button>
            <button
              class="rounded-lg px-2 py-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              title="编辑"
              @click="startEdit(char)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              class="rounded-lg px-2 py-1.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              title="导出"
              @click="handleExport(char.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              class="rounded-lg px-2 py-1.5 text-text-secondary hover:text-red-400"
              title="删除"
              @click="handleDelete(char.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <CharacterEditor
      v-if="showEditor"
      :character="editingCharacter"
      :is-new="isNew"
      @close="showEditor = false"
      @saved="onSaved"
    />
  </div>
</template>