<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePersonaStore } from '@/stores/persona'
import type { Persona } from '@shared/types'

const personaStore = usePersonaStore()

const showEditor = ref(false)
const editingPersona = ref<Partial<Persona> | null>(null)
const isNew = ref(false)
const avatarData = ref<string | null>(null)

onMounted(async () => {
  await personaStore.loadPersonas()
})

function startNew() {
  editingPersona.value = { name: '', description: '' }
  isNew.value = true
  avatarData.value = null
  showEditor.value = true
}

function startEdit(persona: Persona) {
  editingPersona.value = { ...persona }
  isNew.value = false
  avatarData.value = null
  showEditor.value = true
}

async function handleSave() {
  const data = { ...editingPersona.value }
  let saved: Persona
  if (isNew.value) {
    saved = await personaStore.createPersona(data)
  } else if (editingPersona.value?.id) {
    saved = await personaStore.updatePersona(editingPersona.value.id, data)
  } else {
    return
  }
  if (avatarData.value) {
    await personaStore.uploadAvatar(saved.id, avatarData.value)
  }
  showEditor.value = false
}

async function handleDelete(id: string) {
  if (confirm('确定删除这个用户人设吗？')) {
    await personaStore.deletePersona(id)
  }
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

const editingAvatarUrl = computed(() => {
  if (avatarData.value) return avatarData.value
  if (editingPersona.value?.id && (editingPersona.value as Persona & { hasAvatar?: boolean }).hasAvatar) {
    return personaStore.avatarUrl(editingPersona.value.id)
  }
  return null
})
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-3xl">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">用户人设</h1>
          <p class="mt-1 text-sm text-text-secondary">创建你的人设，让 AI 了解你是谁</p>
        </div>
        <button
          class="rounded-lg px-4 py-2 text-sm text-white hover:opacity-80"
          style="background: var(--accent-color)"
          @click="startNew"
        >
          + 创建人设
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="personaStore.personas.length === 0"
        class="flex flex-col items-center justify-center gap-4 py-20"
      >
        <div class="text-6xl">🎭</div>
        <p class="text-text-secondary">还没有人设，点击"创建人设"开始</p>
      </div>

      <!-- Persona list -->
      <div v-else class="space-y-3">
        <div
          v-for="persona in personaStore.personas"
          :key="persona.id"
          class="group flex items-center gap-4 rounded-lg border border-border bg-bg-secondary p-4 transition-colors hover:border-accent"
        >
          <!-- Avatar -->
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary"
          >
            <img
              v-if="persona.hasAvatar"
              :src="personaStore.avatarUrl(persona.id)"
              class="h-full w-full object-cover"
            />
            <span v-else class="text-2xl">🎭</span>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-medium text-text-primary">{{ persona.name || '未命名' }}</h3>
            <p class="truncate text-sm text-text-secondary">{{ persona.description || '暂无描述' }}</p>
          </div>

          <!-- Actions -->
          <div class="flex shrink-0 gap-1">
            <button
              class="rounded-lg p-2 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              title="编辑"
              @click="startEdit(persona)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              class="rounded-lg p-2 text-text-secondary hover:text-red-400"
              title="删除"
              @click="handleDelete(persona.id)"
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
    <div
      v-if="showEditor"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="showEditor = false"
    >
      <div class="w-full max-w-lg rounded-lg border border-border bg-bg-secondary p-6">
        <h3 class="mb-4 text-lg font-semibold text-text-primary">
          {{ isNew ? '创建人设' : '编辑人设' }}
        </h3>

        <div class="space-y-4">
          <!-- Avatar -->
          <div class="flex items-center gap-4">
            <div
              class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-tertiary"
            >
              <img v-if="editingAvatarUrl" :src="editingAvatarUrl" class="h-full w-full object-cover" />
              <span v-else class="text-3xl text-text-secondary">🎭</span>
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

          <!-- Name -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">名字</label>
            <input
              v-model="editingPersona!.name"
              class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="你的名字或昵称"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="mb-1 block text-sm text-text-secondary">描述</label>
            <textarea
              v-model="editingPersona!.description"
              rows="6"
              class="w-full resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              placeholder="描述你的身份、性格、背景等信息，这些会注入到 AI 的上下文中..."
            ></textarea>
            <p class="mt-1 text-xs text-text-secondary">这段描述会作为用户人设注入到提示词中</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
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