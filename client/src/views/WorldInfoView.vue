<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWorldInfoStore } from '@/stores/worldinfo'
import { useCharacterStore } from '@/stores/character'
import type { WorldBookEntry } from '@shared/types'
import WorldInfoEntryEditor from '@/components/worldinfo/WorldInfoEntryEditor.vue'

const wiStore = useWorldInfoStore()
const characterStore = useCharacterStore()

const selectedBookId = ref<string | null>(null)
const showEntryEditor = ref(false)
const editingEntry = ref<WorldBookEntry | null>(null)
const editingEntryIndex = ref(-1)
const renamingBookId = ref<string | null>(null)
const renameValue = ref('')

onMounted(async () => {
  await wiStore.loadBooks()
  await characterStore.loadCharacters()
})

const selectedBook = computed(() => wiStore.activeBook)

const sortedEntries = computed(() => {
  if (!selectedBook.value) return []
  return [...selectedBook.value.entries].sort((a, b) => a.insertionOrder - b.insertionOrder)
})

async function selectBook(id: string) {
  selectedBookId.value = id
  await wiStore.loadBook(id)
}

async function handleCreateBook() {
  const name = `World Book ${wiStore.books.length + 1}`
  const book = await wiStore.createBook(name)
  await selectBook(book.id)
}

async function handleDeleteBook(id: string) {
  if (confirm('确定删除这个世界书吗？')) {
    await wiStore.deleteBook(id)
    if (selectedBookId.value === id) {
      selectedBookId.value = null
    }
  }
}

function startRename(id: string, name: string) {
  renamingBookId.value = id
  renameValue.value = name
}

async function commitRename() {
  if (renamingBookId.value && renameValue.value.trim()) {
    await wiStore.updateBook(renamingBookId.value, { name: renameValue.value.trim() })
  }
  renamingBookId.value = null
}

async function handleAddEntry() {
  if (!selectedBook.value) return
  const entry = await wiStore.addEntry(selectedBook.value.id, {
    keys: [],
    content: '',
    comment: 'New Entry',
    enabled: true,
    selective: false,
    insertionOrder: selectedBook.value.entries.length + 1,
    position: 'before_char',
    depth: 4,
    constant: false,
  })
  editingEntry.value = entry
  editingEntryIndex.value = selectedBook.value.entries.indexOf(entry)
  showEntryEditor.value = true
}

function editEntry(entry: WorldBookEntry, index: number) {
  editingEntry.value = { ...entry }
  editingEntryIndex.value = index
  showEntryEditor.value = true
}

async function handleSaveEntry(updated: WorldBookEntry) {
  if (!selectedBook.value || !editingEntry.value) return
  await wiStore.updateEntry(selectedBook.value.id, editingEntry.value.id, updated)
  showEntryEditor.value = false
  editingEntry.value = null
}

async function handleDeleteEntry(entryId: string) {
  if (!selectedBook.value) return
  if (confirm('确定删除这个条目吗？')) {
    await wiStore.deleteEntry(selectedBook.value.id, entryId)
  }
}

async function toggleEntry(entry: WorldBookEntry) {
  if (!selectedBook.value) return
  await wiStore.updateEntry(selectedBook.value.id, entry.id, { enabled: !entry.enabled })
}

function getCharacterName(bookId: string): string | null {
  const char = characterStore.characters.find((c) => c.worldBookId === bookId)
  return char?.name ?? null
}
</script>

