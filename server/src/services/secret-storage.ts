import { Dpapi, isPlatformSupported } from '@primno/dpapi'

const SECRET_PREFIX = 'dpapi:v1:'
const SECRET_ENTROPY = Buffer.from('JG:connection-api-key:v1', 'utf8')

function ensureSupported(): void {
  if (!isPlatformSupported) {
    throw new Error('当前系统不支持 Windows DPAPI，无法安全保存 API Key')
  }
}

export function protectSecret(value: string): string {
  if (!value) return ''
  ensureSupported()

  const encrypted = Dpapi.protectData(
    Buffer.from(value, 'utf8'),
    SECRET_ENTROPY,
    'CurrentUser'
  )
  return `${SECRET_PREFIX}${Buffer.from(encrypted).toString('base64')}`
}

export function unprotectSecret(value: string): string {
  if (!value) return ''
  if (!value.startsWith(SECRET_PREFIX)) {
    throw new Error('无法识别 API Key 的加密格式')
  }
  ensureSupported()

  const encrypted = Buffer.from(value.slice(SECRET_PREFIX.length), 'base64')
  const decrypted = Dpapi.unprotectData(encrypted, SECRET_ENTROPY, 'CurrentUser')
  return Buffer.from(decrypted).toString('utf8')
}
