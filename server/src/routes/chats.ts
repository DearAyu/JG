import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileStore } from '../services/file-store.js'
import type { ChatSession, ChatMessage } from '../../../shared/types/chat.js'

const router = Router()
const chatsDir = path.join(fileStore.dataDir, 'chats')

function getChatFilePath(id: string): string {
  return path.join(chatsDir, `${id}.json`)
}

function loadChat(id: string): ChatSession | null {
  return fileStore.readJson<ChatSession>(getChatFilePath(id))
}

function saveChat(chat: ChatSession): void {
  chat.updatedAt = Date.now()
  chat.messageCount = chat.messages.length
  fileStore.writeJson(getChatFilePath(chat.id), chat)
}

function listChats(): ChatSession[] {
  const chats = fileStore.listJson<ChatSession>(chatsDir)
  return chats.sort((a, b) => b.updatedAt - a.updatedAt)
}

// GET /api/chats - list all chats (metadata only)
router.get('/', (_req, res) => {
  const chats = listChats().map((c) => ({
    id: c.id,
    characterId: c.characterId,
    personaId: c.personaId,
    title: c.title,
    presetId: c.presetId,
    authorNote: c.authorNote,
    isGroupChat: c.isGroupChat || false,
    groupChatMode: c.groupChatMode || 'round_robin',
    characterIds: c.characterIds || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messageCount: c.messageCount,
  }))
  res.json(chats)
})

// GET /api/chats/:id - get single chat with all messages
router.get('/:id', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  res.json(chat)
})

// POST /api/chats - create new chat
router.post('/', (req, res) => {
  const body = req.body as Partial<ChatSession>
  const now = Date.now()
  const chat: ChatSession = {
    id: fileStore.generateId('chat'),
    characterId: body.characterId ?? null,
    characterIds: body.characterIds ?? [],
    personaId: body.personaId ?? null,
    title: body.title || 'New Chat',
    presetId: body.presetId ?? null,
    authorNote: body.authorNote || '',
    isGroupChat: body.isGroupChat ?? false,
    groupChatMode: body.groupChatMode ?? 'round_robin',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    messages: body.messages ?? [],
  }
  saveChat(chat)
  res.status(201).json(chat)
})

// PUT /api/chats/:id - update chat metadata
router.put('/:id', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  const body = req.body as Partial<ChatSession>
  if (body.title !== undefined) chat.title = body.title
  if (body.characterId !== undefined) chat.characterId = body.characterId
  if (body.characterIds !== undefined) chat.characterIds = body.characterIds
  if (body.personaId !== undefined) chat.personaId = body.personaId
  if (body.presetId !== undefined) chat.presetId = body.presetId
  if (body.authorNote !== undefined) chat.authorNote = body.authorNote
  if (body.isGroupChat !== undefined) chat.isGroupChat = body.isGroupChat
  if (body.groupChatMode !== undefined) chat.groupChatMode = body.groupChatMode
  saveChat(chat)
  res.json(chat)
})

// DELETE /api/chats/:id
router.delete('/:id', (req, res) => {
  const filePath = getChatFilePath(req.params.id)
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  fileStore.deleteFile(filePath)
  res.json({ success: true })
})

// POST /api/chats/:id/messages - append message
router.post('/:id/messages', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  const body = req.body as Partial<ChatMessage>
  const msg: ChatMessage = {
    id: body.id || fileStore.generateId('msg'),
    role: body.role || 'user',
    content: body.content || '',
    timestamp: body.timestamp || Date.now(),
    swipes: body.swipes,
    swipeIndex: body.swipeIndex,
  }
  chat.messages.push(msg)
  saveChat(chat)
  res.status(201).json(msg)
})

// PUT /api/chats/:id/messages/:msgId - edit message
router.put('/:id/messages/:msgId', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  const msg = chat.messages.find((m) => m.id === req.params.msgId)
  if (!msg) {
    res.status(404).json({ message: 'Message not found' })
    return
  }
  const body = req.body as Partial<ChatMessage>
  if (body.content !== undefined) msg.content = body.content
  if (body.swipes !== undefined) msg.swipes = body.swipes
  if (body.swipeIndex !== undefined) msg.swipeIndex = body.swipeIndex
  saveChat(chat)
  res.json(msg)
})

// DELETE /api/chats/:id/messages/:msgId
router.delete('/:id/messages/:msgId', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  const idx = chat.messages.findIndex((m) => m.id === req.params.msgId)
  if (idx === -1) {
    res.status(404).json({ message: 'Message not found' })
    return
  }
  chat.messages.splice(idx, 1)
  saveChat(chat)
  res.json({ success: true })
})

// PUT /api/chats/:id/messages - replace all messages (for full save)
router.put('/:id/messages', (req, res) => {
  const chat = loadChat(req.params.id)
  if (!chat) {
    res.status(404).json({ message: 'Chat not found' })
    return
  }
  const body = req.body as { messages: ChatMessage[] }
  chat.messages = body.messages || []
  saveChat(chat)
  res.json(chat)
})

export default router