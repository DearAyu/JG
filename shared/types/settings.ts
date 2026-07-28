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
  maxResponseTokens: number
  swipeCount: number
  autoScroll: boolean
  streamMessages: boolean
  glowMessages: boolean
  messageAnimation: boolean
  compactMode: boolean
}

export const SYSTEM_FONT_FAMILY = "'Segoe UI', 'Microsoft YaHei', sans-serif"
export const DEFAULT_FONT_FAMILY = "'JG Alibaba PuHuiTi', 'Microsoft YaHei', sans-serif"
export const CONTEXT_SIZE_MIN = 1000
export const CONTEXT_SIZE_MAX = 1000000
export const MAX_RESPONSE_TOKENS_MIN = 100
export const MAX_RESPONSE_TOKENS_MAX = 100000

export const REMOVED_FONT_FAMILIES = [
  "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
  "'SimSun', 'Songti SC', serif",
  "'SimHei', 'Heiti SC', sans-serif",
  "'JG Source Han Sans SC', 'Microsoft YaHei', sans-serif",
  "'JG Smiley Sans', 'Microsoft YaHei', sans-serif",
] as const

export const defaultSettings: AppSettings = {
  theme: 'light',
  fontSize: 15,
  fontFamily: DEFAULT_FONT_FAMILY,
  accentColor: '#b85c42',
  bgPrimary: '#f7f5f2',
  bgSecondary: '#fdfcf9',
  bgTertiary: '#ede9e2',
  textColor: '#2b2926',
  textSecondaryColor: '#777169',
  borderColor: '#ddd7ce',
  activeConnectionId: null,
  activePersonaId: null,
  contextSize: 8192,
  maxResponseTokens: 2048,
  swipeCount: 1,
  autoScroll: true,
  streamMessages: true,
  glowMessages: false,
  messageAnimation: true,
  compactMode: false,
}
