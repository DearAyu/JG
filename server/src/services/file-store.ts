import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.resolve(__dirname, '../../data')

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function listJson<T>(dir: string): T[] {
  ensureDir(dir)
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  const items: T[] = []
  for (const file of files) {
    const item = readJson<T>(path.join(dir, file))
    if (item) items.push(item)
  }
  return items
}

function deleteFile(filePath: string): boolean {
  try {
    fs.unlinkSync(filePath)
    return true
  } catch {
    return false
  }
}

function getSubDir(name: string): string {
  return path.join(dataDir, name)
}

function generateId(prefix: string = ''): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 8)
  return `${prefix}${prefix ? '_' : ''}${ts}${rand}`
}

export const fileStore = {
  ensureDir,
  readJson,
  writeJson,
  listJson,
  deleteFile,
  getSubDir,
  generateId,
  dataDir,
}