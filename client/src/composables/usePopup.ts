import { ref, watch, onUnmounted } from 'vue'

const activePopupId = ref<string | null>(null)

function handleOutsideClick(_e: MouseEvent) {
  activePopupId.value = null
}

export function usePopup() {
  const id = `popup_${Math.random().toString(36).slice(2, 8)}`
  const isOpen = ref(false)

  function open() {
    activePopupId.value = id
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
    if (activePopupId.value === id) {
      activePopupId.value = null
    }
  }
  function toggle() {
    isOpen.value ? close() : open()
  }

  watch(activePopupId, (val) => {
    if (val !== id) isOpen.value = false
  })

  watch(isOpen, (val) => {
    if (val) {
      setTimeout(() => document.addEventListener('mousedown', handleOutsideClick), 0)
    } else {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('mousedown', handleOutsideClick)
    if (activePopupId.value === id) {
      activePopupId.value = null
    }
  })

  return { isOpen, open, close, toggle }
}