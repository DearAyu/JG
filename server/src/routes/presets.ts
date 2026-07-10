import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { GenerationPreset } from '../../../shared/types/preset.js'

const router = Router()
const presetsDir = path.join(fileStore.dataDir, 'presets')

function getFilePath(id: string): string {
  return path.join(presetsDir, `${id}.json`)
}

function loadPreset(id: string): GenerationPreset | null {
  return fileStore.readJson<GenerationPreset>(getFilePath(id))
}

function savePreset(preset: GenerationPreset): void {
  preset.updatedAt = Date.now()
  fileStore.writeJson(getFilePath(preset.id), preset)
}

function listPresets(): GenerationPreset[] {
  const presets = fileStore.listJson<GenerationPreset>(presetsDir)
  return presets.sort((a, b) => b.updatedAt - a.updatedAt)
}

function defaultPreset(name: string): GenerationPreset {
  const now = Date.now()
  return {
    id: fileStore.generateId('preset'),
    name,
    temperature: 1.0,
    max_tokens: 2048,
    top_p: 1.0,
    top_k: 0,
    frequency_penalty: 0,
    presence_penalty: 0,
    repetition_penalty: 1.0,
    stop: [],
    stream: true,
    createdAt: now,
    updatedAt: now,
  }
}

// GET /api/presets
router.get('/', (_req, res) => {
  res.json(listPresets())
})

// GET /api/presets/:id
router.get('/:id', (req, res) => {
  const preset = loadPreset(req.params.id)
  if (!preset) {
    res.status(404).json({ message: 'Preset not found' })
    return
  }
  res.json(preset)
})

// POST /api/presets
router.post('/', (req, res) => {
  const body = req.body as Partial<GenerationPreset>
  const preset = defaultPreset(body.name || 'New Preset')
  Object.assign(preset, body, { id: preset.id, createdAt: preset.createdAt })
  savePreset(preset)
  res.status(201).json(preset)
})

// PUT /api/presets/:id
router.put('/:id', (req, res) => {
  const preset = loadPreset(req.params.id)
  if (!preset) {
    res.status(404).json({ message: 'Preset not found' })
    return
  }
  const body = req.body as Partial<GenerationPreset>
  Object.assign(preset, body, { id: preset.id, createdAt: preset.createdAt })
  savePreset(preset)
  res.json(preset)
})

// DELETE /api/presets/:id
router.delete('/:id', (req, res) => {
  const filePath = getFilePath(req.params.id)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Preset not found' })
    return
  }
  fileStore.deleteFile(filePath)
  res.json({ success: true })
})

// POST /api/presets/import
router.post('/import', (req, res) => {
  const body = req.body as Partial<GenerationPreset>
  const preset = defaultPreset(body.name || 'Imported Preset')
  const { id, createdAt, ...rest } = body
  void id
  void createdAt
  Object.assign(preset, rest)
  savePreset(preset)
  res.status(201).json(preset)
})

export default router