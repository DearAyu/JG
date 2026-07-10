<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { ConnectionConfig, ConnectionType } from '@shared/types'

const settingsStore = useSettingsStore()

const showAddForm = ref(false)
const editingId = ref<string | null>(null)
const formData = ref<Partial<ConnectionConfig>>({
  name: '',
  type: 'openai',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  isDefault: false,
})
const testResult = ref<{ success: boolean; message: string } | null>(null)
const isTesting = ref(false)

onMounted(async () => {
  await settingsStore.loadAll()
})

function startEdit(conn: ConnectionConfig) {
  editingId.value = conn.id
  formData.value = { ...conn }
  showAddForm.value = true
}

function startAdd() {
  editingId.value = null
  formData.value = {
    name: '',
    type: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o',
    isDefault: settingsStore.connections.length === 0,
  }
  showAddForm.value = true
}

async function saveForm() {
  if (!formData.value.name?.trim()) {
    formData.value.name = 'New Connection'
  }
  if (editingId.value) {
    await settingsStore.updateConnection(editingId.value, formData.value)
  } else {
    await settingsStore.createConnection(formData.value)
  }
  showAddForm.value = false
  editingId.value = null
}

async function removeConnection(id: string) {
  if (confirm('确定删除这个连接吗？')) {
    await settingsStore.deleteConnection(id)
  }
}

async function setDefault(id: string) {
  await settingsStore.updateConnection(id, { isDefault: true })
}

async function setActive(id: string) {
  await settingsStore.setActiveConnection(id)
}

async function testConn(id: string) {
  isTesting.value = true
  testResult.value = null
  try {
    const result = await settingsStore.updateConnection(id, {}).then(() =>
      fetch('/api/connections/' + id + '/test', { method: 'POST' }).then((r) => r.json())
    )
    if (result.success) {
      testResult.value = { success: true, message: '连接成功' }
    } else {
      testResult.value = { success: false, message: result.message || '连接失败' }
    }
  } catch (e) {
    testResult.value = { success: false, message: (e as Error).message }
  }
  isTesting.value = false
}

async function setTheme(t: 'dark' | 'light' | 'custom') {
  await settingsStore.updateSettings({ theme: t })
}

