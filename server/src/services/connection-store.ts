import path from 'path'
import type { ConnectionConfig } from '../../../shared/types/connection.js'
import { fileStore } from './file-store.js'
import { protectSecret, unprotectSecret } from './secret-storage.js'

type StoredConnection = Omit<ConnectionConfig, 'apiKey' | 'hasApiKey'> & {
  apiKey?: string
  apiKeyEncrypted?: string
}

const connectionsFile = path.join(fileStore.dataDir, 'connections.json')

export function loadConnections(): ConnectionConfig[] {
  const storedConnections = fileStore.readJson<StoredConnection[]>(connectionsFile) ?? []
  let needsMigration = false

  const connections = storedConnections.map((stored) => {
    const {
      apiKey: legacyApiKey = '',
      apiKeyEncrypted = '',
      ...connection
    } = stored

    if (legacyApiKey) needsMigration = true

    return {
      ...connection,
      apiKey: apiKeyEncrypted ? unprotectSecret(apiKeyEncrypted) : legacyApiKey,
    }
  })

  if (needsMigration) {
    saveConnections(connections)
  }

  return connections
}

export function saveConnections(connections: ConnectionConfig[]): void {
  const storedConnections: StoredConnection[] = connections.map((connection) => {
    const { apiKey, hasApiKey: _hasApiKey, ...stored } = connection
    return {
      ...stored,
      apiKeyEncrypted: protectSecret(apiKey),
    }
  })

  fileStore.writeJson(connectionsFile, storedConnections)
}

export function getConnection(id: string): ConnectionConfig | null {
  return loadConnections().find((connection) => connection.id === id) ?? null
}

export function toClientConnection(connection: ConnectionConfig): ConnectionConfig {
  return {
    ...connection,
    apiKey: '',
    hasApiKey: Boolean(connection.apiKey),
  }
}

export function loadClientConnections(): ConnectionConfig[] {
  return loadConnections().map(toClientConnection)
}

export function replaceConnections(connections: ConnectionConfig[]): void {
  saveConnections(connections)
}
