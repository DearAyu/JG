<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const navItems = [
  { name: 'chat', label: '聊天', icon: '💬', path: '/chat' },
  { name: 'characters', label: '角色', icon: '👤', path: '/characters' },
  { name: 'worldinfo', label: '世界书', icon: '📖', path: '/worldinfo' },
  { name: 'personas', label: '人设', icon: '🎭', path: '/personas' },
  { name: 'presets', label: '预设', icon: '⚙️', path: '/presets' },
  { name: 'extensions', label: '扩展', icon: '🧩', path: '/extensions' },
  { name: 'settings', label: '设置', icon: '🔧', path: '/settings' },
]

const showHelp = ref(false)

const shortcuts = [
  { key: 'Enter', desc: '发送消息' },
  { key: 'Shift+Enter', desc: '换行' },
  { key: 'Ctrl+K', desc: '新对话' },
  { key: 'Ctrl+F', desc: '搜索消息' },
  { key: 'Ctrl+Enter', desc: '重新生成' },
  { key: '↑', desc: '编辑上一条消息' },
  { key: 'Esc', desc: '停止生成 / 关闭' },
]
</script>

<template>
  <aside
    class="flex w-16 flex-col items-center gap-2 border-r border-border bg-bg-secondary py-4"
  >
    <div class="mb-4 text-2xl font-bold accent-text" style="color: var(--accent-color)">JG</div>

    <RouterLink
      v-for="item in navItems"
      :key="item.name"
      :to="item.path"
      class="flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-bg-tertiary"
      active-class="bg-bg-tertiary"
      :title="item.label"
    >
      {{ item.icon }}
    </RouterLink>

    <!-- Spacer -->
    <div class="flex-1"></div>

    <!-- Shortcuts help -->
    <button
      class="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
      title="快捷键"
      @click="showHelp = !showHelp"
    >
      ⌨
    </button>

    <!-- Help popover -->
    <Transition name="fade">
      <div
        v-if="showHelp"
        class="absolute bottom-16 left-16 z-50 w-64 rounded-lg border border-border bg-bg-secondary p-4 shadow-lg"
        @click="showHelp = false"
      >
        <h3 class="mb-3 text-sm font-semibold text-text-primary">键盘快捷键</h3>
        <div class="space-y-2">
          <div v-for="sc in shortcuts" :key="sc.key" class="flex items-center justify-between">
            <kbd
              class="rounded border border-border bg-bg-tertiary px-2 py-0.5 text-xs text-text-primary"
            >
              {{ sc.key }}
            </kbd>
            <span class="text-xs text-text-secondary">{{ sc.desc }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </aside>
</template>

<style scoped>
.accent-text {
  color: var(--accent-color);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>