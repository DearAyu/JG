import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chat',
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/views/ChatView.vue'),
    },
    {
      path: '/characters',
      name: 'characters',
      component: () => import('@/views/CharacterView.vue'),
    },
    {
      path: '/worldinfo',
      name: 'worldinfo',
      component: () => import('@/views/WorldInfoView.vue'),
    },
    {
      path: '/personas',
      name: 'personas',
      component: () => import('@/views/PersonaView.vue'),
    },
    {
      path: '/presets',
      name: 'presets',
      component: () => import('@/views/PresetView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/extensions',
      name: 'extensions',
      component: () => import('@/views/ExtensionView.vue'),
    },
  ],
})

export default router