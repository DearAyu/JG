<script setup lang="ts">
import { onMounted } from 'vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import { useSettingsStore } from '@/stores/settings'
import { useChatStore } from '@/stores/chat'

const settingsStore = useSettingsStore()
const chatStore = useChatStore()

onMounted(async () => {
  await settingsStore.loadAll()
  await chatStore.loadSessions()
})
</script>

<template>
  <ChatWindow />
</template>