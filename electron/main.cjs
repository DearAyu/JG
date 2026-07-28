const { app, BrowserWindow, dialog, Menu, shell } = require('electron')
const path = require('path')
const { pathToFileURL } = require('url')
const { ensureStorageDirectory } = require('./storage.cjs')

const isDesktopDev = !app.isPackaged && process.argv.includes('--dev')

let mainWindow = null
let runningServer = null

async function createMainWindow() {
  Menu.setApplicationMenu(null)

  const projectRoot = path.resolve(__dirname, '..')
  const dataDir = await ensureStorageDirectory(app, dialog, projectRoot)
  if (!dataDir) {
    app.quit()
    return
  }

  process.env.JG_DATA_DIR = dataDir

  let appUrl = 'http://127.0.0.1:5173'

  if (!isDesktopDev) {
    const serverEntry = path.join(projectRoot, 'server', 'dist', 'server', 'src', 'index.js')
    const clientDist = path.join(projectRoot, 'client', 'dist')
    const { startServer } = await import(pathToFileURL(serverEntry).href)

    runningServer = await startServer({
      port: 0,
      host: '127.0.0.1',
      clientDist,
      enableCors: false,
    })
    appUrl = runningServer.url
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#f7f5f2',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)
    if (target.origin !== appUrl && target.protocol === 'https:') {
      void shell.openExternal(target.href)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appUrl) {
      event.preventDefault()
    }
  })

  await mainWindow.loadURL(appUrl)
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(createMainWindow).catch((error) => {
    dialog.showErrorBox('JG 启动失败', error instanceof Error ? error.message : String(error))
    app.quit()
  })
}

app.on('before-quit', () => {
  if (runningServer) {
    void runningServer.close()
    runningServer = null
  }
})

app.on('window-all-closed', () => {
  app.quit()
})
