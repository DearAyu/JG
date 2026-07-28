import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import type { Server } from 'http'
import { fileURLToPath } from 'url'
import connectionsRouter from './routes/connections.js'
import settingsRouter from './routes/settings.js'
import generateRouter from './routes/generate.js'
import chatsRouter from './routes/chats.js'
import charactersRouter from './routes/characters.js'
import worldinfoRouter from './routes/worldinfo.js'
import personasRouter from './routes/personas.js'
import presetsRouter from './routes/presets.js'
import extensionsRouter from './routes/extensions.js'
import backupRouter from './routes/backup.js'
import { fileStore } from './services/file-store.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dirs = ['characters/avatars', 'chats', 'worldinfo', 'personas', 'presets', 'avatars', 'extensions']
for (const dir of dirs) {
  fs.mkdirSync(path.join(fileStore.dataDir, dir), { recursive: true })
}

export interface ServerOptions {
  port?: number
  host?: string
  clientDist?: string
  enableCors?: boolean
}

export interface RunningServer {
  server: Server
  port: number
  url: string
  close: () => Promise<void>
}

export function createApp(options: Pick<ServerOptions, 'clientDist' | 'enableCors'> = {}) {
  const app = express()

  if (options.enableCors) {
    app.use(cors())
  }
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ extended: true, limit: '50mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'JG Server is running' })
  })

  app.use('/api/connections', connectionsRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/generate', generateRouter)
  app.use('/api/chats', chatsRouter)
  app.use('/api/characters', charactersRouter)
  app.use('/api/worldinfo', worldinfoRouter)
  app.use('/api/personas', personasRouter)
  app.use('/api/presets', presetsRouter)
  app.use('/api/extensions', extensionsRouter)
  app.use('/api/backup', backupRouter)

  if (options.clientDist) {
    const clientDist = path.resolve(options.clientDist)
    app.use(express.static(clientDist))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  return app
}

export function startServer(options: ServerOptions = {}): Promise<RunningServer> {
  const host = options.host ?? '127.0.0.1'
  const port = options.port ?? 3000
  const app = createApp(options)

  return new Promise((resolve, reject) => {
    const server = app.listen(port, host)
    server.once('error', reject)
    server.once('listening', () => {
      const address = server.address()
      const actualPort = typeof address === 'object' && address ? address.port : port
      const url = `http://${host}:${actualPort}`
      console.log(`\x1b[32m[JG Server] Running at ${url}\x1b[0m`)
      resolve({
        server,
        port: actualPort,
        url,
        close: () =>
          new Promise<void>((resolveClose, rejectClose) => {
            server.close((error) => (error ? rejectClose(error) : resolveClose()))
          }),
      })
    })
  })
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename
if (isDirectRun) {
  const clientDist =
    process.env.NODE_ENV === 'production'
      ? path.resolve(process.cwd(), '../client/dist')
      : undefined

  void startServer({
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '127.0.0.1',
    clientDist,
    enableCors: process.env.NODE_ENV !== 'production',
  }).catch((error: unknown) => {
    console.error('[JG Server] Failed to start', error)
    process.exitCode = 1
  })
}
