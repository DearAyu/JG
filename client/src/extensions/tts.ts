import type { ExtensionManifest } from '@shared/types'

export const ttsExtension: ExtensionManifest = {
  id: 'tts',
  name: '文字转语音',
  description: '使用浏览器语音引擎朗读 AI 回复',
  version: '1.0.0',
  author: 'JG Built-in',
  icon: '🔊',
  settings: [
    {
      key: 'voice',
      label: '语音引擎',
      type: 'select',
      default: '',
      options: [],
      description: '可用的语音引擎（需浏览器支持）',
    },
    {
      key: 'rate',
      label: '语速',
      type: 'number',
      default: 1.0,
      description: '0.5 - 2.0',
    },
    {
      key: 'pitch',
      label: '音调',
      type: 'number',
      default: 1.0,
      description: '0.5 - 2.0',
    },
    {
      key: 'autoPlay',
      label: '自动朗读 AI 回复',
      type: 'boolean',
      default: false,
    },
  ],
  actions: [
    {
      id: 'speak-last',
      label: '朗读最后一条 AI 回复',
      icon: '🔊',
      handler: (ctx) => {
        const lastMsg = ctx.getLastMessage()
        if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) {
          alert('没有可朗读的 AI 回复')
          return
        }
        speak(lastMsg.content, ctx.settings)
      },
    },
    {
      id: 'stop-speak',
      label: '停止朗读',
      icon: '🔇',
      handler: () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
        }
      },
    },
  ],
  hooks: [
    {
      type: 'onMessageReceived',
      handler: (ctx, data) => {
        const autoPlay = ctx.settings.autoPlay as boolean
        if (!autoPlay) return
        const msg = data as { role: string; content: string }
        if (!msg || msg.role !== 'assistant') return
        speak(msg.content, ctx.settings)
      },
    },
  ],
}

function speak(text: string, settings: Record<string, string | number | boolean>) {
  if (!('speechSynthesis' in window)) {
    alert('浏览器不支持语音合成')
    return
  }
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = Number(settings.rate ?? 1.0)
  utterance.pitch = Number(settings.pitch ?? 1.0)

  const voices = window.speechSynthesis.getVoices()
  const voiceName = settings.voice as string
  if (voiceName) {
    const voice = voices.find((v) => v.name === voiceName)
    if (voice) utterance.voice = voice
  }

  window.speechSynthesis.speak(utterance)
}
