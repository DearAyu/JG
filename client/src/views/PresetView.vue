<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePresetStore } from '@/stores/preset'
import type { GenerationPreset } from '@shared/types'

const presetStore = usePresetStore()

const selectedId = ref<string | null>(null)
const showEditor = ref(false)
const editingPreset = ref<Partial<GenerationPreset> | null>(null)
const isNew = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await presetStore.loadPresets()
  if (presetStore.presets.length > 0) {
    selectedId.value = presetStore.presets[0].id
  }
})

const selectedPreset = ref<GenerationPreset | null>(null)

watch(
  () => selectedId.value,
  async (id) => {
    if (id) {
      selectedPreset.value = presetStore.getPreset(id)
    } else {
      selectedPreset.value = null
    }
  },
  { immediate: true }
)

function startNew() {
  editingPreset.value = {
    name: 'New Preset',
    temperature: 1.0,
    max_tokens: 2048,
    top_p: 1.0,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1.0,
    stop: [],
    stream: true,
  }
  isNew.value = true
  showEditor.value = true
}

function startEdit() {
  if (!selectedPreset.value) return
  editingPreset.value = { ...selectedPreset.value }
  isNew.value = false
  showEditor.value = true
}

async function handleSave() {
  const data = { ...editingPreset.value }
  let saved: GenerationPreset
  if (isNew.value) {
    saved = await presetStore.createPreset(data.name || 'New Preset', data)
    selectedId.value = saved.id
  } else if (editingPreset.value?.id) {
    saved = await presetStore.updatePreset(editingPreset.value.id, data)
  } else {
    return
  }
  showEditor.value = false
  selectedPreset.value = presetStore.getPreset(selectedId.value)
}

async function handleDelete(id: string) {
  if (confirm('确定删除这个预设吗？')) {
    await presetStore.deletePreset(id)
    if (selectedId.value === id) {
      selectedId.value = presetStore.presets[0]?.id ?? null
    }
  }
}

