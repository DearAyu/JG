import { Router } from 'express'
import path from 'path'
import { fileStore } from '../services/file-store.js'
import type { ExtensionState } from '../../../shared/types/extension.js'

const router = Router()
const extDir = path.join(fileStore.dataDir, 'extensions')

function getFilePath(id: string): string {
  return path.join(extDir, `${id}.json`)
}

function loadState(id: string): ExtensionState | null {
  return fileStore.readJson<ExtensionState>(getFilePath(id))
}

function saveState(state: ExtensionState): void {
  fileStore.writeJson(getFilePath(state.id), state)
}

function listStates(): ExtensionState[] {
  return fileStore.listJson<ExtensionState>(extDir)
}

// GET /api/extensions/states
router.get('/states', (_req, res) => {
  res.json(listStates())
})

// GET /api/extensions/states/:id
router.get('/states/:id', (req, res) => {
  const state = loadState(req.params.id)
  if (!state) {
    res.status(404).json({ message: 'Extension state not found' })
    return
  }
  res.json(state)
})

// PUT /api/extensions/states/:id - create or update state
router.put('/states/:id', (req, res) => {
  const body = req.body as ExtensionState
  const state: ExtensionState = {
    id: req.params.id,
    enabled: body.enabled ?? false,
    settings: body.settings ?? {},
    installedAt: body.installedAt ?? Date.now(),
  }
  saveState(state)
  res.json(state)
})

export default router