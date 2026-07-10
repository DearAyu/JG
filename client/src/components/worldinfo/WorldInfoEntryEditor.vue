<script setup lang="ts">
import { ref, watch } from 'vue'
import type { WorldBookEntry } from '@shared/types'

const props = defineProps<{
  entry: WorldBookEntry
}>()

const emit = defineEmits<{
  save: [entry: WorldBookEntry]
  close: []
}>()

const form = ref<WorldBookEntry>({ ...props.entry })

const keyInput = ref('')
const secondaryKeyInput = ref('')

watch(
  () => props.entry,
  (entry) => {
    form.value = { ...entry }
  },
  { immediate: true }
)

function addKey() {
  const key = keyInput.value.trim()
  if (key && !form.value.keys.includes(key)) {
    form.value.keys = [...form.value.keys, key]
  }
  keyInput.value = ''
}

function removeKey(key: string) {
  form.value.keys = form.value.keys.filter((k) => k !== key)
}

function addSecondaryKey() {
  const key = secondaryKeyInput.value.trim()
  if (key && !form.value.secondaryKeys.includes(key)) {
    form.value.secondaryKeys = [...form.value.secondaryKeys, key]
  }
  secondaryKeyInput.value = ''
}

function removeSecondaryKey(key: string) {
  form.value.secondaryKeys = form.value.secondaryKeys.filter((k) => k !== key)
}

function handleSave() {
  emit('save', { ...form.value })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-bg-secondary">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-text-primary">编辑条目</h3>
        <button class="text-text-secondary hover:text-text-primary" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <!-- Comment -->
        <div>
          <label class="mb-1 block text-sm text-text-secondary">备注 (条目名称)</label>
          <input
            v-model="form.comment"
            class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
            placeholder="给这个条目一个名字..."
          />
        </div>

        <!-- Primary Keys -->
        <div>
          <label class="mb-1 block text-sm text-text-secondary">
            主关键词
            <span class="text-xs">(触发条件 - 任一匹配即激活)</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="keyInput"
              class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="输入关键词后回车"
              @keydown.enter.prevent="addKey"
            />
            <button
              class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
              @click="addKey"
            >
              添加
            </button>
          </div>
          <div v-if="form.keys.length > 0" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="key in form.keys"
              :key="key"
              class="flex items-center gap-1 rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-primary"
            >
              {{ key }}
              <button class="text-text-secondary hover:text-red-400" @click="removeKey(key)">×</button>
            </span>
          </div>
        </div>

        <!-- Secondary Keys -->
        <div>
          <label class="mb-1 block text-sm text-text-secondary">
            次要关键词
            <span class="text-xs">(选择性模式下与主关键词组合)</span>
          </label>
          <div class="flex gap-2">
            <input
              v-model="secondaryKeyInput"
              class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="输入次要关键词后回车"
              @keydown.enter.prevent="addSecondaryKey"
            />
            <button
              class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
              @click="addSecondaryKey"
            >
              添加
            </button>
          </div>
          <div v-if="form.secondaryKeys.length > 0" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="key in form.secondaryKeys"
              :key="key"
              class="flex items-center gap-1 rounded-full bg-bg-tertiary/50 px-3 py-1 text-xs text-text-secondary"
            >
              {{ key }}
              <button class="text-text-secondary hover:text-red-400" @click="removeSecondaryKey(key)">×</button>
            </span>
          </div>
        </div>

        <!-- Content -->
        <div>
          <label class="mb-1 block text-sm text-text-secondary">内容 (注入到上下文的文本)</label>
          <textarea
            v-model="form.content"
            rows="6"
            class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
            placeholder="当关键词被触发时，这段内容会被注入到提示词中..."
          ></textarea>
        </div>

        <!-- Options -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Position -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">注入位置</label>
            <select
              v-model="form.position"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none"
            >
              <option value="before_char">角色描述之前</option>
              <option value="after_char">角色描述之后</option>
              <option value="at_depth">指定深度</option>
            </select>
          </div>

          <!-- Depth -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">深度 (消息数)</label>
            <input
              v-model.number="form.depth"
              type="number"
              min="0"
              max="50"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              :disabled="form.position !== 'at_depth'"
            />
          </div>

          <!-- Order -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">排序 (越小越先)</label>
            <input
              v-model.number="form.insertionOrder"
              type="number"
              min="0"
              max="1000"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
            />
          </div>

          <!-- Toggles -->
          <div class="flex items-end gap-4">
            <div class="flex items-center gap-2">
              <input
                v-model="form.constant"
                type="checkbox"
                id="constant"
                class="h-4 w-4"
              />
              <label for="constant" class="text-sm text-text-secondary">常驻</label>
            </div>
            <div class="flex items-center gap-2">
              <input
                v-model="form.selective"
                type="checkbox"
                id="selective"
                class="h-4 w-4"
              />
              <label for="selective" class="text-sm text-text-secondary">选择性</label>
            </div>
          </div>
        </div>

        <!-- Help -->
        <div class="rounded-lg bg-bg-tertiary p-3 text-xs text-text-secondary">
          <p><strong>常驻</strong>: 不需要关键词触发，始终注入到上下文</p>
          <p><strong>选择性</strong>: 需要主关键词和次要关键词同时匹配才激活</p>
          <p><strong>排序</strong>: 数字越小，在提示词中越靠前</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 border-t border-border px-6 py-4">
        <button
          class="rounded-lg border border-border px-4 py-2 text-text-secondary hover:bg-bg-tertiary"
          @click="emit('close')"
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
</template>