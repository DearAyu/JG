export interface AppFontPreset {
  label: string
  value: string
  description: string
}

export const appFontPresets: AppFontPreset[] = [
  {
    label: '普惠体',
    value: "'JG Alibaba PuHuiTi', 'Microsoft YaHei', sans-serif",
    description: '默认字体，现代、清晰，适合界面和正文',
  },
  {
    label: '钉钉进步体',
    value: "'JG DingTalk JinBuTi', 'Microsoft YaHei', sans-serif",
    description: '倾斜、有活力，更适合标题',
  },
  {
    label: '霞鹜文楷',
    value: "'JG LXGW WenKai', 'KaiTi', serif",
    description: '有书写感，适合角色对话和剧情',
  },
  {
    label: '思源宋体',
    value: "'JG Source Han Serif SC', 'SimSun', serif",
    description: '书卷感强，适合旁白和长篇剧情',
  },
]
