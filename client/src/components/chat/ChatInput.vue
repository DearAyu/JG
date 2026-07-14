<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { useExtensionStore } from '@/stores/extension'
import { useChatStore } from '@/stores/chat'
import { useCharacterStore } from '@/stores/character'
import { usePopup } from '@/composables/usePopup'

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const showCommands = ref(false)
const showMention = ref(false)
const mentionFilter = ref('')
const { isOpen: showEmoji, toggle: toggleEmoji, close: closeEmoji } = usePopup()
const uploadedFiles = ref<{ name: string; dataUrl: string }[]>([])
const commandFilter = ref('')

const chatStore = useChatStore()
const characterStore = useCharacterStore()

const groupChars = computed(() => {
  const ids = chatStore.activeSession?.characterIds ?? []
  return ids.map((id) => characterStore.characters.find((c) => c.id === id)).filter(Boolean)
})

const filteredMentions = computed(() => {
  const q = mentionFilter.value.toLowerCase()
  return groupChars.value.filter((c) => c!.name.toLowerCase().includes(q))
})

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const props = defineProps<{
  isGenerating: boolean
}>()

const extStore = useExtensionStore()

const commands = [
  { label: '掷 D20', cmd: '/d20', action: () => extStore.runAction('dice-roller', 'roll-d20') },
  { label: '掷 D6', cmd: '/d6', action: () => extStore.runAction('dice-roller', 'roll-d6') },
  { label: '自定义掷骰', cmd: '/roll', action: () => extStore.runAction('dice-roller', 'roll-custom') },
  { label: '翻译最后一条', cmd: '/translate', action: () => extStore.runAction('translator', 'translate-last') },
  { label: '翻译输入为英文', cmd: '/en', action: () => extStore.runAction('translator', 'translate-input') },
  { label: '朗读最后一条', cmd: '/speak', action: () => extStore.runAction('tts', 'speak-last') },
  { label: '停止朗读', cmd: '/stop-speak', action: () => extStore.runAction('tts', 'stop-speak') },
]

const filteredCommands = computed(() => {
  const q = commandFilter.value.toLowerCase()
  return commands.filter((c) => c.cmd.includes(q) || c.label.includes(q))
})

const commonEmojis = [
  '😀','😂','🥰','😎','🤔','😢','😡','👍','👎','👏','🙏','💪',
  '❤️','🔥','⭐','🎉','💡','📝','✅','❌','⚠️','💬','📎','🔗',
  '🎲','🎭','📖','⚙️','🔧','🧩','🌐','🔊','🎤','🎵','🌈','💻',
  '🍕','☕','🍺','🎮','🚀','💼','📅','⏰','💵','🏠','🌍','🛡️',
]

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function handleSubmit() {
  const text = input.value.trim()
  const hasFiles = uploadedFiles.value.length > 0
  if (!text && !hasFiles) return
  if (props.isGenerating) return

  let finalText = text
  if (hasFiles) {
    const fileLines = uploadedFiles.value.map((f) => `[文件: ${f.name}]`)
    finalText = fileLines.join('\n') + (text ? '\n' + text : '')
  }

  emit('send', finalText)
  input.value = ''
  uploadedFiles.value = []
  nextTick(() => {
    const el = textareaRef.value
    if (el) { el.style.height = 'auto' }
  })
}

