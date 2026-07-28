import { Router, type Response as ExpressResponse } from 'express'
import type { ConnectionConfig } from '../../../shared/types/connection.js'
import { fileStore } from '../services/file-store.js'
import {
  getConnection,
  loadClientConnections,
  loadConnections,
  saveConnections,
  toClientConnection,
} from '../services/connection-store.js'

const router = Router()

type TestableConnection = Pick<ConnectionConfig, 'type' | 'apiUrl' | 'apiKey'>

class ConnectionTestError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message)
  }
}

function extractModelIds(data: unknown, type: ConnectionConfig['type']): string[] {
  type RemoteModel = {
    id?: string
    name?: string
    supportedGenerationMethods?: string[]
  }

  const payload = data as {
    data?: RemoteModel[]
    models?: RemoteModel[]
  }

  const models = payload.data ?? payload.models ?? []
  const ids = models
    .filter((model) =>
      type !== 'gemini' || model.supportedGenerationMethods?.includes('generateContent')
    )
    .map((model) => model.id ?? model.name?.replace(/^models\//, '') ?? '')
    .filter(Boolean)

  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}

async function testConnection(connection: TestableConnection): Promise<string[]> {
  const apiUrl = connection.apiUrl.trim().replace(/\/$/, '')
  const apiKey = connection.apiKey.trim()

  if (!apiUrl) {
    throw new ConnectionTestError('请填写 API URL', 400)
  }
  if (['openai', 'deepseek', 'claude', 'gemini'].includes(connection.type) && !apiKey) {
    throw new ConnectionTestError('请填写 API Key', 400)
  }

  let url = `${apiUrl}/models`
  let headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {}

  if (connection.type === 'claude') {
    url = `${apiUrl.endsWith('/v1') ? apiUrl : `${apiUrl}/v1`}/models`
    headers = {
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    }
  } else if (connection.type === 'gemini') {
    url = `${apiUrl.endsWith('/v1beta') ? apiUrl : `${apiUrl}/v1beta`}/models`
    headers = { 'x-goog-api-key': apiKey }
  } else if (connection.type === 'ollama' && !apiUrl.includes('/v1')) {
    url = `${apiUrl}/api/tags`
  }

  let response: Response
  try {
    response = await fetch(url, { headers })
  } catch (error) {
    throw new ConnectionTestError(`连接失败：${(error as Error).message}`)
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as {
      error?: { message?: string }
      message?: string
    }
    const message = errorData.error?.message ?? errorData.message ?? `API 返回 ${response.status}`
    throw new ConnectionTestError(message, response.status)
  }

  const models = extractModelIds(await response.json(), connection.type)
  if (models.length === 0) {
    throw new ConnectionTestError('连接成功，但没有获取到可用模型', 502)
  }

  return models
}

async function validateConnectionForSave(connection: ConnectionConfig): Promise<void> {
  const selectedModel = connection.model.trim()
  if (!selectedModel) {
    throw new ConnectionTestError('请选择模型', 400)
  }

  const models = await testConnection(connection)
  if (!models.includes(selectedModel)) {
    throw new ConnectionTestError(`模型 ${selectedModel} 不在当前 Key 的可用模型列表中`, 400)
  }
}

function sendConnectionError(res: ExpressResponse, error: unknown) {
  const connectionError = error as ConnectionTestError
  res.status(connectionError.status ?? 500).json({
    message: connectionError.message || '连接验证失败',
  })
}

function markVerificationSuccess(connection: ConnectionConfig): void {
  connection.verificationStatus = 'available'
  connection.lastVerifiedAt = Date.now()
  connection.verificationMessage = undefined
}

function markVerificationFailure(connection: ConnectionConfig, error: unknown): string {
  const message = (error as Error).message || '连接验证失败'
  connection.verificationStatus = 'failed'
  connection.lastVerifiedAt = Date.now()
  connection.verificationMessage = message.slice(0, 200)
  return message
}

router.get('/', (_req, res) => {
  const connections = loadClientConnections()
  res.json(connections)
})

router.post('/test', async (req, res) => {
  const body = req.body as Partial<ConnectionConfig>
  const savedConnection = body.id ? getConnection(body.id) : null
  const connection: TestableConnection = {
    type: body.type ?? 'openai',
    apiUrl: body.apiUrl ?? '',
    apiKey: body.apiKey?.trim() || savedConnection?.apiKey || '',
  }

  try {
    const models = await testConnection(connection)
    res.json({ success: true, models })
  } catch (error) {
    sendConnectionError(res, error)
  }
})

router.post('/', async (req, res) => {
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

  try {
    await validateConnectionForSave(connection)
  } catch (error) {
    sendConnectionError(res, error)
    return
  }

  markVerificationSuccess(connection)

  const connections = loadConnections()
  if (connection.isDefault) {
    connections.forEach((c) => (c.isDefault = false))
  }
  connections.push(connection)
  saveConnections(connections)
  res.status(201).json(toClientConnection(connection))
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const body = req.body as Partial<ConnectionConfig>
  const connections = loadConnections()
  const idx = connections.findIndex((c) => c.id === id)
  if (idx === -1) {
    res.status(404).json({ message: 'Connection not found' })
    return
  }

  const connection: ConnectionConfig = {
    ...connections[idx],
    ...body,
    id,
    apiKey: body.apiKey?.trim() || connections[idx].apiKey,
    updatedAt: Date.now(),
  }

  try {
    await validateConnectionForSave(connection)
  } catch (error) {
    sendConnectionError(res, error)
    return
  }

  markVerificationSuccess(connection)

  if (body.isDefault) {
    connections.forEach((c) => (c.isDefault = false))
  }

  connections[idx] = connection
  saveConnections(connections)
  res.json(toClientConnection(connections[idx]))
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
  const connection = connections.find((item) => item.id === req.params.id)
  if (!connection) {
    res.status(404).json({ message: 'Connection not found' })
    return
  }

  try {
    const models = await testConnection(connection)
    markVerificationSuccess(connection)
    saveConnections(connections)
    res.json({ success: true, models })
  } catch (error) {
    markVerificationFailure(connection, error)
    saveConnections(connections)
    sendConnectionError(res, error)
  }
})

router.post('/test-all', async (_req, res) => {
  const connections = loadConnections()
  const results = await Promise.all(
    connections.map(async (connection) => {
      try {
        const models = await testConnection(connection)
        markVerificationSuccess(connection)
        return {
          id: connection.id,
          name: connection.name,
          success: true,
          models: models.length,
        }
      } catch (error) {
        const message = markVerificationFailure(connection, error)
        return {
          id: connection.id,
          name: connection.name,
          success: false,
          message,
        }
      }
    })
  )

  saveConnections(connections)
  res.json({ results })
})

export default router
