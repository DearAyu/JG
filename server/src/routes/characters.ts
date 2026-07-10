import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { Character, CharacterCardV2 } from '../../../shared/types/character.js'

const router = Router()
const charsDir = path.join(fileStore.dataDir, 'characters')
const avatarsDir = path.join(charsDir, 'avatars')

function getCharFilePath(id: string): string {
  return path.join(charsDir, `${id}.json`)
}

function getAvatarPath(id: string): string | null {
  const extensions = ['png', 'jpg', 'jpeg', 'webp']
  for (const ext of extensions) {
    const p = path.join(avatarsDir, `${id}.${ext}`)
    if (fs.existsSync(p)) return p
  }
  return null
}

function loadCharacter(id: string): Character | null {
  return fileStore.readJson<Character>(getCharFilePath(id))
}

function saveCharacter(char: Character): void {
  char.updatedAt = Date.now()
  fileStore.writeJson(getCharFilePath(char.id), char)
}

function listCharacters(): Character[] {
  const chars = fileStore.listJson<Character>(charsDir)
  return chars.sort((a, b) => b.updatedAt - a.updatedAt)
}

function defaultCharacter(): Partial<Character> {
  return {
    name: '',
    description: '',
    personality: '',
    scenario: '',
    first_mes: '',
    mes_example: '',
    creator_notes: '',
    system_prompt: '',
    post_history_instructions: '',
    tags: [],
    creator: '',
    character_version: '1.0',
    alternate_greetings: [],
    extensions: {},
  }
}

// GET /api/characters
router.get('/', (_req, res) => {
  const chars = listCharacters().map((c) => {
    const { avatar, ...rest } = c
    void avatar
    return { ...rest, hasAvatar: !!getAvatarPath(c.id) }
  })
  res.json(chars)
})

// GET /api/characters/:id
router.get('/:id', (req, res) => {
  const char = loadCharacter(req.params.id)
  if (!char) {
    res.status(404).json({ message: 'Character not found' })
    return
  }
  res.json(char)
})

// GET /api/characters/:id/avatar
router.get('/:id/avatar', (req, res) => {
  const avatarPath = getAvatarPath(req.params.id)
  if (!avatarPath) {
    res.status(404).json({ message: 'Avatar not found' })
    return
  }
  res.sendFile(path.resolve(avatarPath))
})

// POST /api/characters
router.post('/', (req, res) => {
  const body = req.body as Partial<Character>
  const now = Date.now()
  const char: Character = {
    id: fileStore.generateId('char'),
    ...defaultCharacter(),
    ...body,
    id: fileStore.generateId('char'),
    createdAt: now,
    updatedAt: now,
  } as Character

  // Don't store avatar base64 in JSON if it exists
  if (char.avatar) {
    delete char.avatar
  }

  saveCharacter(char)
  res.status(201).json(char)
})

// PUT /api/characters/:id
router.put('/:id', (req, res) => {
  const char = loadCharacter(req.params.id)
  if (!char) {
    res.status(404).json({ message: 'Character not found' })
    return
  }
  const body = req.body as Partial<Character>
  const updated: Character = {
    ...char,
    ...body,
    id: char.id,
    createdAt: char.createdAt,
  }
  // Don't store avatar base64 in JSON
  if (updated.avatar) {
    delete updated.avatar
  }
  saveCharacter(updated)
  res.json(updated)
})

// DELETE /api/characters/:id
router.delete('/:id', (req, res) => {
  const filePath = getCharFilePath(req.params.id)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Character not found' })
    return
  }
  fileStore.deleteFile(filePath)
  // Also delete avatar
  const avatarPath = getAvatarPath(req.params.id)
  if (avatarPath) fileStore.deleteFile(avatarPath)
  res.json({ success: true })
})

// POST /api/characters/:id/avatar - upload avatar
router.post('/:id/avatar', (req, res) => {
  const char = loadCharacter(req.params.id)
  if (!char) {
    res.status(404).json({ message: 'Character not found' })
    return
  }

  const body = req.body as { avatar: string; extension?: string }
  if (!body.avatar) {
    res.status(400).json({ message: 'No avatar data provided' })
    return
  }

  // Remove old avatar
  const oldAvatar = getAvatarPath(req.params.id)
  if (oldAvatar) fileStore.deleteFile(oldAvatar)

  // Parse base64 data URL
  const matches = body.avatar.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!matches) {
    res.status(400).json({ message: 'Invalid avatar format' })
    return
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1]
  const buffer = Buffer.from(matches[2], 'base64')
  const avatarPath = path.join(avatarsDir, `${req.params.id}.${ext}`)
  fileStore.ensureDir(avatarsDir)
  fs.writeFileSync(avatarPath, buffer)

  res.json({ success: true, avatarPath: `/api/characters/${req.params.id}/avatar` })
})

// GET /api/characters/:id/export - export as V2 JSON
router.get('/:id/export', (req, res) => {
  const char = loadCharacter(req.params.id)
  if (!char) {
    res.status(404).json({ message: 'Character not found' })
    return
  }
  const card: CharacterCardV2 = {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: char.name,
      description: char.description,
      personality: char.personality,
      scenario: char.scenario,
      first_mes: char.first_mes,
      mes_example: char.mes_example,
      creator_notes: char.creator_notes,
      system_prompt: char.system_prompt,
      post_history_instructions: char.post_history_instructions,
      tags: char.tags,
      creator: char.creator,
      character_version: char.character_version,
      alternate_greetings: char.alternate_greetings,
      extensions: char.extensions,
    },
  }
  res.setHeader('Content-Disposition', `attachment; filename="${char.name || 'character'}.json`)
  res.json(card)
})

// POST /api/characters/import - import from V2 JSON
router.post('/import', (req, res) => {
  const card = req.body as CharacterCardV2
  if (!card.spec || !card.data) {
    res.status(400).json({ message: 'Invalid character card format' })
    return
  }

  const data = card.data
  const now = Date.now()
  const char: Character = {
    id: fileStore.generateId('char'),
    name: data.name || '',
    description: data.description || '',
    personality: data.personality || '',
    scenario: data.scenario || '',
    first_mes: data.first_mes || '',
    mes_example: data.mes_example || '',
    creator_notes: data.creator_notes || '',
    system_prompt: data.system_prompt || '',
    post_history_instructions: data.post_history_instructions || '',
    tags: data.tags || [],
    creator: data.creator || '',
    character_version: data.character_version || '1.0',
    alternate_greetings: data.alternate_greetings || [],
    extensions: data.extensions || {},
    createdAt: now,
    updatedAt: now,
  }

  saveCharacter(char)
  res.status(201).json(char)
})

export default router