function handleKeyDown(e: KeyboardEvent) {
  if (showCommands.value || showMention.value) {
    if (e.key === 'Escape') { closeCommands(); showMention.value = false; return }
    if (e.key === 'Enter') { e.preventDefault(); return }
    return
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

function onInput() {
  autoResize()
  const value = input.value
  const cursorPos = textareaRef.value?.selectionStart ?? value.length
  const textBeforeCursor = value.slice(0, cursorPos)

  // @mention detection (only in group chats)
  const lastAt = textBeforeCursor.lastIndexOf('@')
  const lastSpace = textBeforeCursor.lastIndexOf(' ')
  if (groupChars.value.length > 0 && lastAt > lastSpace) {
    mentionFilter.value = textBeforeCursor.slice(lastAt + 1)
    showMention.value = true
    showCommands.value = false
    return
  }
  showMention.value = false

  // /command detection
  const lastSlash = textBeforeCursor.lastIndexOf('/')
  if (lastSlash > lastSpace || lastSlash === 0) {
    commandFilter.value = textBeforeCursor.slice(lastSlash + 1)
    showCommands.value = true
  } else {
    closeCommands()
  }
}

function selectCommand(cmd: (typeof commands)[0]) {
  const value = input.value
  const cursorPos = textareaRef.value?.selectionStart ?? value.length
  const textBeforeCursor = value.slice(0, cursorPos)
  const lastSlash = textBeforeCursor.lastIndexOf('/')
  if (lastSlash !== -1) {
    input.value = value.slice(0, lastSlash)
    closeCommands()
    nextTick(() => textareaRef.value?.focus())
    cmd.action()
  }
}

function selectMention(char: NonNullable<(typeof groupChars.value)[0]>) {
  const value = input.value
  const cursorPos = textareaRef.value?.selectionStart ?? value.length
  const textBeforeCursor = value.slice(0, cursorPos)
  const lastAt = textBeforeCursor.lastIndexOf('@')
  if (lastAt !== -1) {
    const before = value.slice(0, lastAt)
    const after = value.slice(cursorPos)
    input.value = before + '@' + char.name + ' ' + after
    showMention.value = false
    nextTick(() => {
      const el = textareaRef.value
      if (el) {
        const newPos = before.length + char.name.length + 2
        el.focus()
        el.setSelectionRange(newPos, newPos)
      }
    })
  }
}

function closeCommands() {
  showCommands.value = false
  commandFilter.value = ''
}

function insertEmoji(emoji: string) {
  const el = textareaRef.value
  if (!el) { input.value += emoji; return }
  const start = el.selectionStart
  const end = el.selectionEnd
  input.value = input.value.slice(0, start) + emoji + input.value.slice(end)
  closeEmoji()
  nextTick(() => {
    el.focus()
    const newPos = start + emoji.length
    el.setSelectionRange(newPos, newPos)
  })
}

function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) {
      uploadedFiles.value.push({ name: file.name, dataUrl: '' })
      continue
    }
    const reader = new FileReader()
    reader.onload = () => uploadedFiles.value.push({ name: file.name, dataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }
  target.value = ''
}

function removeFile(idx: number) {
  uploadedFiles.value.splice(idx, 1)
}
</script>

<template>
  <input ref="fileInputRef" type="file" multiple accept="image/*,.txt,.pdf,.json,.md" class="hidden" @change="handleFileUpload" />
  <div class="border-t border-border bg-bg-secondary">
    <!-- File preview -->
    <div v-if="uploadedFiles.length > 0" class="flex flex-wrap gap-2 px-2 pt-1.5">
      <div
        v-for="(file, idx) in uploadedFiles"
        :key="idx"
        class="flex items-center gap-1 rounded bg-bg-tertiary px-2 py-1 text-xs text-text-secondary"
      >
        <span>{{ file.name }}</span>
        <button class="text-red-400 hover:text-red-300" @click="removeFile(idx)">×</button>
      </div>
    </div>

    <!-- Input area -->
    <div class="px-2 py-1.5">
      <!-- Textarea -->
      <div class="relative">
        <textarea
          ref="textareaRef"
          v-model="input"
          rows="1"
          class="min-h-[150px] w-full resize-none rounded bg-bg-primary px-3 pt-2 pb-10 text-sm text-text-primary outline-none"
          :placeholder="groupChars.length > 0 ? '输入消息... (@提及某人, /命令)' : '输入消息... (Enter 发送, Shift+Enter 换行, 输入 / 使用命令)'"
          :disabled="isGenerating"
          @keydown="handleKeyDown"
          @input="onInput"
        />

        <!-- Slash command popup -->
        <div
          v-if="showCommands && filteredCommands.length > 0"
          class="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-border bg-bg-secondary shadow-lg"
          @mousedown.stop
        >
          <div
            v-for="cmd in filteredCommands"
            :key="cmd.cmd"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary first:rounded-t-lg last:rounded-b-lg"
            @mousedown.prevent="selectCommand(cmd)"
          >
            <span class="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs text-text-secondary font-mono">{{ cmd.cmd }}</span>
            <span>{{ cmd.label }}</span>
          </div>
        </div>

        <!-- @Mention popup -->
        <div
          v-if="showMention && filteredMentions.length > 0"
          class="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-lg border border-border bg-bg-secondary shadow-lg"
          @mousedown.stop
        >
          <div
            v-for="char in filteredMentions"
            :key="char!.id"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary first:rounded-t-lg last:rounded-b-lg"
            @mousedown.prevent="selectMention(char!)"
          >
            <span class="text-base">@</span>
            <span>{{ char!.name }}</span>
          </div>
        </div>

        <!-- Bottom row: toolbar + send (inside the textarea area) -->
        <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <div class="relative">
              <button
                class="flex h-10 w-10 items-center justify-center rounded text-lg text-text-secondary hover:bg-bg-tertiary"
                @click="toggleEmoji"
                title="表情"
              >😊</button>
              <div v-if="showEmoji" class="absolute bottom-8 left-0 z-50 rounded-lg border border-border bg-bg-secondary p-2 shadow-lg" style="width: 288px;" @mousedown.stop>
                <div class="grid grid-cols-8 gap-0.5">
                  <button
                    v-for="emoji in commonEmojis"
                    :key="emoji"
                    class="flex h-8 w-8 items-center justify-center rounded text-base hover:bg-bg-tertiary"
                    @click="insertEmoji(emoji)"
                  >{{ emoji }}</button>
                </div>
              </div>
            </div>
            <button
              class="flex h-10 w-10 items-center justify-center rounded text-text-secondary hover:bg-bg-tertiary"
              @click="fileInputRef?.click()"
              title="发送文件"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </button>
          </div>

          <button
            v-if="!isGenerating"
            class="flex h-7 items-center rounded px-3 text-xs text-white hover:opacity-90 disabled:opacity-40"
            style="background: var(--accent-color)"
            :disabled="!input.trim() && uploadedFiles.length === 0"
            @click="handleSubmit"
          >发送(S)</button>
          <button
            v-else
            class="flex h-7 items-center rounded bg-red-600 px-3 text-xs text-white hover:opacity-90"
            @click="$emit('stop')"
          >停止</button>
        </div>
      </div>
    </div>
  </div>
</template>