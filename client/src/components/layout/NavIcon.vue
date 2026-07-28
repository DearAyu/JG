<script setup lang="ts">
import charactersIcon from '@/assets/icons/icons8/characters.png'
import chatIcon from '@/assets/icons/icons8/chat.png'
import connectionsIcon from '@/assets/icons/icons8/connections.png'
import extensionsIcon from '@/assets/icons/icons8/extensions.png'
import personasIcon from '@/assets/icons/icons8/personas.png'
import presetsIcon from '@/assets/icons/icons8/presets.png'
import settingsIcon from '@/assets/icons/icons8/settings.png'
import worldinfoIcon from '@/assets/icons/icons8/worldinfo.png'

defineProps<{
  name: string
}>()

const iconUrls: Record<string, string> = {
  chat: chatIcon,
  characters: charactersIcon,
  worldinfo: worldinfoIcon,
  personas: personasIcon,
  presets: presetsIcon,
  connections: connectionsIcon,
  extensions: extensionsIcon,
  settings: settingsIcon,
}
</script>

<template>
  <span
    aria-hidden="true"
    class="nav-icon"
    :style="{ '--icon-url': `url(${iconUrls[name] || settingsIcon})` }"
  />
</template>

<style scoped>
.nav-icon {
  width: 20px;
  height: 20px;
  background-color: currentColor;
  mask: var(--icon-url) center / contain no-repeat;
  -webkit-mask: var(--icon-url) center / contain no-repeat;
}
</style>
