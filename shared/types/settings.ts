export interface AppSettings {
  theme: 'dark' | 'light' | 'custom'
  fontSize: number
  fontFamily: string
  accentColor: string
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  textColor: string
  textSecondaryColor: string
  borderColor: string
  activeConnectionId: string | null
  activePersonaId: string | null
  contextSize: number
  swipeCount: number
  autoScroll: boolean
  streamMessages: boolean
  glowMessages: boolean
  messageAnimation: boolean
  compactMode: boolean
}

export const defaultSettings: AppSettings = {
  theme: 'dark',
  fontSize: 15,
  fontFamily: "'Segoe UI', 'Microsoft YaHei', sans-serif",
  accentColor: '#e94560',
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgTertiary: '#0f3460',
  textColor: '#e0e0e0',
  textSecondaryColor: '#a0a0a0',
  borderColor: '#2a2a4a',
  activeConnectionId: null,
  activePersonaId: null,
  contextSize: 8192,
  swipeCount: 1,
  autoScroll: true,
  streamMessages: true,
  glowMessages: false,
  messageAnimation: true,
  compactMode: false,
}