<template>
  <div class="flex h-full">
    <!-- Book list -->
    <div class="w-64 shrink-0 border-r border-border bg-bg-secondary">
      <div class="flex items-center justify-between border-b border-border px-3 py-3">
        <span class="text-sm font-semibold text-text-primary">世界书</span>
        <button
          class="rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
          @click="handleCreateBook"
          title="新建世界书"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div class="overflow-y-auto">
        <div v-if="wiStore.books.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
          还没有世界书
        </div>
        <div
          v-for="book in wiStore.books"
          :key="book.id"
          class="group cursor-pointer border-b border-border/50 px-3 py-2.5 hover:bg-bg-tertiary"
          :class="selectedBookId === book.id ? 'bg-bg-tertiary' : ''"
          @click="selectBook(book.id)"
        >
          <div v-if="renamingBookId === book.id" class="flex items-center">
            <input
              v-model="renameValue"
              class="w-full rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary outline-none"
              @click.stop
              @keydown.enter="commitRename"
              @blur="commitRename"
            />
          </div>
          <div v-else>
            <div class="flex items-center justify-between">
              <span class="truncate text-sm text-text-primary">{{ book.name }}</span>
              <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button class="text-text-secondary hover:text-text-primary" @click.stop="startRename(book.id, book.name)" title="重命名">
                  ✎
                </button>
                <button class="text-text-secondary hover:text-red-400" @click.stop="handleDeleteBook(book.id)" title="删除">
                  🗑
                </button>
              </div>
            </div>
            <div class="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
              <span>{{ book.entryCount ?? 0 }} 条目</span>
              <span v-if="getCharacterName(book.id)" class="text-accent" style="color: var(--accent-color)">
                · {{ getCharacterName(book.id) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Book detail / entries -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div v-if="!selectedBook" class="flex h-full items-center justify-center">
        <div class="text-center">
          <div class="mb-2 text-6xl">📖</div>
          <p class="text-text-secondary">选择一个世界书或创建新的</p>
        </div>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-text-primary">{{ selectedBook.name }}</h2>
            <span class="text-sm text-text-secondary">{{ sortedEntries.length }} 条目</span>
          </div>
          <button
            class="rounded-lg px-4 py-2 text-sm text-white hover:opacity-80"
            style="background: var(--accent-color)"
            @click="handleAddEntry"
          >
            + 添加条目
          </button>
        </div>

        <!-- Description -->
        <div class="border-b border-border px-4 py-2">
          <input
            :value="selectedBook.description"
            class="w-full bg-transparent text-sm text-text-secondary outline-none"
            placeholder="添加世界书描述..."
            @change="wiStore.updateBook(selectedBook!.id, { description: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <!-- Entry list -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="sortedEntries.length === 0" class="flex h-full items-center justify-center">
            <p class="text-text-secondary">还没有条目，点击"添加条目"开始</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(entry, idx) in sortedEntries"
              :key="entry.id"
              class="group rounded-lg border border-border bg-bg-secondary p-3 transition-colors hover:border-accent"
              :class="{ 'opacity-50': !entry.enabled }"
            >
              <div class="flex items-start justify-between">
                <div class="min-w-0 flex-1 cursor-pointer" @click="editEntry(entry, idx)">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-text-secondary">#{{ entry.insertionOrder }}</span>
                    <span class="truncate text-sm font-medium text-text-primary">
                      {{ entry.comment || entry.keys.join(', ') || '未命名条目' }}
                    </span>
                    <span v-if="entry.constant" class="rounded bg-blue-600/30 px-1.5 py-0.5 text-xs text-blue-400">
                      常驻
                    </span>
                    <span v-if="entry.selective" class="rounded bg-purple-600/30 px-1.5 py-0.5 text-xs text-purple-400">
                      选择性
                    </span>
                  </div>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-for="key in entry.keys"
                      :key="key"
                      class="rounded bg-bg-tertiary px-2 py-0.5 text-xs text-text-primary"
                    >
                      {{ key }}
                    </span>
                    <span
                      v-for="key in entry.secondaryKeys"
                      :key="key"
                      class="rounded bg-bg-tertiary/50 px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {{ key }}
                    </span>
                  </div>
                  <p class="mt-1 line-clamp-2 text-xs text-text-secondary">{{ entry.content }}</p>
                  <div class="mt-1 text-xs text-text-secondary">
                    位置: {{ entry.position }} · 深度: {{ entry.depth }}
                  </div>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button
                    class="rounded p-1 text-text-secondary hover:text-text-primary"
                    @click="toggleEntry(entry)"
                    :title="entry.enabled ? '禁用' : '启用'"
                  >
                    {{ entry.enabled ? '👁' : '🚫' }}
                  </button>
                  <button
                    class="rounded p-1 text-text-secondary hover:text-text-primary"
                    @click="editEntry(entry, idx)"
                    title="编辑"
                  >
                    ✎
                  </button>
                  <button
                    class="rounded p-1 text-text-secondary hover:text-red-400"
                    @click="handleDeleteEntry(entry.id)"
                    title="删除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Entry Editor Modal -->
    <WorldInfoEntryEditor
      v-if="showEntryEditor && editingEntry"
      :entry="editingEntry"
      @save="handleSaveEntry"
      @close="showEntryEditor = false"
    />
  </div>
</template>