<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useExtensionStore } from '@/stores/extension'
import { getBuiltinExtensions } from '@/extensions'
import type { ExtensionManifest } from '@shared/types'

const extStore = useExtensionStore()
const selectedId = ref<string | null>(null)

onMounted(async () => {
  for (const ext of getBuiltinExtensions()) {
    extStore.register(ext)
  }
  await extStore.loadStates()
  if (extStore.manifests.length > 0) {
    selectedId.value = extStore.manifests[0].id
  }
})

const selectedExtension = computed<ExtensionManifest | null>(() => {
  if (!selectedId.value) return null
  return extStore.manifests.find((m) => m.id === selectedId.value) ?? null
})

function getSettingValue(extId: string, key: string): string | number | boolean {
  const manifest = extStore.manifests.find((m) => m.id === extId)
  if (!manifest) return ''
  const state = extStore.states.get(extId)
  if (state?.settings[key] !== undefined) return state.settings[key]
  const setting = manifest.settings.find((s) => s.key === key)
  return setting?.default ?? ''
}

async function handleToggle(extId: string) {
  await extStore.toggle(extId)
}

async function handleSettingChange(extId: string, key: string, value: string | number | boolean) {
  await extStore.updateSetting(extId, key, value)
}

function handleAction(extId: string, actionId: string) {
  extStore.runAction(extId, actionId)
}
</script>

