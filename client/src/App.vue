<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { useSettingsStore } from '@/stores/settings'
import { applyTheme } from '@/composables/useTheme'

const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.loadAll()
  applyTheme(settingsStore.settings)
})

watch(
  () => ({ ...settingsStore.settings }),
  (s) => applyTheme(s),
  { deep: true }
)
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
    <AppSidebar />
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>