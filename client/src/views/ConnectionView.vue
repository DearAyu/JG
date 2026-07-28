<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useSettingsStore } from '@/stores/settings'
import type {
  ConnectionConfig,
  ConnectionType,
  ConnectionVerificationStatus,
} from '@shared/types'

const settingsStore = useSettingsStore()

const showForm = ref(false)
const editingId = ref<string | null>(null)
const testingId = ref<string | null>(null)
const isTestingAll = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const formResult = ref<{ success: boolean; message: string } | null>(null)
const availableModels = ref<string[]>([])
const isValidating = ref(false)
const isSaving = ref(false)
const formData = ref<Partial<ConnectionConfig>>({
  name: '',
  type: 'openai',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  isDefault: false,
})

const typeDefaults: Record<ConnectionType, { apiUrl: string; name: string }> = {
  openai: { apiUrl: 'https://api.openai.com/v1', name: 'OpenAI' },
  deepseek: {
    apiUrl: 'https://api.deepseek.com',
    name: 'DeepSeek',
  },
  claude: {
    apiUrl: 'https://api.anthropic.com',
    name: 'Claude',
  },
  ollama: { apiUrl: 'http://localhost:11434', name: 'Ollama' },
  gemini: {
    apiUrl: 'https://generativelanguage.googleapis.com',
    name: 'Gemini',
  },
  kobold: { apiUrl: 'http://localhost:5001', name: 'KoboldAI' },
  custom: { apiUrl: '', name: '自定义连接' },
}

const typeLabels: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  claude: 'Claude',
  ollama: 'Ollama',
  gemini: 'Gemini',
  kobold: 'KoboldAI',
  custom: '自定义',
}

type ModelCategory = 'text' | 'image' | 'audio'

const modelCategories: Array<{
  key: ModelCategory
  label: string
  emptyLabel: string
}> = [
  { key: 'text', label: '文字模型', emptyLabel: '暂无文字模型连接' },
  { key: 'image', label: '图片模型', emptyLabel: '暂无图片模型连接' },
  { key: 'audio', label: '语音模型', emptyLabel: '暂无语音模型连接' },
]

const getModelCategory = (model: string): ModelCategory => {
  if (/(image|dall-?e|imagen|flux|sdxl|stable.?diffusion|recraft|ideogram|sora|video)/i.test(model)) {
    return 'image'
  }
  if (/(audio|speech|tts|voice|whisper|transcri|realtime)/i.test(model)) {
    return 'audio'
  }
  return 'text'
}

const connectionGroups = computed(() =>
  modelCategories.map((category) => ({
    ...category,
    connections: settingsStore.connections.filter(
      (connection) => getModelCategory(connection.model) === category.key
    ),
  }))
)

const isActive = computed(
  () => (id: string) => settingsStore.activeConnection?.id === id
)

const verificationLabels: Record<ConnectionVerificationStatus, string> = {
  unverified: '未验证',
  available: '可用',
  failed: '验证失败',
}

const verificationClasses: Record<ConnectionVerificationStatus, string> = {
  unverified: 'border-border bg-bg-tertiary text-text-secondary',
  available: 'border-green-200 bg-green-50 text-green-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
}

const getVerificationStatus = (
  connection: ConnectionConfig
): ConnectionVerificationStatus => connection.verificationStatus ?? 'unverified'

const formatLastVerified = (timestamp?: number) => {
  if (!timestamp) return '尚未验证'

  return `最后验证：${new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)}`
}

onMounted(async () => {
  await settingsStore.loadAll()
})

watch(
  () => formData.value.type,
  (newType, oldType) => {
    if (!newType || newType === oldType || editingId.value) return

    const defaults = typeDefaults[newType]
    if (!defaults) return

    formData.value.apiUrl = defaults.apiUrl
    formData.value.model = ''
    availableModels.value = []
    formResult.value = null
    formData.value.name = defaults.name
  }
)

watch(
  [() => formData.value.type, () => formData.value.apiUrl, () => formData.value.apiKey],
  () => {
    formResult.value = null
    availableModels.value = []
    formData.value.model = ''
  },
  { flush: 'sync' }
)

const startAdd = () => {
  editingId.value = null
  testResult.value = null
  formResult.value = null
  formData.value = {
    name: 'OpenAI',
    type: 'openai',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: '',
    isDefault: settingsStore.connections.length === 0,
  }
  availableModels.value = []
  showForm.value = true
}

const startEdit = (connection: ConnectionConfig) => {
  editingId.value = connection.id
  testResult.value = null
  formResult.value = null
  formData.value = { ...connection }
  formData.value.model = connection.model
  availableModels.value = connection.model ? [connection.model] : []
  showForm.value = true
  void validateFormConnection(false)
}

const closeForm = () => {
  showForm.value = false
  editingId.value = null
  formResult.value = null
}

