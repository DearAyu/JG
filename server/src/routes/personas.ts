import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { Persona } from '../../../shared/types/persona.js'

const router = Router()
const personasDir = path.join(fileStore.dataDir, 'personas')
const avatarsDir = path.join(fileStore.dataDir, 'avatars')

function getFilePath(id: string): string {
  return path.join(personasDir, `${id}.json`)
}

function getAvatarPath(id: string): string | null {
  const extensions = ['png', 'jpg', 'jpeg', 'webp']
  for (const ext of extensions) {
    const p = path.join(avatarsDir, `${id}.${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

function loadPersona(id: string): Persona | null {
  return fileStore.readJson<Persona>(getFilePath(id))
}

function savePersona(persona: Persona): void {
  persona.updatedAt = Date.now()
  fileStore.writeJson(getFilePath(persona.id), persona)
}

function listPersonas(): Persona[] {
  const personas = fileStore.listJson<Persona>(personasDir)
  return personas.sort((a, b) => b.updatedAt - a.updatedAt)
}

// GET /api/personas
router.get('/', (_req, res) => {
  const personas = listPersonas().map((p) => ({
    ...p,
    hasAvatar: !!getAvatarPath(p.id),
  }))
  res.json(personas)
})

// GET /api/personas/:id
router.get('/:id', (req, res) => {
  const persona = loadPersona(req.params.id)
  if (!persona) {
    res.status(404).json({ message: 'Persona not found' })
    return
  }
  res.json(persona)
})

// GET /api/personas/:id/avatar
router.get('/:id/avatar', (req, res) => {
  const avatarPath = getAvatarPath(req.params.id)
  if (!avatarPath) {
    res.status(404).json({ message: 'Avatar not found' })
    return
  }
  res.sendFile(path.resolve(avatarPath))
})

// POST /api/personas
router.post('/', (req, res) => {
  const body = req.body as Partial<Persona>
  const now = Date.now()
  const persona: Persona = {
    id: fileStore.generateId('persona'),
    name: body.name || '',
    description: body.description || '',
    createdAt: now,
    updatedAt: now,
  }
  savePersona(persona)
  res.status(201).json(persona)
})

// PUT /api/personas/:id
router.put('/:id', (req, res) => {
  const persona = loadPersona(req.params.id)
  if (!persona) {
    res.status(404).json({ message: 'Persona not found' })
    return
  }
  const body = req.body as Partial<Persona>
  if (body.name !== undefined) persona.name = body.name
  if (body.description !== undefined) persona.description = body.description
  savePersona(persona)
  res.json(persona)
})

// DELETE /api/personas/:id
router.delete('/:id', (req, res) => {
  const filePath = getFilePath(req.params.id)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Persona not found' })
    return
  }
  fileStore.deleteFile(filePath)
  const avatarPath = getAvatarPath(req.params.id)
  if (avatarPath) fileStore.deleteFile(avatarPath)
  res.json({ success: true })
})

// POST /api/personas/:id/avatar - upload avatar
router.post('/:id/avatar', (req, res) => {
  const persona = loadPersona(req.params.id)
  if (!persona) {
    res.status(404).json({ message: 'Persona not found' })
    return
  }

  const body = req.body as { avatar: string }
  if (!body.avatar) {
    res.status(400).json({ message: 'No avatar data provided' })
    return
  }

  const oldAvatar = getAvatarPath(req.params.id)
  if (oldAvatar) fileStore.deleteFile(oldAvatar)

  const matches = body.avatar.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) {
    res.status(400).json({ message: 'Invalid avatar format' })
    return
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  fileStore.ensureDir(avatarsDir)
  const avatarPath = path.join(avatarsDir, `${req.params.id}.${ext}`)
  fs.writeFileSync(avatarPath, buffer)

  res.json({ success: true })
})

export default router