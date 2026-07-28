<script setup lang="ts">
import { RouterLink } from 'vue-router'
import NavIcon from './NavIcon.vue'

const navItems = [
  { name: 'chat', label: '聊天', path: '/chat' },
  { name: 'connections', label: 'API 连接', path: '/connections' },
  { name: 'characters', label: '角色', path: '/characters' },
  { name: 'worldinfo', label: '世界书', path: '/worldinfo' },
  { name: 'personas', label: '人设', path: '/personas' },
  { name: 'presets', label: '预设', path: '/presets' },
  { name: 'extensions', label: '扩展', path: '/extensions' },
  { name: 'settings', label: '设置', path: '/settings' },
]

</script>

<template>
  <aside
    class="relative flex w-[72px] flex-col items-center gap-1.5 border-r border-border bg-bg-secondary py-4 shadow-soft"
  >
    <div
      class="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-text-primary font-serif text-sm font-bold tracking-tight text-bg-primary"
      aria-label="JG"
    >
      JG
    </div>

    <RouterLink
      v-for="item in navItems"
      :key="item.name"
      :to="item.path"
      class="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
      active-class="bg-bg-tertiary text-accent shadow-soft"
      :aria-label="item.label"
      :title="item.label"
    >
      <NavIcon :name="item.name" />
    </RouterLink>

  </aside>
</template>
