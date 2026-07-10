import type { ExtensionManifest } from '@shared/types'

export const diceExtension: ExtensionManifest = {
  id: 'dice-roller',
  name: '骰子工具',
  description: '在聊天中投掷骰子，支持 d4/d6/d8/d10/d12/d20/d100 和自定义掷骰表达式',
  version: '1.0.0',
  author: 'JG Built-in',
  icon: '🎲',
  settings: [
    {
      key: 'defaultDice',
      label: '默认骰子类型',
      type: 'select',
      default: 'd20',
      options: [
        { label: 'D4', value: 'd4' },
        { label: 'D6', value: 'd6' },
        { label: 'D8', value: 'd8' },
        { label: 'D10', value: 'd10' },
        { label: 'D12', value: 'd12' },
        { label: 'D20', value: 'd20' },
        { label: 'D100', value: 'd100' },
      ],
    },
  ],
  actions: [
    {
      id: 'roll-d20',
      label: '投掷 D20',
      icon: '🎲',
      handler: (ctx) => {
        const result = Math.floor(Math.random() * 20) + 1
        const crit = result === 20 ? ' **暴击!**' : result === 1 ? ' **大失败!**' : ''
        ctx.sendMessage(`🎲 投掷 D20: ${result}${crit}`)
      },
    },
    {
      id: 'roll-d6',
      label: '投掷 D6',
      icon: '🎲',
      handler: (ctx) => {
        const result = Math.floor(Math.random() * 6) + 1
        ctx.sendMessage(`🎲 投掷 D6: ${result}`)
      },
    },
    {
      id: 'roll-custom',
      label: '自定义掷骰',
      icon: '🎲',
      handler: (ctx) => {
        const input = prompt('输入掷骰表达式 (如 3d6+2, 1d20, 2d10-1):')
        if (!input) return
        const match = input.match(/^(\d+)?d(\d+)([+-]\d+)?$/i)
        if (!match) {
          alert('无效的掷骰表达式，格式: NdM+K (如 3d6+2)')
          return
        }
        const count = parseInt(match[1] || '1')
        const sides = parseInt(match[2])
        const modifier = parseInt(match[3] || '0')
        if (sides < 2 || sides > 1000) {
          alert('骰子面数必须在 2-1000 之间')
          return
        }
        const rolls: number[] = []
        for (let i = 0; i < count; i++) {
          rolls.push(Math.floor(Math.random() * sides) + 1)
        }
        const sum = rolls.reduce((a, b) => a + b, 0) + modifier
        const rollStr = rolls.join(' + ')
        const modStr = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : ''
        ctx.sendMessage(`🎲 投掷 ${input}: [${rollStr}]${modStr} = **${sum}**`)
      },
    },
  ],
}
