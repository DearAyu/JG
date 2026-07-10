import { Router } from 'express'
import { generateLLM, type GenerateRequest } from '../services/llm/index.js'

const router = Router()

router.post('/', async (req, res) => {
  const generateReq = req.body as GenerateRequest

  if (!generateReq.connection) {
    res.status(400).json({ message: 'Connection config is required' })
    return
  }

  if (!generateReq.messages || !Array.isArray(generateReq.messages)) {
    res.status(400).json({ message: 'Messages array is required' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  const sendSSE = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const generator = generateLLM(generateReq)
    for await (const chunk of generator) {
      sendSSE(chunk)
      if (chunk.type === 'done' || chunk.type === 'error') {
        break
      }
    }
  } catch (err) {
    sendSSE({ type: 'error', message: (err as Error).message })
  }

  res.end()
})

export default router