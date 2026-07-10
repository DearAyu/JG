import { watch } from 'vue'
import type { AppSettings } from '@shared/types'

const darkTheme = {
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgTertiary: '#0f3460',
  textColor: '#e0e0e0',
  textSecondaryColor: '#a0a0a0',
  borderColor: '#2a2a4a',
  messageUserBg: '#16213e',
  messageAssistantBg: '#0f3460',
}

const lightTheme = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  bgTertiary: '#e8e8e8',
  textColor: '#1a1a1a',
  textSecondaryColor: '#606060',
  borderColor: '#d0d0d0',
  messageUserBg: '#e8f0fe',
  messageAssistantBg: '#f0f0f0',
}

export function applyTheme(settings: AppSettings): void {
  const root = document.documentElement

  if (settings.theme === 'dark') {
    root.classList.remove('light', 'custom')
    root.classList.add('dark')
    applyColors({ ...darkTheme, accentColor: settings.accentColor })
  } else if (settings.theme === 'light') {
    root.classList.remove('dark', 'custom')
    root.classList.add('light')
    applyColors({ ...lightTheme, accentColor: settings.accentColor })
  } else {
    root.classList.remove('dark', 'light')
    root.classList.add('custom')
    applyColors({
      bgPrimary: settings.bgPrimary,
      bgSecondary: settings.bgSecondary,
      bgTertiary: settings.bgTertiary,
      textColor: settings.textColor,
      textSecondaryColor: settings.textSecondaryColor,
      borderColor: settings.borderColor,
      accentColor: settings.accentColor,
      messageUserBg: settings.bgSecondary,
      messageAssistantBg: settings.bgTertiary,
    })
  }

  root.style.setProperty('--font-size', `${settings.fontSize}px`)
  root.style.setProperty('--font-family', settings.fontFamily)

  if (settings.compactMode) {
    root.classList.add('compact')
  } else {
    root.classList.remove('compact')
  }
}

function applyColors(colors: Record<string, string>): void {
  const root = document.documentElement
  const map: Record<string, string> = {
    '--bg-primary': colors.bgPrimary,
    '--bg-secondary': colors.bgSecondary,
    '--bg-tertiary': colors.bgTertiary,
    '--text-primary': colors.textColor,
    '--text-secondary': colors.textSecondaryColor,
    '--border-color': colors.borderColor,
    '--accent-color': colors.accentColor,
    '--message-user-bg': colors.messageUserBg ?? colors.bgSecondary,
    '--message-assistant-bg': colors.messageAssistantBg ?? colors.bgTertiary,
  }
  for (const [key, value] of Object.entries(map)) {
    if (value) root.style.setProperty(key, value)
  }
}

export function useTheme(settingsRef: { value: AppSettings }) {
  watch(
    () => ({ ...settingsRef.value }),
    (s) => applyTheme(s),
    { deep: true, immediate: true }
  )
}

export const themePresets = {
  dark,
  light,
}

function dark() {
  return darkTheme
}

function light() {
  return lightTheme
}