function handleExport(preset: GenerationPreset) {
  const { id, createdAt, updatedAt, ...rest } = preset
  void id
  void createdAt
  void updatedAt
  const blob = new Blob([JSON.stringify(rest, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${preset.name}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleImport() {
  fileInputRef.value?.click()
}

async function handleImportFile(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const imported = await presetStore.importPreset(data)
    selectedId.value = imported.id
  } catch (err) {
    alert(`导入失败: ${(err as Error).message}`)
  }
  target.value = ''
}

const stopText = ref('')
watch(stopText, (val) => {
  if (editingPreset.value) {
    editingPreset.value.stop = val.split(',').map((s) => s.trim()).filter(Boolean)
  }
})

watch(showEditor, (val) => {
  if (val && editingPreset.value) {
    stopText.value = (editingPreset.value.stop || []).join(', ')
  }
})
</script>

<template>
  <div class="flex h-full">
    <!-- Preset list -->
    <div class="w-56 shrink-0 border-r border-border bg-bg-secondary">
      <div class="flex items-center justify-between border-b border-border px-3 py-3">
        <span class="text-sm font-semibold text-text-primary">预设</span>
        <div class="flex gap-1">
          <button
            class="rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            @click="handleImport"
            title="导入"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            class="rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            @click="startNew"
            title="新建"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      <input ref="fileInputRef" type="file" accept=".json" class="hidden" @change="handleImportFile" />
      <div class="overflow-y-auto">
        <div v-if="presetStore.presets.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
          还没有预设
        </div>
        <div
          v-for="preset in presetStore.presets"
          :key="preset.id"
          class="group cursor-pointer border-b border-border/50 px-3 py-2.5 hover:bg-bg-tertiary"
          :class="selectedId === preset.id ? 'bg-bg-tertiary' : ''"
          @click="selectedId = preset.id"
        >
          <div class="flex items-center justify-between">
            <span class="truncate text-sm text-text-primary">{{ preset.name }}</span>
            <div class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button class="text-text-secondary hover:text-red-400" @click.stop="handleDelete(preset.id)" title="删除">
                🗑
              </button>
            </div>
          </div>
          <div class="mt-0.5 text-xs text-text-secondary">
            T={{ preset.temperature }} · max={{ preset.max_tokens }}
          </div>
        </div>
      </div>
    </div>

    <!-- Detail / Editor -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div v-if="!selectedPreset" class="flex h-full items-center justify-center">
        <div class="text-center">
          <div class="mb-2 text-6xl">⚙️</div>
          <p class="text-text-secondary">选择一个预设或创建新的</p>
        </div>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
          <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-text-primary">{{ selectedPreset.name }}</h2>
          </div>
          <div class="flex gap-2">
            <button
              class="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
              @click="handleExport(selectedPreset)"
            >
              📥 导出
            </button>
            <button
              class="rounded-lg border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
              @click="startEdit"
            >
              ✎ 编辑
            </button>
          </div>
        </div>

        <!-- Preset params display -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="mx-auto max-w-2xl space-y-4">
            <!-- Basic params -->
            <section class="rounded-lg border border-border bg-bg-secondary p-5">
              <h3 class="mb-4 text-base font-semibold text-text-primary">基础参数</h3>
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Temperature</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.temperature }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Max Tokens</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.max_tokens }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Top P</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.top_p }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Top K</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.top_k }}</div>
                </div>
              </div>
            </section>

            <!-- Advanced params -->
            <section class="rounded-lg border border-border bg-bg-secondary p-5">
              <h3 class="mb-4 text-base font-semibold text-text-primary">高级参数</h3>
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Frequency Penalty</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.frequency_penalty }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Presence Penalty</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.presence_penalty }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Repetition Penalty</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.repetition_penalty }}</div>
                </div>
                <div class="rounded-lg bg-bg-tertiary p-3">
                  <div class="text-xs text-text-secondary">Stream</div>
                  <div class="text-lg font-medium text-text-primary">{{ selectedPreset.stream ? '是' : '否' }}</div>
                </div>
              </div>
            </section>

            <!-- Stop sequences -->
            <section class="rounded-lg border border-border bg-bg-secondary p-5">
              <h3 class="mb-3 text-base font-semibold text-text-primary">停止序列</h3>
              <div v-if="selectedPreset.stop.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="s in selectedPreset.stop"
                  :key="s"
                  class="rounded-full bg-bg-tertiary px-3 py-1 text-sm text-text-primary"
                >
                  {{ s }}
                </span>
              </div>
              <p v-else class="text-sm text-text-secondary">无</p>
            </section>
          </div>
        </div>
      </template>
    </div>

    <!-- Editor Modal -->
    <div
      v-if="showEditor && editingPreset"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showEditor = false"
    >
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-border bg-bg-secondary">
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 class="text-lg font-semibold text-text-primary">
            {{ isNew ? '创建预设' : '编辑预设' }}
          </h3>
          <button class="text-text-secondary hover:text-text-primary" @click="showEditor = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <label class="mb-1 block text-sm text-text-secondary">预设名称</label>
            <input
              v-model="editingPreset.name"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="预设名称"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Temperature (0-2)</label>
              <input
                v-model.number="editingPreset.temperature"
                type="number"
                step="0.01"
                min="0"
                max="2"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Max Tokens</label>
              <input
                v-model.number="editingPreset.max_tokens"
                type="number"
                min="1"
                max="128000"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Top P (0-1)</label>
              <input
                v-model.number="editingPreset.top_p"
                type="number"
                step="0.01"
                min="0"
                max="1"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Top K</label>
              <input
                v-model.number="editingPreset.top_k"
                type="number"
                min="0"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Frequency Penalty (-2 to 2)</label>
              <input
                v-model.number="editingPreset.frequency_penalty"
                type="number"
                step="0.01"
                min="-2"
                max="2"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Presence Penalty (-2 to 2)</label>
              <input
                v-model.number="editingPreset.presence_penalty"
                type="number"
                step="0.01"
                min="-2"
                max="2"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">Repetition Penalty</label>
              <input
                v-model.number="editingPreset.repetition_penalty"
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div class="flex items-end">
              <div class="flex items-center gap-2">
                <input
                  v-model="editingPreset.stream"
                  type="checkbox"
                  id="stream"
                  class="h-4 w-4"
                />
                <label for="stream" class="text-sm text-text-secondary">流式输出</label>
              </div>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">停止序列 (逗号分隔)</label>
            <input
              v-model="stopText"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="例: \\n\\n\\n, <END>"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            class="rounded-lg border border-border px-4 py-2 text-text-secondary hover:bg-bg-tertiary"
            @click="showEditor = false"
          >
            取消
          </button>
          <button
            class="rounded-lg px-4 py-2 text-white hover:opacity-80"
            style="background: var(--accent-color)"
            @click="handleSave"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>