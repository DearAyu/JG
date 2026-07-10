import { Router } from 'express'
import path from 'path'
import { fileStore } from '../services/file-store.js'
import { defaultSettings } from '../../../shared/types/settings.js'
import type { AppSettings } from '../../../shared/types/settings.js'

const router = Router()
const settingsFile = path.join(fileStore.dataDir, 'settings.json')

function loadSettings(): AppSettings {
  return fileStore.readJson<AppSettings>(settingsFile) ?? { ...defaultSettings }
}

function saveSettings(settings: AppSettings): void {
  fileStore.writeJson(settingsFile, settings)
}

router.get('/', (_req, res) => {
  res.json(loadSettings())
})

router.put('/', (req, res) => {
  const body = req.body as Partial<AppSettings>
  const current = loadSettings()
  const updated = { ...current, ...body }
  saveSettings(updated)
  res.json(updated)
})

export default router