const validateFormConnection = async (showSuccess = true) => {
  isValidating.value = true
  formResult.value = null

  try {
    const result = await api.testConnectionConfig(formData.value)
    availableModels.value = result.models
    if (!formData.value.model || !result.models.includes(formData.value.model)) {
      formData.value.model = result.models[0]
    }
    if (showSuccess) {
      formResult.value = {
        success: true,
        message: `Key 可用，已获取 ${result.models.length} 个模型`,
      }
    }
    return true
  } catch (error) {
    formResult.value = { success: false, message: (error as Error).message }
    return false
  } finally {
    isValidating.value = false
  }
}

const saveForm = async () => {
  if (!formData.value.name?.trim()) {
    formData.value.name = '新连接'
  }

  isSaving.value = true
  try {
    const isValid = await validateFormConnection(false)
    if (!isValid) return

    if (editingId.value) {
      await settingsStore.updateConnection(editingId.value, formData.value)
    } else {
      await settingsStore.createConnection(formData.value)
    }

    closeForm()
  } catch (error) {
    formResult.value = { success: false, message: (error as Error).message }
  } finally {
    isSaving.value = false
  }
}

const removeConnection = async (id: string) => {
  if (!confirm('确定删除这个连接吗？')) return
  await settingsStore.deleteConnection(id)
}

const setDefault = async (id: string) => {
  await settingsStore.updateConnection(id, { isDefault: true })
}

const setActive = async (id: string) => {
  await settingsStore.setActiveConnection(id)
}

const testConnection = async (id: string) => {
  testingId.value = id
  testResult.value = null

  try {
    const result = await api.testConnection(id)
    testResult.value = {
      success: result.success,
      message: result.success ? '连接成功' : '连接失败',
    }
  } catch (error) {
    testResult.value = { success: false, message: (error as Error).message }
  } finally {
    await settingsStore.loadConnections()
    testingId.value = null
  }
}

