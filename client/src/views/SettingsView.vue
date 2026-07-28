<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import {
  CONTEXT_SIZE_MAX,
  CONTEXT_SIZE_MIN,
  MAX_RESPONSE_TOKENS_MAX,
  MAX_RESPONSE_TOKENS_MIN,
  SYSTEM_FONT_FAMILY,
} from '@shared/types'
import { appFontPresets } from '@/services/app-fonts'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const contextSizeInput = ref('')
const contextSizeError = ref('')
const maxResponseTokensInput = ref('')
const maxResponseTokensError = ref('')

onMounted(async () => {
  await settingsStore.loadSettings()
  contextSizeInput.value = String(settingsStore.settings.contextSize)
  maxResponseTokensInput.value = String(settingsStore.settings.maxResponseTokens)
})

async function setTheme(t: 'dark' | 'light') {
  await settingsStore.updateSettings({ theme: t })
}

async function updateFontSize(val: number) {
  await settingsStore.updateSettings({ fontSize: val })
}

const fontSizeSliderStyle = computed(() => {
  const progress = ((settingsStore.settings.fontSize - 12) / 12) * 100

  return {
    background: `linear-gradient(to right, var(--accent-color) ${progress}%, var(--bg-tertiary) ${progress}%)`,
  }
})

async function updateAccentColor(val: string) {
  await settingsStore.updateSettings({ accentColor: val })
}

async function toggleSetting(key: 'autoScroll' | 'streamMessages' | 'glowMessages' | 'messageAnimation' | 'compactMode') {
  await settingsStore.updateSettings({ [key]: !settingsStore.settings[key] } as Record<string, unknown>)
}

function parseTokenInput(input: string, min: number, max: number): number | null {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return null

  const value = Number(trimmed)
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null
}

async function saveContextSize() {
  const value = parseTokenInput(contextSizeInput.value, CONTEXT_SIZE_MIN, CONTEXT_SIZE_MAX)
  if (value === null) {
    contextSizeError.value = `请输入 ${CONTEXT_SIZE_MIN}-${CONTEXT_SIZE_MAX} 之间的整数。`
    return
  }

  try {
    await settingsStore.updateSettings({ contextSize: value })
    contextSizeInput.value = String(value)
    contextSizeError.value = ''
  } catch (error) {
    contextSizeError.value = (error as Error).message
  }
}

async function saveMaxResponseTokens() {
  const value = parseTokenInput(
    maxResponseTokensInput.value,
    MAX_RESPONSE_TOKENS_MIN,
    MAX_RESPONSE_TOKENS_MAX
  )
  if (value === null) {
    maxResponseTokensError.value =
      `请输入 ${MAX_RESPONSE_TOKENS_MIN}-${MAX_RESPONSE_TOKENS_MAX} 之间的整数。`
    return
  }

  try {
    await settingsStore.updateSettings({ maxResponseTokens: value })
    maxResponseTokensInput.value = String(value)
    maxResponseTokensError.value = ''
  } catch (error) {
    maxResponseTokensError.value = (error as Error).message
  }
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
const backupFileInput = ref<HTMLInputElement | null>(null)

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
    contextSizeInput.value = String(settingsStore.settings.contextSize)
    maxResponseTokensInput.value = String(settingsStore.settings.maxResponseTokens)
  } catch (err) {
    alert(`导入失败: ${(err as Error).message}`)
  }
  target.value = ''
}

