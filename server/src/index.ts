import express from 'express'
import cors from 'cors'
import path from 'path'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000

app.use(cors())
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

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(clientDist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\x1b[32m[JG Server] Running at http://localhost:${PORT}\x1b[0m`)
})