<template>
  <div class="flex h-full">
    <!-- Extension list -->
    <div class="w-64 shrink-0 border-r border-border bg-bg-secondary">
      <div class="border-b border-border px-3 py-3">
        <span class="text-sm font-semibold text-text-primary">扩展</span>
      </div>
      <div class="overflow-y-auto">
        <div v-if="extStore.manifests.length === 0" class="px-3 py-8 text-center text-sm text-text-secondary">
          没有可用扩展
        </div>
        <div
          v-for="ext in extStore.manifests"
          :key="ext.id"
          class="cursor-pointer border-b border-border/50 px-3 py-2.5 hover:bg-bg-tertiary"
          :class="selectedId === ext.id ? 'bg-bg-tertiary' : ''"
          @click="selectedId = ext.id"
        >
          <div class="flex items-center gap-2">
            <span class="text-xl">{{ ext.icon }}</span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm text-text-primary">{{ ext.name }}</div>
              <div class="truncate text-xs text-text-secondary">v{{ ext.version }}</div>
            </div>
            <div
              class="h-2 w-2 rounded-full"
              :class="extStore.isEnabled(ext.id) ? 'bg-green-500' : 'bg-gray-500'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Detail -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <div v-if="!selectedExtension" class="flex h-full items-center justify-center">
        <div class="text-center">
          <div class="mb-2 text-6xl">🧩</div>
          <p class="text-text-secondary">选择一个扩展查看详情</p>
        </div>
      </div>

      <template v-else>
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ selectedExtension.icon }}</span>
            <div>
              <h2 class="text-lg font-semibold text-text-primary">{{ selectedExtension.name }}</h2>
              <p class="text-xs text-text-secondary">v{{ selectedExtension.version }} · {{ selectedExtension.author }}</p>
            </div>
          </div>
          <button
            class="relative h-6 w-11 rounded-full transition-colors"
            :class="extStore.isEnabled(selectedExtension.id) ? 'bg-accent' : 'bg-bg-tertiary'"
            :style="extStore.isEnabled(selectedExtension.id) ? 'background: var(--accent-color)' : ''"
            @click="handleToggle(selectedExtension.id)"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
              :class="extStore.isEnabled(selectedExtension.id) ? 'translate-x-5' : 'translate-x-0.5'"
            />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="mx-auto max-w-2xl space-y-6">
            <!-- Description -->
            <section class="rounded-lg border border-border bg-bg-secondary p-4">
              <p class="text-sm text-text-secondary">{{ selectedExtension.description }}</p>
            </section>

            <!-- Actions -->
            <section v-if="selectedExtension.actions.length > 0" class="rounded-lg border border-border bg-bg-secondary p-5">
              <h3 class="mb-3 text-base font-semibold text-text-primary">操作</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="action in selectedExtension.actions"
                  :key="action.id"
                  class="flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm text-text-primary transition-colors hover:border-accent"
                  :class="{ 'opacity-50': !extStore.isEnabled(selectedExtension.id) }"
                  :disabled="!extStore.isEnabled(selectedExtension.id)"
                  @click="handleAction(selectedExtension.id, action.id)"
                >
                  <span>{{ action.icon }}</span>
                  <span>{{ action.label }}</span>
                </button>
              </div>
              <p v-if="!extStore.isEnabled(selectedExtension.id)" class="mt-2 text-xs text-text-secondary">
                请先启用此扩展
              </p>
            </section>

            <!-- Settings -->
            <section v-if="selectedExtension.settings.length > 0" class="rounded-lg border border-border bg-bg-secondary p-5">
              <h3 class="mb-4 text-base font-semibold text-text-primary">设置</h3>
              <div class="space-y-4">
                <div v-for="setting in selectedExtension.settings" :key="setting.key">
                  <label class="mb-1 block text-sm text-text-secondary">{{ setting.label }}</label>

                  <!-- Text -->
                  <input
                    v-if="setting.type === 'text'"
                    type="text"
                    :value="getSettingValue(selectedExtension.id, setting.key) as string"
                    class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                    :placeholder="setting.placeholder"
                    @change="handleSettingChange(selectedExtension.id, setting.key, ($event.target as HTMLInputElement).value)"
                  />

                  <!-- Number -->
                  <input
                    v-else-if="setting.type === 'number'"
                    type="number"
                    :value="getSettingValue(selectedExtension.id, setting.key) as number"
                    class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
                    @change="handleSettingChange(selectedExtension.id, setting.key, Number(($event.target as HTMLInputElement).value))"
                  />

                  <!-- Boolean -->
                  <button
                    v-else-if="setting.type === 'boolean'"
                    class="relative h-6 w-11 rounded-full transition-colors"
                    :class="getSettingValue(selectedExtension.id, setting.key) ? 'bg-accent' : 'bg-bg-tertiary'"
                    :style="getSettingValue(selectedExtension.id, setting.key) ? 'background: var(--accent-color)' : ''"
                    @click="handleSettingChange(selectedExtension.id, setting.key, !getSettingValue(selectedExtension.id, setting.key))"
                  >
                    <span
                      class="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                      :class="getSettingValue(selectedExtension.id, setting.key) ? 'translate-x-5' : 'translate-x-0.5'"
                    />
                  </button>

                  <!-- Select -->
                  <select
                    v-else-if="setting.type === 'select'"
                    :value="getSettingValue(selectedExtension.id, setting.key) as string"
                    class="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none"
                    @change="handleSettingChange(selectedExtension.id, setting.key, ($event.target as HTMLSelectElement).value)"
                  >
                    <option
                      v-for="opt in setting.options"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </option>
                  </select>

                  <!-- Color -->
                  <input
                    v-else-if="setting.type === 'color'"
                    type="color"
                    :value="getSettingValue(selectedExtension.id, setting.key) as string"
                    class="h-8 w-full cursor-pointer rounded border border-border bg-transparent"
                    @input="handleSettingChange(selectedExtension.id, setting.key, ($event.target as HTMLInputElement).value)"
                  />

                  <p v-if="setting.description" class="mt-1 text-xs text-text-secondary">{{ setting.description }}</p>
                </div>
              </div>
            </section>

            <!-- Hooks info -->
            <section v-if="selectedExtension.hooks && selectedExtension.hooks.length > 0" class="rounded-lg border border-border bg-bg-secondary p-4">
              <h3 class="mb-2 text-sm font-semibold text-text-primary">钩子</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="hook in selectedExtension.hooks"
                  :key="hook.type"
                  class="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary"
                >
                  {{ hook.type }}
                </span>
              </div>
            </section>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>