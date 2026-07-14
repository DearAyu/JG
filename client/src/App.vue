<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ChatList from '@/components/chat/ChatList.vue'
import { useSettingsStore } from '@/stores/settings'
import { applyTheme } from '@/composables/useTheme'

const settingsStore = useSettingsStore()
const route = useRoute()

const isChatPage = computed(() => route.path === '/chat' || route.path === '/')

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
    <ChatList v-if="isChatPage" />
    <main class="flex-1 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>