function handleBackupAll() {
  const a = document.createElement('a')
  a.href = '/api/backup'
  a.download = `jg-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}

async function handleRestoreBackup(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!confirm('恢复数据将覆盖当前所有数据，确定吗？')) {
    target.value = ''
    return
  }
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const result = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await result.json()
    if (json.success) {
      alert('数据恢复成功。出于安全考虑，备份不包含 API Key，请重新填写后再使用连接。')
      window.location.reload()
    } else {
      alert(json.message || '恢复失败')
    }
  } catch (err) {
    alert(`恢复失败: ${(err as Error).message}`)
  }
  target.value = ''
}

const fontPresets = [
  ...appFontPresets,
  {
    label: '系统默认',
    value: SYSTEM_FONT_FAMILY,
    description: 'Segoe UI + 微软雅黑',
  },
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

</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-3xl">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text-primary">设置</h1>
        <div class="flex gap-2">
          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="handleImportSettings" />
          <input ref="backupFileInput" type="file" accept=".json" class="hidden" @change="handleRestoreBackup" />
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
            title="为安全起见，备份文件不包含 API Key"
            @click="handleBackupAll"
          >
            📦 备份全部
          </button>
          <button
            class="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary"
            @click="backupFileInput?.click()"
          >
            📥 恢复全部
          </button>
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
      <section class="mb-6 rounded-xl border border-border bg-bg-secondary p-5 shadow-panel">
        <h2 class="mb-4 text-lg font-semibold text-text-primary">外观</h2>

        <!-- Theme mode -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">主题模式</label>
          <div class="flex gap-2">
            <button
              v-for="t in [
                { key: 'dark', label: '🌙 深色' },
                { key: 'light', label: '☀️ 浅色' },
              ]"
              :key="t.key"
              class="rounded-lg border px-4 py-2 text-sm transition-colors"
              :class="
                settingsStore.settings.theme === t.key
                  ? 'border-accent text-text-primary'
                  : 'border-border text-text-secondary hover:bg-bg-tertiary'
              "
              @click="setTheme(t.key as 'dark' | 'light')"
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
          </div>
        </div>

        <!-- Font size -->
        <div class="mb-5">
          <label class="mb-2 block text-sm text-text-secondary">
            对话字体大小: {{ settingsStore.settings.fontSize }}px
          </label>
          <input
            type="range"
            min="12"
            max="24"
            :value="settingsStore.settings.fontSize"
            class="font-size-slider block max-w-full"
            :style="fontSizeSliderStyle"
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
              :title="font.description"
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
              type="button"
              class="relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors"
              :class="settingsStore.settings.compactMode ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.compactMode ? 'background: var(--accent-color)' : ''"
              :aria-pressed="settingsStore.settings.compactMode"
              @click="toggleSetting('compactMode')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.compactMode ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-text-primary">消息动画</span>
              <p class="text-xs text-text-secondary">消息出现时的淡入动画</p>
            </div>
            <button
              type="button"
              class="relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors"
              :class="settingsStore.settings.messageAnimation ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.messageAnimation ? 'background: var(--accent-color)' : ''"
              :aria-pressed="settingsStore.settings.messageAnimation"
              @click="toggleSetting('messageAnimation')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.messageAnimation ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <span class="text-sm text-text-primary">自动滚动</span>
              <p class="text-xs text-text-secondary">收到新消息时自动滚动到底部</p>
            </div>
            <button
              type="button"
              class="relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors"
              :class="settingsStore.settings.autoScroll ? 'bg-accent' : 'bg-bg-tertiary'"
              :style="settingsStore.settings.autoScroll ? 'background: var(--accent-color)' : ''"
              :aria-pressed="settingsStore.settings.autoScroll"
              @click="toggleSetting('autoScroll')"
            >
              <span
                class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                :class="settingsStore.settings.autoScroll ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>
      </section>

      <!-- Generation Settings -->
      <section class="mb-6 rounded-xl border border-border bg-bg-secondary p-5 shadow-panel">
        <h2 class="mb-4 text-lg font-semibold text-text-primary">生成设置</h2>

        <div class="mb-4">
          <label class="mb-2 block text-sm text-text-secondary" for="context-size">
            上下文长度
          </label>
          <div class="relative">
            <input
              id="context-size"
              v-model="contextSizeInput"
              type="text"
              inputmode="numeric"
              class="w-full rounded-lg border bg-bg-primary px-3 py-2 pr-16 text-text-primary outline-none"
              :class="contextSizeError ? 'border-red-400' : 'border-border focus:border-accent'"
              :aria-invalid="Boolean(contextSizeError)"
              placeholder="请输入1000-1000000"
              @blur="saveContextSize"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
              Token
            </span>
          </div>
          <p v-if="contextSizeError" class="mt-1 text-xs text-red-500">{{ contextSizeError }}</p>
        </div>

        <div class="mb-4">
          <label class="mb-2 block text-sm text-text-secondary" for="max-response-tokens">
            最大回复长度
          </label>
          <div class="relative">
            <input
              id="max-response-tokens"
              v-model="maxResponseTokensInput"
              type="text"
              inputmode="numeric"
              class="w-full rounded-lg border bg-bg-primary px-3 py-2 pr-16 text-text-primary outline-none"
              :class="maxResponseTokensError ? 'border-red-400' : 'border-border focus:border-accent'"
              :aria-invalid="Boolean(maxResponseTokensError)"
              placeholder="请输入100-100000"
              @blur="saveMaxResponseTokens"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
              Token
            </span>
          </div>
          <p v-if="maxResponseTokensError" class="mt-1 text-xs text-red-500">
            {{ maxResponseTokensError }}
          </p>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm text-text-primary">流式输出</span>
            <p class="text-xs text-text-secondary">逐 token 显示 AI 回复</p>
          </div>
          <button
            type="button"
            class="relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors"
            :class="settingsStore.settings.streamMessages ? 'bg-accent' : 'bg-bg-tertiary'"
            :style="settingsStore.settings.streamMessages ? 'background: var(--accent-color)' : ''"
            :aria-pressed="settingsStore.settings.streamMessages"
            @click="toggleSetting('streamMessages')"
          >
            <span
              class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
              :class="settingsStore.settings.streamMessages ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </section>

      <footer class="pb-2 text-center text-xs text-text-secondary">
        图标由
        <a
          class="underline decoration-border underline-offset-2 hover:text-text-primary"
          href="https://icons8.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          Icons8
        </a>
        提供
      </footer>
    </div>
  </div>
</template>
