import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { AppSettings } from '../../../shared/types/settings.js'
import type { ConnectionConfig } from '../../../shared/types/connection.js'
import type { Character } from '../../../shared/types/character.js'
import type { ChatSession } from '../../../shared/types/chat.js'
import type { WorldBook } from '../../../shared/types/worldinfo.js'
import type { Persona } from '../../../shared/types/persona.js'
import type { GenerationPreset } from '../../../shared/types/preset.js'
import type { ExtensionState } from '../../../shared/types/extension.js'

const router = Router()

interface BackupData {
  version: string
  exportedAt: number
  settings: AppSettings | null
  connections: ConnectionConfig[]
  characters: Character[]
  chats: ChatSession[]
  worldinfo: WorldBook[]
  personas: Persona[]
  presets: GenerationPreset[]
  extensions: ExtensionState[]
}

function collectAll(): BackupData {
  return {
    version: '1.0',
    exportedAt: Date.now(),
    settings: fileStore.readJson<AppSettings>(path.join(fileStore.dataDir, 'settings.json')),
    connections: fileStore.readJson<ConnectionConfig[]>(path.join(fileStore.dataDir, 'connections.json')) ?? [],
    characters: fileStore.listJson<Character>(path.join(fileStore.dataDir, 'characters')),
    chats: fileStore.listJson<ChatSession>(path.join(fileStore.dataDir, 'chats')),
    worldinfo: fileStore.listJson<WorldBook>(path.join(fileStore.dataDir, 'worldinfo')),
    personas: fileStore.listJson<Persona>(path.join(fileStore.dataDir, 'personas')),
    presets: fileStore.listJson<GenerationPreset>(path.join(fileStore.dataDir, 'presets')),
    extensions: fileStore.listJson<ExtensionState>(path.join(fileStore.dataDir, 'extensions')),
  }
}

function restoreAll(data: BackupData): void {
  if (data.settings) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'settings.json'), data.settings)
  }
  for (const conn of data.connections || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'connections.json'), data.connections)
  }
  for (const char of data.characters || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'characters', `${char.id}.json`), char)
  }
  for (const chat of data.chats || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'chats', `${chat.id}.json`), chat)
  }
  for (const wi of data.worldinfo || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'worldinfo', `${wi.id}.json`), wi)
  }
  for (const persona of data.personas || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'personas', `${persona.id}.json`), persona)
  }
  for (const preset of data.presets || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'presets', `${preset.id}.json`), preset)
  }
  for (const ext of data.extensions || []) {
    fileStore.writeJson(path.join(fileStore.dataDir, 'extensions', `${ext.id}.json`), ext)
  }
}

router.get('/', (_req, res) => {
  const data = collectAll()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  res.setHeader('Content-Disposition', `attachment; filename="jg-backup-${timestamp}.json`)
  res.json(data)
})

router.post('/restore', (req, res) => {
  const data = req.body as BackupData
  if (!data.version) {
    res.status(400).json({ message: 'Invalid backup data' })
    return
  }
  try {
    restoreAll(data)
    res.json({ success: true, message: '数据恢复成功' })
  } catch (err) {
    res.status(500).json({ message: `恢复失败: ${(err as Error).message}` })
  }
})

export default router