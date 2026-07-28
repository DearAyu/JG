import { Router } from 'express'
import path from 'path'
import { fileStore } from '../services/file-store.js'
import {
  CONTEXT_SIZE_MAX,
  CONTEXT_SIZE_MIN,
  DEFAULT_FONT_FAMILY,
  MAX_RESPONSE_TOKENS_MAX,
  MAX_RESPONSE_TOKENS_MIN,
  REMOVED_FONT_FAMILIES,
  defaultSettings,
} from '../../../shared/types/settings.js'
import type { AppSettings } from '../../../shared/types/settings.js'

const router = Router()
const settingsFile = path.join(fileStore.dataDir, 'settings.json')

function loadSettings(): AppSettings {
  const stored = fileStore.readJson<Partial<AppSettings>>(settingsFile)
  const settings: AppSettings = { ...defaultSettings, ...(stored ?? {}) }
  let shouldSave = false

  if (REMOVED_FONT_FAMILIES.includes(settings.fontFamily as typeof REMOVED_FONT_FAMILIES[number])) {
    settings.fontFamily = DEFAULT_FONT_FAMILY
    shouldSave = true
  }

  if (!isIntegerInRange(settings.contextSize, CONTEXT_SIZE_MIN, CONTEXT_SIZE_MAX)) {
    settings.contextSize = defaultSettings.contextSize
    shouldSave = true
  }

  if (
    !isIntegerInRange(
      settings.maxResponseTokens,
      MAX_RESPONSE_TOKENS_MIN,
      MAX_RESPONSE_TOKENS_MAX
    )
  ) {
    settings.maxResponseTokens = defaultSettings.maxResponseTokens
    shouldSave = true
  }

  if (shouldSave || !stored?.maxResponseTokens) saveSettings(settings)

  return settings
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
}

function getValidationError(body: Partial<AppSettings>): string | null {
  if (
    body.contextSize !== undefined &&
    !isIntegerInRange(body.contextSize, CONTEXT_SIZE_MIN, CONTEXT_SIZE_MAX)
  ) {
    return `上下文长度必须是 ${CONTEXT_SIZE_MIN}-${CONTEXT_SIZE_MAX} 之间的整数 Token。`
  }

  if (
    body.maxResponseTokens !== undefined &&
    !isIntegerInRange(
      body.maxResponseTokens,
      MAX_RESPONSE_TOKENS_MIN,
      MAX_RESPONSE_TOKENS_MAX
    )
  ) {
    return `最大回复长度必须是 ${MAX_RESPONSE_TOKENS_MIN}-${MAX_RESPONSE_TOKENS_MAX} 之间的整数 Token。`
  }

  return null
}

function saveSettings(settings: AppSettings): void {
  fileStore.writeJson(settingsFile, settings)
}

router.get('/', (_req, res) => {
  res.json(loadSettings())
})

router.put('/', (req, res) => {
  const body = req.body as Partial<AppSettings>
  const validationError = getValidationError(body)
  if (validationError) {
    res.status(400).json({ message: validationError })
    return
  }

  const current = loadSettings()
  const updated = { ...current, ...body }
  saveSettings(updated)
  res.json(updated)
})

export default router
