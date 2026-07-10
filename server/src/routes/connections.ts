import { Router } from 'express'
import path from 'path'
import { fileStore } from '../services/file-store.js'
import type { ConnectionConfig } from '../../../shared/types/connection.js'

const router = Router()
const connectionsFile = path.join(fileStore.dataDir, 'connections.json')

function loadConnections(): ConnectionConfig[] {
  return fileStore.readJson<ConnectionConfig[]>(connectionsFile) ?? []
}

function saveConnections(connections: ConnectionConfig[]): void {
  fileStore.writeJson(connectionsFile, connections)
}

router.get('/', (_req, res) => {
  const connections = loadConnections()
  res.json(connections)
})

router.post('/', (req, res) => {
  const body = req.body as Partial<ConnectionConfig>
  const now = Date.now()
  const connection: ConnectionConfig = {
    id: fileStore.generateId('conn'),
    name: body.name || 'New Connection',
    type: body.type || 'openai',
    apiUrl: body.apiUrl || 'https://api.openai.com/v1',
    apiKey: body.apiKey || '',
    model: body.model || 'gpt-4o',
    isDefault: body.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  }

  const connections = loadConnections()
  if (connection.isDefault) {
    connections.forEach((c) => (c.isDefault = false))
  }
  connections.push(connection)
  saveConnections(connections)
  res.status(201).json(connection)
})

router.put('/:id', (req, res) => {
  const { id } = req.params
  const body = req.body as Partial<ConnectionConfig>
  const connections = loadConnections()
  const idx = connections.findIndex((c) => c.id === id)
  if (idx === -1) {
    res.status(404).json({ message: 'Connection not found' })
    return
  }

  if (body.isDefault) {
    connections.forEach((c) => (c.isDefault = false))
  }

  connections[idx] = {
    ...connections[idx],
    ...body,
    id,
    updatedAt: Date.now(),
  }
  saveConnections(connections)
  res.json(connections[idx])
})

router.delete('/:id', (req, res) => {
  const { id } = req.params
  const connections = loadConnections()
  const idx = connections.findIndex((c) => c.id === id)
  if (idx === -1) {
    res.status(404).json({ message: 'Connection not found' })
    return
  }
  connections.splice(idx, 1)
  saveConnections(connections)
  res.json({ success: true })
})

router.post('/:id/test', async (req, res) => {
  const connections = loadConnections()
  const conn = connections.find((c) => c.id === req.params.id)
  if (!conn) {
    res.status(404).json({ message: 'Connection not found' })
    return
  }

  try {
    const url = `${conn.apiUrl.replace(/\/$/, '')}/models`
    const response = await fetch(url, {
      headers: conn.apiKey ? { Authorization: `Bearer ${conn.apiKey}` } : {},
    })
    if (!response.ok) {
      res.status(response.status).json({ message: `API returned ${response.status}` })
      return
    }
    const data = await response.json()
    res.json({ success: true, models: data })
  } catch (err) {
    res.status(500).json({ message: `Connection failed: ${(err as Error).message}` })
  }
})

export default router