const typeDefaults: Record<ConnectionType, { apiUrl: string; model: string; name: string }> = {
  openai: { apiUrl: 'https://api.openai.com/v1', model: 'gpt-4o', name: 'OpenAI' },
  claude: { apiUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514', name: 'Claude' },
  ollama: { apiUrl: 'http://localhost:11434', model: 'llama3.2', name: 'Ollama' },
  gemini: { apiUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash', name: 'Gemini' },
  kobold: { apiUrl: 'http://localhost:5001', model: 'koboldcpp', name: 'KoboldAI' },
  custom: { apiUrl: '', model: '', name: 'Custom' },
}

watch(
  () => formData.value.type,
  (newType, oldType) => {
    if (!newType || newType === oldType) return
    if (!editingId.value) {
      const defaults = typeDefaults[newType]
      if (defaults) {
        formData.value.apiUrl = defaults.apiUrl
        formData.value.model = defaults.model
        if (!formData.value.name?.trim()) {
          formData.value.name = defaults.name
        }
      }
    }
  }
)

async function updateFontSize(val: number) {
  await settingsStore.updateSettings({ fontSize: val })
}

async function updateAccentColor(val: string) {
  await settingsStore.updateSettings({ accentColor: val })
}

async function toggleSetting(key: 'autoScroll' | 'streamMessages' | 'glowMessages' | 'messageAnimation' | 'compactMode') {
  await settingsStore.updateSettings({ [key]: !settingsStore.settings[key] } as Record<string, unknown>)
}

async function updateContextSize(val: number) {
  await settingsStore.updateSettings({ contextSize: val })
}

function handleExportSettings() {
  const blob = new Blob([JSON.stringify(settingsStore.settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'jg-settings.json'
  a.click()
  URL.revokeObjectURL(url)
}

const fileInput = ref<HTMLInputElement | null>(null)

function handleImportSettingsClick() {
  fileInput.value?.click()
}

async function handleImportSettings(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    await settingsStore.updateSettings(data)
  } catch (err) {
    alert(`导入失败: ${(err as Error).message}`)
  }
  target.value = ''
}

const isActive = computed(
  () => (id: string) => settingsStore.activeConnection?.id === id
)

const fontPresets = [
  { label: '系统默认', value: "'Segoe UI', 'Microsoft YaHei', sans-serif" },
  { label: '等宽', value: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" },
  { label: '宋体', value: "'SimSun', 'Songti SC', serif" },
  { label: '黑体', value: "'SimHei', 'Heiti SC', sans-serif" },
]

async function setFontFamily(val: string) {
  await settingsStore.updateSettings({ fontFamily: val })
}

const colorPresets = [
  { name: '红色', value: '#e94560' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '绿色', value: '#10b981' },
  { name: '紫色', value: '#8b5cf6' },
  { name: '橙色', value: '#f59e0b' },
  { name: '青色', value: '#06b6d4' },
  { name: '粉色', value: '#ec4899' },
  { name: '靛蓝', value: '#6366f1' },
]

const typeLabels: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  ollama: 'Ollama',
  gemini: 'Gemini',
  kobold: 'KoboldAI',
  custom: '自定义',
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-3xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">设置</h1>
        <div class="flex gap-2">
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImportSettings" />
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
            @click="handleImportSettingsClick"
          >
            📥 导入设置
          </button>
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
            @click="handleExportSettings"
          >
            📤 导出设置
          </button>
        </div>
      </div>

      <!-- Appearance -->
      <section class="mb-6 rounded-lg border border-border bg-bg-secondary p-5">
        <h2 class="mb-4 text-lg font-semibold text-text-primary">外观</h2>

        <!-- Theme mode -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">主题模式</label>
          <div class="flex gap-2">
            <button
              v-for="t in [
                { key: 'dark', label: '🌙 深色' },
                { key: 'light', label: '☀️ 浅色' },
                { key: 'custom', label: '🎨 自定义' },
              ]"
              :key="t.key"
              class="rounded-lg border px-4 py-2 text-sm transition-colors"
              :class="
                settingsStore.settings.theme === t.key
                  ? 'border-accent text-text-primary'
                  : 'border-border text-text-secondary hover:bg-bg-tertiary'
              "
              @click="setTheme(t.key as 'dark' | 'light' | 'custom')"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Accent color -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">强调色</label>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="color in colorPresets"
              :key="color.value"
              class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
              :class="settingsStore.settings.accentColor === color.value ? 'border-white' : 'border-transparent'"
              :style="{ background: color.value }"
              @click="updateAccentColor(color.value)"
              :title="color.name"
            />
            <input
              type="color"
              :value="settingsStore.settings.accentColor"
              class="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
              @input="updateAccentColor(($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>

        <!-- Custom colors -->
        <div v-if="settingsStore.settings.theme === 'custom'" class="mb-5 space-y-3 rounded-lg bg-bg-tertiary p-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs text-text-secondary">背景主色</label>
              <input
                type="color"
                :value="settingsStore.settings.bgPrimary"
                class="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                @input="settingsStore.updateSettings({ bgPrimary: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs text-text-secondary">背景次色</label>
              <input
                type="color"
                :value="settingsStore.settings.bgSecondary"
                class="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                @input="settingsStore.updateSettings({ bgSecondary: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs text-text-secondary">背景三级</label>
              <input
                type="color"
                :value="settingsStore.settings.bgTertiary"
                class="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                @input="settingsStore.updateSettings({ bgTertiary: ($event.target as HTMLInputElement).value })"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs text-text-secondary">边框色</label>
              <input
                type="color"
                :value="settingsStore.settings.borderColor"
                class="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                @input="settingsStore.updateSettings({ borderColor: ($event.target as HTMLInputElement).value })"
              />
            </div>
          </div>
        </div>

        <!-- Font size -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">
            字体大小: {{ settingsStore.settings.fontSize }}px
          </label>
          <input
            type="range"
            min="12"
            max="24"
            :value="settingsStore.settings.fontSize"
            class="w-full accent-current"
            style="accent-color: var(--accent-color)"
            @input="updateFontSize(Number(($event.target as HTMLInputElement).value))"
          />
        </div>

        <!-- Font family -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">字体类型</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="font in fontPresets"
              :key="font.value"
              class="rounded-lg border px-3 py-1.5 text-sm transition-colors"
              :class="
                settingsStore.settings.fontFamily === font.value
                  ? 'border-accent text-text-primary'
                  : 'border-border text-text-secondary hover:bg-bg-tertiary'
              "
              :style="{ fontFamily: font.value }"
              @click="setFontFamily(font.value)"
            >
              {{ font.label }}
            </button>
          </div>
        </div>

        <!-- Toggles -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-text-primary">紧凑模式</span>
              <p class="text-xs text-text-secondary">减少消息间距和内边距</p>
            </div>
            <button
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="settingsStore.settings.compactMode ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.compactMode ? 'background: var(--accent-color)' : ''"
              @click="toggleSetting('compactMode')"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.compactMode ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-text-primary">消息动画</span>
              <p class="text-xs text-text-secondary">消息出现时的淡入动画</p>
            </div>
            <button
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="settingsStore.settings.messageAnimation ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.messageAnimation ? 'background: var(--accent-color)' : ''"
              @click="toggleSetting('messageAnimation')"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.messageAnimation ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-text-primary">自动滚动</span>
              <p class="text-xs text-text-secondary">收到新消息时自动滚动到底部</p>
            </div>
            <button
              class="relative h-6 w-11 rounded-full transition-colors"
              :class="settingsStore.settings.autoScroll ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.autoScroll ? 'background: var(--accent-color)' : ''"
              @click="toggleSetting('autoScroll')"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.autoScroll ? 'translate-x-5' : 'translate-x-0.5'"
              />
            </button>
          </div>
        </div>
      </section>

      <!-- Generation Settings -->
      <section class="mb-6 rounded-lg border border-border bg-bg-secondary p-5">
        <h2 class="mb-4 text-lg font-semibold text-text-primary">生成设置</h2>

        <div class="mb-4">
          <label class="mb-2 block text-sm text-text-secondary">
            上下文长度: {{ settingsStore.settings.contextSize }} tokens
          </label>
          <select
            :value="settingsStore.settings.contextSize"
            class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none"
            @change="updateContextSize(Number(($event.target as HTMLSelectElement).value))"
          >
            <option :value="4096">4096</option>
            <option :value="8192">8192</option>
            <option :value="16384">16384</option>
            <option :value="32768">32768</option>
            <option :value="65536">65536</option>
            <option :value="128000">128000</option>
          </select>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-text-primary">流式输出</span>
            <p class="text-xs text-text-secondary">逐 token 显示 AI 回复</p>
          </div>
          <button
            class="relative h-6 w-11 rounded-full transition-colors"
            :class="settingsStore.settings.streamMessages ? 'bg-accent' : 'bg-bg-tertiary'"
            :style="settingsStore.settings.streamMessages ? 'background: var(--accent-color)' : ''"
            @click="toggleSetting('streamMessages')"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
              :class="settingsStore.settings.streamMessages ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>
      </section>

      <!-- Connections -->
      <section class="mb-6 rounded-lg border border-border bg-bg-secondary p-5">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-text-primary">API 连接</h2>
          <button
            class="rounded-lg bg-accent px-4 py-2 text-white hover:opacity-80"
            style="background: var(--accent-color)"
            @click="startAdd"
          >
            + 新建连接
          </button>
        </div>

        <div v-if="settingsStore.connections.length === 0" class="py-8 text-center text-text-secondary">
          还没有连接配置，点击"新建连接"添加一个 API
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="conn in settingsStore.connections"
            :key="conn.id"
            class="rounded-lg border border-border bg-bg-tertiary p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-text-primary">{{ conn.name }}</span>
                  <span
                    v-if="conn.isDefault"
                    class="rounded bg-accent px-2 py-0.5 text-xs text-white"
                    style="background: var(--accent-color)"
                    >默认</span
                  >
                  <span
                    v-if="isActive(conn.id)"
                    class="rounded bg-green-600 px-2 py-0.5 text-xs text-white"
                    >活跃</span
                  >
                </div>
                <div class="mt-1 text-sm text-text-secondary">
                  {{ typeLabels[conn.type] || conn.type }} · {{ conn.model }}
                </div>
                <div class="text-xs text-text-secondary">
                  {{ conn.apiUrl }}
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  class="rounded px-3 py-1 text-sm text-text-secondary hover:bg-bg-primary"
                  @click="testConn(conn.id)"
                  :disabled="isTesting"
                >
                  测试
                </button>
                <button
                  class="rounded px-3 py-1 text-sm text-text-secondary hover:bg-bg-primary"
                  @click="setActive(conn.id)"
                  v-if="!isActive(conn.id)"
                >
                  设为活跃
                </button>
                <button
                  class="rounded px-3 py-1 text-sm text-text-secondary hover:bg-bg-primary"
                  @click="setDefault(conn.id)"
                  v-if="!conn.isDefault"
                >
                  设为默认
                </button>
                <button
                  class="rounded px-3 py-1 text-sm text-text-secondary hover:bg-bg-primary"
                  @click="startEdit(conn)"
                >
                  编辑
                </button>
                <button
                  class="rounded px-3 py-1 text-sm text-red-400 hover:bg-bg-primary"
                  @click="removeConnection(conn.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="testResult"
          class="mt-3 rounded-lg p-3 text-sm"
          :class="testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'"
        >
          {{ testResult.message }}
        </div>
      </section>

      <!-- Connection Form Modal -->
      <div
        v-if="showAddForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showAddForm = false"
      >
        <div class="w-full max-w-lg rounded-lg border border-border bg-bg-secondary p-6">
          <h3 class="mb-4 text-lg font-semibold text-text-primary">
            {{ editingId ? '编辑连接' : '新建连接' }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-sm text-text-secondary">名称</label>
              <input
                v-model="formData.name"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="My OpenAI"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm text-text-secondary">API 类型</label>
              <select
                v-model="formData.type"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none"
              >
                <option value="openai">OpenAI / OpenAI 兼容</option>
                <option value="claude">Claude (Anthropic 原生 API)</option>
                <option value="ollama">Ollama (本地)</option>
                <option value="gemini">Google Gemini</option>
                <option value="kobold">KoboldAI / KoboldCpp</option>
                <option value="custom">自定义 (OpenAI 兼容)</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-sm text-text-secondary">API URL</label>
              <input
                v-model="formData.apiUrl"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div>
              <label class="mb-1 block text-sm text-text-secondary">API Key</label>
              <input
                v-model="formData.apiKey"
                type="password"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="sk-..."
              />
            </div>

            <div>
              <label class="mb-1 block text-sm text-text-secondary">模型</label>
              <input
                v-model="formData.model"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="gpt-4o"
              />
            </div>

            <div class="flex items-center gap-2">
              <input
                v-model="formData.isDefault"
                type="checkbox"
                id="isDefault"
                class="h-4 w-4"
              />
              <label for="isDefault" class="text-sm text-text-secondary">设为默认连接</label>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-lg border border-border px-4 py-2 text-text-secondary hover:bg-bg-tertiary"
              @click="showAddForm = false"
            >
              取消
            </button>
            <button
              class="rounded-lg px-4 py-2 text-white hover:opacity-80"
              style="background: var(--accent-color)"
              @click="saveForm"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>