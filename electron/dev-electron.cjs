const fs = require('fs')
const path = require('path')
const { spawn, spawnSync } = require('child_process')
const electronPath = require('electron')

const projectRoot = path.resolve(__dirname, '..')
const configPath = path.join(process.env.APPDATA ?? '', 'jg', 'storage-location.json')

function readDataDir() {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  if (config.version !== 1 || typeof config.dataDir !== 'string' || !path.isAbsolute(config.dataDir)) {
    throw new Error('JG 数据目录配置无效，请重新运行 npm run desktop:dev')
  }
  return path.resolve(config.dataDir)
}

const dataDir = readDataDir()
const runtimeDir = path.join(dataDir, '.jg-runtime', 'electron-dev')
fs.mkdirSync(runtimeDir, { recursive: true })

const electronProcess = spawn(
  electronPath,
  [`--user-data-dir=${runtimeDir}`, projectRoot, '--dev'],
  { stdio: 'inherit', windowsHide: false }
)

let isStopping = false

function stopElectron() {
  if (isStopping) return
  isStopping = true

  if (process.platform === 'win32' && electronProcess.pid) {
    spawnSync('taskkill', ['/pid', String(electronProcess.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    electronProcess.kill('SIGTERM')
  }
}

process.on('SIGINT', stopElectron)
process.on('SIGTERM', stopElectron)

electronProcess.on('exit', (code) => {
  process.exitCode = code ?? 0
})

electronProcess.on('error', (error) => {
  console.error('[JG Electron] 启动失败', error)
  process.exitCode = 1
})
