const { app, dialog } = require('electron')
const path = require('path')
const { ensureStorageDirectory } = require('./storage.cjs')

app.whenReady().then(async () => {
  const projectRoot = path.resolve(__dirname, '..')
  const dataDir = await ensureStorageDirectory(app, dialog, projectRoot)
  app.exit(dataDir ? 0 : 1)
}).catch((error) => {
  dialog.showErrorBox('数据目录配置失败', error instanceof Error ? error.message : String(error))
  app.exit(1)
})
