<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { Character } from '@shared/types'
import { useCharacterStore } from '@/stores/character'
import { useWorldInfoStore } from '@/stores/worldinfo'

const props = defineProps<{
  character: Partial<Character> | null
  isNew: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [char: Character]
}>()

const characterStore = useCharacterStore()
const worldInfoStore = useWorldInfoStore()

onMounted(async () => {
  await worldInfoStore.loadBooks()
})

const activeTab = ref<'basic' | 'scenario' | 'advanced'>('basic')

const form = ref<Partial<Character>>({
  name: '',
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
  tags: [],
  creator: '',
  character_version: '1.0',
  alternate_greetings: [],
  extensions: {},
  worldBookId: null,
})

const tagInput = ref('')
const avatarData = ref<string | null>(null)

watch(
  () => props.character,
  (char) => {
    if (char) {
      form.value = { ...char }
    }
  },
  { immediate: true }
)

const title = computed(() => (props.isNew ? '创建角色' : '编辑角色'))

const alternateGreetingsText = computed({
  get: () => (form.value.alternate_greetings || []).join('\n'),
  set: (val: string) => {
    form.value.alternate_greetings = val.split('\n').filter((l) => l.trim())
  },
})

const editingCharWithAvatar = computed(() => {
  if (props.character && (props.character as Character & { hasAvatar?: boolean }).hasAvatar) {
    return props.character as Character & { hasAvatar?: boolean }
  }
  return null
})

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.value.tags?.includes(tag)) {
    form.value.tags = [...(form.value.tags || []), tag]
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags?.filter((t) => t !== tag)
}

function handleAvatarUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    avatarData.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

async function handleSave() {
  const data = { ...form.value }
  let saved: Character

  if (props.isNew) {
    saved = await characterStore.createCharacter(data)
  } else if (props.character?.id) {
    saved = await characterStore.updateCharacter(props.character.id, data)
  } else {
    return
  }

  if (avatarData.value) {
    await characterStore.uploadAvatar(saved.id, avatarData.value)
  }

  emit('saved', saved)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-bg-secondary">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h3 class="text-lg font-semibold text-text-primary">{{ title }}</h3>
        <button class="text-text-secondary hover:text-text-primary" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-border px-6">
        <button
          v-for="tab in [
            { key: 'basic', label: '基本信息' },
            { key: 'scenario', label: '场景' },
            { key: 'advanced', label: '高级' },
          ]"
          :key="tab.key"
          class="border-b-2 px-4 py-2 text-sm transition-colors"
          :class="
            activeTab === tab.key
              ? 'border-accent text-text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          "
          @click="activeTab = tab.key as typeof activeTab"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <!-- Basic Tab -->
        <div v-if="activeTab === 'basic'" class="space-y-4">
          <!-- Avatar -->
          <div class="flex items-center gap-4">
            <div
              class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary"
            >
              <img
                v-if="avatarData"
                :src="avatarData"
                class="h-full w-full object-cover"
              />
              <img
                v-else-if="editingCharWithAvatar?.id"
                :src="characterStore.avatarUrl(editingCharWithAvatar.id)"
                class="h-full w-full object-cover"
              />
              <span v-else class="text-3xl text-text-secondary">👤</span>
            </div>
            <div>
              <label
                class="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
              >
                上传头像
                <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
              </label>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">名字</label>
            <input
              v-model="form.name"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="角色名称"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">描述</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="角色的外貌、背景、身份等描述..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">性格</label>
            <textarea
              v-model="form.personality"
              rows="3"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="角色的性格特点..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">标签</label>
            <div class="flex gap-2">
              <input
                v-model="tagInput"
                class="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="输入标签后回车"
                @keydown.enter.prevent="addTag"
              />
              <button
                class="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-tertiary"
                @click="addTag"
              >
                添加
              </button>
            </div>
            <div v-if="form.tags && form.tags.length > 0" class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="tag in form.tags"
                :key="tag"
                class="flex items-center gap-1 rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-primary"
              >
                {{ tag }}
                <button class="text-text-secondary hover:text-red-400" @click="removeTag(tag)">×</button>
              </span>
            </div>
          </div>
        </div>

        <!-- Scenario Tab -->
        <div v-if="activeTab === 'scenario'" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm text-text-secondary">场景 (Scenario)</label>
            <textarea
              v-model="form.scenario"
              rows="4"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="对话发生的背景场景描述..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">第一条消息 (First Message)</label>
            <textarea
              v-model="form.first_mes"
              rows="5"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="角色发送的第一条消息，用于设定对话的起点..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">示例对话 (Message Example)</label>
            <textarea
              v-model="form.mes_example"
              rows="5"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder='示例对话格式:\n<START>\n{{user}}: 你好\n{{char}}: 你好！'
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">备选开场白 (Alternate Greetings)</label>
            <textarea
              v-model="alternateGreetingsText"
              rows="3"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="每行一个备选开场白..."
            ></textarea>
            <p class="mt-1 text-xs text-text-secondary">每行一个备选的第一条消息</p>
          </div>
        </div>

        <!-- Advanced Tab -->
        <div v-if="activeTab === 'advanced'" class="space-y-4">
          <!-- World Book binding -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">绑定世界书</label>
            <select
              v-model="form.worldBookId"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
            >
              <option :value="null">无</option>
              <option v-for="book in worldInfoStore.books" :key="book.id" :value="book.id">
                {{ book.name }} ({{ book.entryCount ?? 0 }} 条目)
              </option>
            </select>
            <p class="mt-1 text-xs text-text-secondary">绑定后，世界书中的条目会根据关键词自动注入到提示词中</p>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">System Prompt</label>
            <textarea
              v-model="form.system_prompt"
              rows="3"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="覆盖默认 system prompt（留空则使用全局设置）..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">Post-History Instructions</label>
            <textarea
              v-model="form.post_history_instructions"
              rows="3"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="在聊天历史之后注入的指令..."
            ></textarea>
          </div>

          <div>
            <label class="mb-1 block text-sm text-text-secondary">创作者备注</label>
            <textarea
              v-model="form.creator_notes"
              rows="3"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="给其他使用者的备注..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1 block text-sm text-text-secondary">创作者</label>
              <input
                v-model="form.creator"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="你的名字"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-text-secondary">角色版本</label>
              <input
                v-model="form.character_version"
                class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                placeholder="1.0"
              />
            </div>
          </div>
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