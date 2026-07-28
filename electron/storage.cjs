const fs = require('fs')
const path = require('path')

const STORAGE_CONFIG_NAME = 'storage-location.json'

function getSharedConfigDir(app) {
  return path.join(app.getPath('appData'), 'jg')
}

function getStorageConfigPath(app) {
  return path.join(getSharedConfigDir(app), STORAGE_CONFIG_NAME)
}

function readConfiguredDataDir(app) {
  try {
    const config = JSON.parse(fs.readFileSync(getStorageConfigPath(app), 'utf8'))
    if (config.version !== 1 || typeof config.dataDir !== 'string') return null
    if (!path.isAbsolute(config.dataDir)) return null
    return path.resolve(config.dataDir)
  } catch {
    return null
  }
}

function writeConfiguredDataDir(app, dataDir) {
  const configPath = getStorageConfigPath(app)
  fs.mkdirSync(path.dirname(configPath), { recursive: true })
  fs.writeFileSync(
    configPath,
    JSON.stringify({ version: 1, dataDir: path.resolve(dataDir) }, null, 2),
    'utf8'
  )
}

function hasFiles(dir) {
  try {
    return fs.statSync(dir).isDirectory() && fs.readdirSync(dir).length > 0
  } catch {
    return false
  }
}

function getLegacyDataDirs(app, projectRoot, targetDir) {
  const candidates = [
    {
      label: '迁移开发数据',
      detail: '项目中的角色、聊天、设置和连接配置',
      dir: path.join(projectRoot, 'server', 'data'),
    },
    {
      label: '迁移安装版数据',
      detail: '原 AppData 中的角色、聊天和设置',
      dir: path.join(getSharedConfigDir(app), 'data'),
    },
  ]

  return candidates.filter(
    (candidate) => path.resolve(candidate.dir) !== targetDir && hasFiles(candidate.dir)
  )
}

async function migrateLegacyData(app, dialog, projectRoot, targetDir) {
  if (hasFiles(targetDir)) return

  const candidates = getLegacyDataDirs(app, projectRoot, targetDir)
  if (candidates.length === 0) return

  const skipLabel = '使用空目录'
  const buttons = [...candidates.map((candidate) => candidate.label), skipLabel]
  const details = candidates
    .map((candidate) => `${candidate.label}：${candidate.dir}\n${candidate.detail}`)
    .join('\n\n')
  const skipIndex = buttons.length - 1
  const result = await dialog.showMessageBox({
    type: 'question',
    title: '选择要迁移的数据',
    message: '检测到多份现有数据，请明确选择其中一份。',
    detail: `${details}\n\n旧目录会保留为备份，不会被删除。`,
    buttons,
    defaultId: skipIndex,
    cancelId: skipIndex,
    noLink: true,
  })

  const source = candidates[result.response]
  if (!source) return

  fs.cpSync(source.dir, targetDir, {
    recursive: true,
    force: false,
    errorOnExist: true,
  })
}

async function ensureStorageDirectory(app, dialog, projectRoot) {
  const configuredDir = readConfiguredDataDir(app)
  if (configuredDir) {
    try {
      fs.mkdirSync(configuredDir, { recursive: true })
      return configuredDir
    } catch {
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: '数据目录不可用',
        message: `无法访问已配置的数据目录：\n${configuredDir}`,
        detail: '可能是磁盘未连接或目录权限发生变化。你可以重新选择目录。',
        buttons: ['重新选择', '退出'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      })
      if (result.response === 1) return null
    }
  }

  const defaultPath = fs.existsSync('D:\\') ? 'D:\\' : app.getPath('documents')
  const result = await dialog.showOpenDialog({
    title: '选择 JG 数据存储目录（建议新建专用文件夹）',
    buttonLabel: '使用此目录',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  })

  if (result.canceled || !result.filePaths[0]) return null

  const dataDir = path.resolve(result.filePaths[0])
  fs.mkdirSync(dataDir, { recursive: true })
  await migrateLegacyData(app, dialog, projectRoot, dataDir)
  writeConfiguredDataDir(app, dataDir)
  return dataDir
}

module.exports = {
  ensureStorageDirectory,
  getStorageConfigPath,
  readConfiguredDataDir,
}
