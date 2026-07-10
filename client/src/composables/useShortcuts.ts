import { onMounted, onUnmounted } from 'vue'
import { useChatStore } from '@/stores/chat'

export function useShortcuts() {
  const chatStore = useChatStore()

  function handleKeydown(e: KeyboardEvent) {
    // Ctrl/Cmd + K: New chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      chatStore.clearActiveSession()
      return
    }

    // Ctrl/Cmd + F: Focus search (handled in ChatWindow)
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      const searchBtn = document.querySelector('[data-search-toggle]') as HTMLButtonElement | null
      if (searchBtn) {
        e.preventDefault()
        searchBtn.click()
      }
      return
    }

    // Ctrl/Cmd + Enter: Regenerate last message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!chatStore.isGenerating && chatStore.messages.length > 0) {
        chatStore.regenerate()
      }
      return
    }

    // Escape: Stop generation or close modals
    if (e.key === 'Escape') {
      if (chatStore.isGenerating) {
        chatStore.stopGeneration()
      }
      return
    }

    // Only handle below if not typing in an input
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return
    }

    // Up arrow: Edit last user message
    if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const lastUserMsg = [...chatStore.messages].reverse().find((m) => m.role === 'user')
      if (lastUserMsg) {
        e.preventDefault()
        const editBtn = document.querySelector(`[data-msg-id="${lastUserMsg.id}"] [data-action="edit"]`) as HTMLButtonElement | null
        editBtn?.click()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}