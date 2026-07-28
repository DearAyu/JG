const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const serverDir = __dirname
const sourceDir = path.join(serverDir, 'src')
const tsxCli = require.resolve('tsx/cli', { paths: [serverDir] })

let child = null
let restartTimer = null
let isStopping = false

function stopChild() {
  if (!child || child.killed) return
  child.kill('SIGTERM')
}

function scheduleStart(delay = 1000) {
  clearTimeout(restartTimer)
  restartTimer = setTimeout(startChild, delay)
}

function startChild() {
  if (isStopping) return

  child = spawn(process.execPath, [tsxCli, 'src/index.ts'], {
    cwd: serverDir,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  })

  child.once('exit', (code, signal) => {
    child = null
    if (isStopping) return

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    console.warn(`[JG Server] Dev process exited with ${reason}; restarting...`)
    scheduleStart()
  })

  child.once('error', (error) => {
    console.error('[JG Server] Failed to launch dev process', error)
  })
}

const watcher = fs.watch(sourceDir, { recursive: true }, () => {
  if (isStopping) return

  clearTimeout(restartTimer)
  stopChild()
  scheduleStart(150)
})

function shutdown() {
  if (isStopping) return
  isStopping = true
  clearTimeout(restartTimer)
  watcher.close()
  stopChild()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

startChild()
