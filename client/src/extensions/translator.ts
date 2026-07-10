import type { ExtensionManifest } from '@shared/types'

export const translatorExtension: ExtensionManifest = {
  id: 'translator',
  name: '翻译器',
  description: '将 AI 的回复翻译成指定语言，或翻译用户消息为英文',
  version: '1.0.0',
  author: 'JG Built-in',
  icon: '🌐',
  settings: [
    {
      key: 'targetLang',
      label: '目标语言',
      type: 'select',
      default: 'zh',
      options: [
        { label: '中文', value: 'zh' },
        { label: '英文', value: 'en' },
        { label: '日文', value: 'ja' },
        { label: '韩文', value: 'ko' },
        { label: '法文', value: 'fr' },
        { label: '德文', value: 'de' },
      ],
    },
    {
      key: 'autoTranslate',
      label: '自动翻译 AI 回复',
      type: 'boolean',
      default: false,
      description: 'AI 回复后自动追加翻译',
    },
  ],
  actions: [
    {
      id: 'translate-last',
      label: '翻译最后一条消息',
      icon: '🌐',
      handler: async (ctx) => {
        const lastMsg = ctx.getLastMessage()
        if (!lastMsg || !lastMsg.content) {
          alert('没有可翻译的消息')
          return
        }
        const targetLang = ctx.settings.targetLang as string
        const langNames: Record<string, string> = {
          zh: '中文', en: '英文', ja: '日文', ko: '韩文', fr: '法文', de: '德文',
        }
        ctx.insertText(`\n\n---\n**翻译 (${langNames[targetLang] || targetLang}):** [请翻译以下内容为${langNames[targetLang] || targetLang}]\n${lastMsg.content}`)
      },
    },
    {
      id: 'translate-input',
      label: '翻译输入消息为英文',
      icon: '🌐',
      handler: (ctx) => {
        const input = prompt('输入要翻译为英文的文本:')
        if (!input) return
        ctx.sendMessage(`[请将以下内容翻译为英文]\n${input}`)
      },
    },
  ],
  hooks: [
    {
      type: 'onMessageReceived',
      handler: (ctx, data) => {
        const autoTranslate = ctx.settings.autoTranslate as boolean
        if (!autoTranslate) return
        const msg = data as { role: string; content: string }
        if (!msg || msg.role !== 'assistant') return
        const targetLang = ctx.settings.targetLang as string
        const langNames: Record<string, string> = {
          zh: '中文', en: '英文', ja: '日文', ko: '韩文', fr: '法文', de: '德文',
        }
        ctx.insertText(`\n\n---\n**翻译 (${langNames[targetLang] || targetLang}):** 待翻译`)
      },
    },
  ],
}
