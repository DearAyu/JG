import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { WorldBook, WorldBookEntry } from '../../../shared/types/worldinfo.js'

const router = Router()
const wiDir = path.join(fileStore.dataDir, 'worldinfo')

function getFilePath(id: string): string {
  return path.join(wiDir, `${id}.json`)
}

function loadBook(id: string): WorldBook | null {
  return fileStore.readJson<WorldBook>(getFilePath(id))
}

function saveBook(book: WorldBook): void {
  book.updatedAt = Date.now()
  fileStore.writeJson(getFilePath(book.id), book)
}

function listBooks(): WorldBook[] {
  const books = fileStore.listJson<WorldBook>(wiDir)
  return books.sort((a, b) => b.updatedAt - a.updatedAt)
}

function defaultEntry(): WorldBookEntry {
  return {
    id: fileStore.generateId('wi'),
    keys: [],
    secondaryKeys: [],
    content: '',
    comment: '',
    enabled: true,
    selective: false,
    insertionOrder: 100,
    position: 'before_char',
    depth: 4,
    constant: false,
  }
}

function defaultBook(name: string): WorldBook {
  const now = Date.now()
  return {
    id: fileStore.generateId('wb'),
    name,
    description: '',
    entries: [],
    createdAt: now,
    updatedAt: now,
  }
}

// GET /api/worldinfo
router.get('/', (_req, res) => {
  const books = listBooks().map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    entryCount: b.entries.length,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }))
  res.json(books)
})

// GET /api/worldinfo/:id
router.get('/:id', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  res.json(book)
})

// POST /api/worldinfo
router.post('/', (req, res) => {
  const body = req.body as Partial<WorldBook>
  const book = defaultBook(body.name || 'New World Book')
  if (body.description) book.description = body.description
  if (body.entries) book.entries = body.entries
  saveBook(book)
  res.status(201).json(book)
})

// PUT /api/worldinfo/:id
router.put('/:id', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  const body = req.body as Partial<WorldBook>
  if (body.name !== undefined) book.name = body.name
  if (body.description !== undefined) book.description = body.description
  if (body.entries !== undefined) book.entries = body.entries
  saveBook(book)
  res.json(book)
})

// DELETE /api/worldinfo/:id
router.delete('/:id', (req, res) => {
  const filePath = getFilePath(req.params.id)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  fileStore.deleteFile(filePath)
  res.json({ success: true })
})

// POST /api/worldinfo/:id/entries - add entry
router.post('/:id/entries', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  const body = req.body as Partial<WorldBookEntry>
  const entry: WorldBookEntry = {
    ...defaultEntry(),
    ...body,
    id: fileStore.generateId('wi'),
  }
  book.entries.push(entry)
  saveBook(book)
  res.status(201).json(entry)
})

// PUT /api/worldinfo/:id/entries/:entryId - update entry
router.put('/:id/entries/:entryId', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  const entry = book.entries.find((e) => e.id === req.params.entryId)
  if (!entry) {
    res.status(404).json({ message: 'Entry not found' })
    return
  }
  const body = req.body as Partial<WorldBookEntry>
  Object.assign(entry, body, { id: entry.id })
  saveBook(book)
  res.json(entry)
})

// DELETE /api/worldinfo/:id/entries/:entryId
router.delete('/:id/entries/:entryId', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  const idx = book.entries.findIndex((e) => e.id === req.params.entryId)
  if (idx === -1) {
    res.status(404).json({ message: 'Entry not found' })
    return
  }
  book.entries.splice(idx, 1)
  saveBook(book)
  res.json({ success: true })
})

// POST /api/worldinfo/:id/scan - scan messages and return activated entries
router.post('/:id/scan', (req, res) => {
  const book = loadBook(req.params.id)
  if (!book) {
    res.status(404).json({ message: 'World book not found' })
    return
  }
  const body = req.body as { messages: { content: string }[]; scanDepth?: number }
  const scanDepth = body.scanDepth ?? 20
  const recentMessages = body.messages.slice(-scanDepth)
  const scanText = recentMessages.map((m) => m.content).join(' ').toLowerCase()

  const activated = book.entries
    .filter((e) => e.enabled)
    .filter((e) => {
      if (e.constant) return true
      const keys = [...e.keys, ...e.secondaryKeys].map((k) => k.toLowerCase())
      if (e.selective) {
        const primary = e.keys.some((k) => scanText.includes(k.toLowerCase()))
        const secondary =
          e.secondaryKeys.length === 0 ||
          e.secondaryKeys.some((k) => scanText.includes(k.toLowerCase()))
        return primary && secondary
      }
      return keys.some((k) => scanText.includes(k))
    })
    .sort((a, b) => a.insertionOrder - b.insertionOrder)

  res.json({ activated, scanText: scanText.slice(0, 500) })
})

export default router