const testAllConnections = async () => {
  isTestingAll.value = true
  testResult.value = null

  try {
    const { results } = await api.testAllConnections()
    const successCount = results.filter((result) => result.success).length
    const failureCount = results.length - successCount
    testResult.value = {
      success: failureCount === 0,
      message: `测试完成：${successCount} 个可用，${failureCount} 个失败`,
    }
  } catch (error) {
    testResult.value = { success: false, message: (error as Error).message }
  } finally {
    await settingsStore.loadConnections()
    isTestingAll.value = false
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-4xl">
      <header class="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 class="font-serif text-2xl font-semibold text-text-primary">API 连接</h1>
          <p class="mt-1 text-sm text-text-secondary">
            管理模型服务，并选择聊天时使用的连接。
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            class="rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="settingsStore.connections.length === 0 || isTestingAll || testingId !== null"
            @click="testAllConnections"
          >
            {{ isTestingAll ? '测试中…' : '测试全部' }}
          </button>
          <button
            class="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-85"
            style="background: var(--accent-color)"
            @click="startAdd"
          >
            + 新建连接
          </button>
        </div>
      </header>

      <section class="rounded-xl border border-border bg-bg-secondary p-5 shadow-panel">
        <div
          v-if="settingsStore.connectionsError"
          class="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          role="alert"
        >
          <div>
            <p class="text-sm font-medium text-red-700">本地服务暂时不可用</p>
            <p class="mt-1 text-sm text-red-600">{{ settingsStore.connectionsError }}</p>
          </div>
          <button
            class="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            :disabled="settingsStore.isLoadingConnections"
            @click="settingsStore.loadConnections()"
          >
            {{ settingsStore.isLoadingConnections ? '重试中…' : '重新连接' }}
          </button>
        </div>

        <div
          v-else-if="settingsStore.connections.length === 0"
          class="flex min-h-52 flex-col items-center justify-center text-center"
        >
          <div
            class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary text-accent"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="22"
              viewBox="0 0 24 24"
              width="22"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.7"
            >
              <path d="M9 7V3M15 7V3M7 7h10v3a5 5 0 0 1-10 0zM12 15v6" />
            </svg>
          </div>
          <h2 class="font-medium text-text-primary">还没有 API 连接</h2>
          <p class="mt-1 max-w-sm text-sm text-text-secondary">
            添加 OpenAI、DeepSeek、Claude 或其他兼容服务后即可开始聊天。
          </p>
          <button
            class="mt-5 rounded-lg border border-border px-4 py-2 text-sm text-text-primary hover:bg-bg-tertiary"
            @click="startAdd"
          >
            新建第一个连接
          </button>
        </div>

        <div v-else class="space-y-6">
          <section v-for="group in connectionGroups" :key="group.key">
            <div class="mb-2.5 flex items-center gap-3">
              <h2 class="text-sm font-medium text-text-primary">{{ group.label }}</h2>
              <span class="text-xs text-text-secondary">{{ group.connections.length }}</span>
              <div class="h-px flex-1 bg-border"></div>
            </div>

            <div
              v-if="group.connections.length === 0"
              class="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-text-secondary"
            >
              {{ group.emptyLabel }}
            </div>

            <div v-else class="space-y-3">
              <article
                v-for="connection in group.connections"
                :key="connection.id"
                class="rounded-xl border border-border bg-bg-primary p-4"
              >
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-medium text-text-primary">{{ connection.name }}</h3>
                      <span
                        v-if="isActive(connection.id)"
                        class="rounded-full bg-bg-tertiary px-2 py-0.5 text-xs font-medium text-accent"
                      >
                        当前使用
                      </span>
                      <span
                        v-if="connection.isDefault"
                        class="rounded-full border border-border px-2 py-0.5 text-xs text-text-secondary"
                      >
                        默认
                      </span>
                      <span
                        class="rounded-full border px-2 py-0.5 text-xs font-medium"
                        :class="verificationClasses[getVerificationStatus(connection)]"
                      >
                        {{ verificationLabels[getVerificationStatus(connection)] }}
                      </span>
                    </div>
                    <p class="mt-2 text-sm text-text-secondary">
                      {{ typeLabels[connection.type] || connection.type }} · {{ connection.model }}
                    </p>
                  </div>

                  <div class="flex shrink-0 flex-col items-end">
                    <div class="flex flex-wrap justify-end gap-1.5">
                      <button
                        class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-50"
                        :disabled="testingId !== null || isTestingAll"
                        @click="testConnection(connection.id)"
                      >
                        {{ testingId === connection.id ? '测试中…' : '测试' }}
                      </button>
                      <button
                        v-if="!isActive(connection.id)"
                        class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        @click="setActive(connection.id)"
                      >
                        使用
                      </button>
                      <button
                        v-if="!connection.isDefault"
                        class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        @click="setDefault(connection.id)"
                      >
                        设为默认
                      </button>
                      <button
                        class="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        @click="startEdit(connection)"
                      >
                        编辑
                      </button>
                      <button
                        class="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                        @click="removeConnection(connection.id)"
                      >
                        删除
                      </button>
                    </div>
                    <p class="mt-1 max-w-sm text-right text-xs text-text-secondary">
                      {{ formatLastVerified(connection.lastVerifiedAt) }}
                      <span v-if="connection.verificationMessage">
                        · {{ connection.verificationMessage }}
                      </span>
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div
          v-if="testResult"
          class="mt-4 rounded-lg border px-3 py-2 text-sm"
          :class="
            testResult.success
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          "
          role="status"
        >
          {{ testResult.message }}
        </div>
      </section>

      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5"
        @click.self="closeForm"
      >
        <div class="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-bg-secondary p-6 shadow-panel">
          <div class="mb-5">
            <h2 class="font-serif text-xl font-semibold text-text-primary">
              {{ editingId ? '编辑连接' : '新建连接' }}
            </h2>
            <p class="mt-1 text-sm text-text-secondary">填写服务地址、密钥和要使用的模型。</p>
          </div>

          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm text-text-secondary" for="connection-name">名称</label>
              <input
                id="connection-name"
                v-model="formData.name"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="我的 OpenAI"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm text-text-secondary" for="connection-type">API 类型</label>
              <select
                id="connection-type"
                v-model="formData.type"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              >
                <option value="openai">OpenAI / OpenAI 兼容</option>
                <option value="deepseek">DeepSeek</option>
                <option value="claude">Claude（Anthropic 原生 API）</option>
                <option value="gemini">Google Gemini</option>
                <option value="custom">自定义（OpenAI 兼容）</option>
              </select>
            </div>

            <div>
              <label class="mb-1.5 block text-sm text-text-secondary" for="connection-url">API URL</label>
              <input
                id="connection-url"
                v-model="formData.apiUrl"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm text-text-secondary" for="connection-key">API Key</label>
              <input
                id="connection-key"
                v-model="formData.apiKey"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                :placeholder="formData.hasApiKey ? '已安全保存，留空表示不修改' : 'sk-...'"
                type="password"
              />
            </div>

            <div>
              <div class="mb-1.5 flex items-center justify-between gap-3">
                <label class="text-sm text-text-secondary" for="connection-model">模型</label>
                <button
                  class="text-xs text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="isValidating || isSaving"
                  @click="validateFormConnection()"
                >
                  {{ isValidating ? '正在验证…' : '验证 Key 并获取模型' }}
                </button>
              </div>
              <select
                id="connection-model"
                v-model="formData.model"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                :disabled="availableModels.length === 0 || isValidating || isSaving"
              >
                <option v-if="availableModels.length === 0" value="" disabled>
                  请先验证 Key 并获取模型
                </option>
                <option v-for="model in availableModels" :key="model" :value="model">
                  {{ model }}
                </option>
              </select>

              <p
                v-if="formResult"
                class="mt-2 text-xs"
                :class="formResult.success ? 'text-green-700' : 'text-red-600'"
                role="status"
              >
                {{ formResult.message }}
              </p>
            </div>

            <label class="flex items-center gap-2 text-sm text-text-secondary">
              <input v-model="formData.isDefault" class="h-4 w-4" type="checkbox" />
              设为默认连接
            </label>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
              @click="closeForm"
            >
              取消
            </button>
            <button
              class="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isSaving || isValidating"
              style="background: var(--accent-color)"
              @click="saveForm"
            >
              {{ isSaving ? '正在验证…' : '保存连接' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
