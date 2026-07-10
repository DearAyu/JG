# JG - SillyTavern Clone 开发路线图

> 技术栈：Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS + Express
> 目标：完整复刻 SillyTavern 核心功能，个人使用

---

## 功能模块总览

| 模块 | 优先级 | 阶段 |
|------|--------|------|
| 项目脚手架 & 基础布局 | P0 | Phase 0 |
| LLM 连接 & 基础聊天 | P0 | Phase 1 |
| 聊天持久化 & 管理 | P0 | Phase 2 |
| 角色卡系统 | P0 | Phase 3 |
| 提示词工程系统 | P0 | Phase 4 |
| 世界书 / Lorebook | P1 | Phase 5 |
| 用户人设 (Persona) | P1 | Phase 6 |
| 生成参数预设 | P1 | Phase 7 |
| 高级聊天功能 (分支/群聊) | P2 | Phase 8 |
| UI/UX 主题美化 | P2 | Phase 9 |
| 扩展系统 | P3 | Phase 10 |
| 多 LLM 后端支持 | P1 | Phase 11 |

---

## Phase 0: 项目脚手架 & 基础布局

### 目标
搭建项目基础结构，建立前后端框架和基础UI布局。

### 任务清单
- [ ] 0.1 初始化 Vue 3 + Vite + TypeScript 项目
- [ ] 0.2 配置 Tailwind CSS
- [ ] 0.3 安装并配置 Pinia (状态管理)
- [ ] 0.4 安装并配置 Vue Router
- [ ] 0.5 创建 Express 后端服务基础结构
- [ ] 0.6 配置前后端开发代理 (Vite proxy)
- [ ] 0.7 创建主布局：左侧边栏 + 主内容区
- [ ] 0.8 创建基本路由: Chat / Characters / World Info / Settings
- [ ] 0.9 搭建后端文件存储目录结构
- [ ] 0.10 配置 ESLint + Prettier

### 交付物
```
jg/
├── client/               # Vue 3 前端
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── components/
│   │   ├── types/
│   │   ├── services/
│   │   └── assets/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── server/               # Express 后端
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tsconfig.json
└── package.json
```

### 文件存储结构
```
data/
├── characters/           # 角色卡 JSON
├── characters/avatars/   # 角色头像
├── chats/                # 聊天记录 JSON
├── worldinfo/             # 世界书 JSON
├── personas/              # 用户人设 JSON
├── presets/               # 生成参数预设 JSON
├── settings.json          # 全局设置
└── connections.json       # API 连接配置
```

---

## Phase 1: LLM 连接 & 基础聊天

### 目标
实现第一个可用的聊天功能：连接 OpenAI 兼容 API，发送和接收消息，支持流式输出。

### 任务清单
- [ ] 1.1 定义 LLM 连接数据类型 (ConnectionConfig)
- [ ] 1.2 创建后端 LLM 代理服务 (支持 OpenAI /chat/completions)
- [ ] 1.3 实现后端 `/api/generate` 流式接口 (SSE)
- [ ] 1.4 创建前端 API 连接设置页面 (URL / API Key / Model)
- [ ] 1.5 实现连接配置的保存和加载
- [ ] 1.6 创建聊天 UI 组件 (ChatWindow, MessageBubble, MessageInput)
- [ ] 1.7 实现前端流式消息接收 (EventSource/SSE)
- [ ] 1.8 实现消息发送基本流程: input → API → streaming response → display
- [ ] 1.9 基本错误处理 (连接失败、API错误等)

### 关键设计
```
聊天流程:
用户输入 → 前端组织消息数组 → POST /api/generate (SSE)
  → 后端代理到 LLM API → 逐 token 返回 → 前端追加显示
```

---

## Phase 2: 聊天持久化 & 管理

### 目标
聊天记录保存到本地文件，支持多个聊天会话管理。

### 任务清单
- [ ] 2.1 定义聊天数据模型 (ChatSession, ChatMessage)
- [ ] 2.2 后端: 创建聊天会话 (POST /api/chats)
- [ ] 2.3 后端: 获取聊天列表 (GET /api/chats)
- [ ] 2.4 后端: 获取单个聊天及其消息 (GET /api/chats/:id)
- [ ] 2.5 后端: 追加消息到聊天 (POST /api/chats/:id/messages)
- [ ] 2.6 后端: 删除聊天会话 (DELETE /api/chats/:id)
- [ ] 2.7 前端: 聊天列表侧边栏
- [ ] 2.8 前端: 自动保存消息到后端
- [ ] 2.9 前端: 切换聊天会话
- [ ] 2.10 前端: 编辑已发送的消息
- [ ] 2.11 前端: 删除消息
- [ ] 2.12 前端: 重新生成最后一条AI回复 (swipe)

### 数据模型
```typescript
interface ChatSession {
  id: string
  characterId: string | null
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  swipes?: string[]      // 重新生成的备选回复
  swipeIndex?: number     // 当前选中的 swipe
}
```

---

## Phase 3: 角色卡系统

### 目标
完整实现角色卡的创建、编辑、导入导出功能，支持 SillyTavern V2 角色卡规范。

### 任务清单
- [ ] 3.1 定义角色卡数据模型 (V2 规范兼容)
- [ ] 3.2 后端: 角色 CRUD (GET/POST/PUT/DELETE /api/characters)
- [ ] 3.3 前端: 角色列表页 (卡片/列表视图)
- [ ] 3.4 前端: 角色编辑器
  - [ ] 3.4.1 基本信息 (name, description, personality)
  - [ ] 3.4.2 场景信息 (scenario, first_mes, mes_example)
  - [ ] 3.4.3 高级字段 (creator_notes, tags, system_prompt, post_history)
  - [ ] 3.4.4 头像上传与裁剪
- [ ] 3.5 前端: 角色卡 JSON 导入
- [ ] 3.6 前端: 角色卡 PNG 导入 (从 PNG 元数据提取)
- [ ] 3.7 后端: 角色卡导出 (JSON)
- [ ] 3.8 后端: 角色卡 PNG 导出 (元数据嵌入 PNG)
- [ ] 3.9 前端: 在聊天中切换/选择角色
- [ ] 3.10 前端: 角色启动新聊天时自动发送 first_mes

### 角色卡数据模型 (V2)
```typescript
interface CharacterCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
    creator_notes: string
    system_prompt: string
    post_history_instructions: string
    tags: string[]
    creator: string
    character_version: string
    alternate_greetings: string[]
    extensions: Record<string, any>
    avatar?: string       // base64
  }
}
```

---

## Phase 4: 提示词工程系统

### 目标
实现完整的提示词组装系统，控制上下文构建顺序和内容注入。

### 任务清单
- [ ] 4.1 定义提示词模板数据模型
- [ ] 4.2 实现提示词组装引擎 (PromptBuilder)
  - [ ] 4.2.1 System Prompt 注入
  - [ ] 4.2.2 角色描述注入
  - [ ] 4.2.3 场景描述注入
  - [ ] 4.2.4 角色示例对话注入
  - [ ] 4.2.5 用户人设注入
  - [ ] 4.2.6 聊天历史注入 (按 token 限制截断)
  - [ ] 4.2.7 Author's Note 注入 (可配置深度)
  - [ ] 4.2.8 世界书内容注入
  - [ ] 4.2.9 Post-history instructions 注入
- [ ] 4.3 实现 Token 计数器 (tiktoken / 估算)
- [ ] 4.4 实现上下文长度管理 (token预算分配)
- [ ] 4.5 前端: 提示词顺序可视化编辑器
- [ ] 4.6 前端: Author's Note 输入框 (聊天内)
- [ ] 4.7 前端: 提示词预览/调试面板

### 提示词组装顺序
```
1. System Prompt (可自定义)
2. 角色描述 (description)
3. 角色性格 (personality)
4. 场景 (scenario)
5. 角色示例对话 (mes_example)
6. 世界书条目 (根据关键词激活)
7. 用户人设 (persona description)
8. [聊天历史] (按token预算截断)
   - Author's Note 在指定深度位置注入
9. Post-history instructions
```

---

## Phase 5: 世界书 / Lorebook

### 目标
实现世界书系统，基于关键词匹配在聊天上下文中注入相关知识。

### 任务清单
- [ ] 5.1 定义世界书数据模型 (WorldBook, WorldBookEntry)
- [ ] 5.2 后端: 世界书 CRUD (GET/POST/PUT/DELETE /api/worldinfo)
- [ ] 5.3 前端: 世界书列表页
- [ ] 5.4 前端: 世界书编辑器
  - [ ] 5.4.1 条目编辑 (keys, content, comment)
  - [ ] 5.4.2 激活条件 (primary keys, optional keys)
  - [ ] 5.4.3 逻辑运算 (AND / OR / NOT)
  - [ ] 5.4.4 注入位置 (before_char / after_char / at_depth)
  - [ ] 5.4.5 顺序 (order) 和深度 (depth)
  - [ ] 5.4.6 启用/禁用开关
- [ ] 5.5 实现关键词扫描引擎 (扫描最近 N 条消息)
- [ ] 5.6 实现条目排序和上下文注入逻辑
- [ ] 5.7 世界书绑定到角色 / 全局世界书
- [ ] 5.8 前端: 实时预览激活的条目

### 数据模型
```typescript
interface WorldBook {
  id: string
  name: string
  description: string
  entries: WorldBookEntry[]
}

interface WorldBookEntry {
  id: string
  keys: string[]           // 主关键词
  secondaryKeys: string[] // 次要关键词
  content: string
  comment: string
  enabled: boolean
  selective: boolean       // 是否使用逻辑组合
  insertionOrder: number
  position: 'before_char' | 'after_char' | 'at_depth'
  depth: number            // 注入深度 (Messages)
  constant: boolean        // 常驻注入 (不需要关键词触发)
}
```

---

## Phase 6: 用户人设 (Persona)

### 目标
实现用户人设系统，让 AI 了解用户的身份设定。

### 任务清单
- [ ] 6.1 定义 Persona 数据模型
- [ ] 6.2 后端: Persona CRUD (GET/POST/PUT/DELETE /api/personas)
- [ ] 6.3 前端: 人设列表页
- [ ] 6.4 前端: 人设编辑器 (name, description, avatar)
- [ ] 6.5 前端: 人设切换器 (聊天页内)
- [ ] 6.6 将活跃人设注入提示词系统
- [ ] 6.7 人设头像上传与裁剪

---

## Phase 7: 生成参数预设

### 目标
实现 LLM 生成参数的预设管理，支持快速切换不同的参数配置。

### 任务清单
- [ ] 7.1 定义预设数据模型
- [ ] 7.2 后端: 预设 CRUD (GET/POST/PUT/DELETE /api/presets)
- [ ] 7.3 前端: 预设列表和切换器
- [ ] 7.4 前端: 预设编辑器
  - [ ] 7.4.1 基础参数 (temperature, max_tokens, top_p)
  - [ ] 7.4.2 高级参数 (top_k, frequency_penalty, presence_penalty, stop)
- [ ] 7.5 按聊天会话保存当前预设
- [ ] 7.6 导入/导出预设 (JSON)
- [ ] 7.7 兼容 SillyTavern 预设格式

```typescript
interface GenerationPreset {
  id: string
  name: string
  temperature: number
  max_tokens: number
  top_p: number
  top_k: number
  frequency_penalty: number
  presence_penalty: number
  repetition_penalty: number
  stop: string[]
  stream: boolean
}
```

---

## Phase 8: 高级聊天功能

### 目标
实现消息分支、重新生成备选回复、群聊等高级功能。

### 任务清单
- [ ] 8.1 消息 Swipe 系统
  - [ ] 8.1.1 保存多个备选回复
  - [ ] 8.1.2 Swipe 导航UI (左右切换)
  - [ ] 8.1.3 重新生成时不覆盖原回复
- [ ] 8.2 聊天分支
  - [ ] 8.2.1 从任意消息处分叉新聊天
  - [ ] 8.2.2 分支管理树状视图
- [ ] 8.3 群聊系统
  - [ ] 8.3.1 群聊创建 (选择多个角色)
  - [ ] 8.3.2 群聊消息轮转逻辑
  - [ ] 8.3.3 指定角色回复
  - [ ] 8.3.4 群聊设置 (发言顺序、激活策略)
- [ ] 8.4 消息高级操作
  - [ ] 8.4.1 以不同用户身份发送
  - [ ] 8.4.2 消息标记/收藏
  - [ ] 8.4.3 滚动到上次阅读位置

---

## Phase 9: UI/UX 主题美化

### 目标
完善用户体验，支持主题切换和界面自定义。

### 任务清单
- [ ] 9.1 主题系统 (暗色/亮色/自定义)
- [ ] 9.2 CSS 变量驱动的主题引擎
- [ ] 9.3 字体大小/类型可配置
- [ ] 9.4 消息气泡样式 (角色头像、名称颜色)
- [ ] 9.5 响应式布局适配
- [ ] 9.6 键盘快捷键 (Enter发送, Shift+Enter换行, ↑编辑上一条等)
- [ ] 9.7 聊天内搜索
- [ ] 9.8 消息格式化 (Markdown渲染, 代码高亮)
- [ ] 9.9 动画过渡效果
- [ ] 9.10 设置导入/导出

---

## Phase 10: 扩展系统

### 目标
实现插件架构，支持扩展功能。

### 任务清单
- [ ] 10.1 扩展 API 设计 (Extension Interface)
- [ ] 10.2 扩展加载器 (动态加载)
- [ ] 10.3 扩展设置 UI 框架
- [ ] 10.4 内置扩展: 骰子工具
- [ ] 10.5 内置扩展: 翻译器
- [ ] 10.6 内置扩展: TTS (文字转语音)
- [ ] 10.7 扩展市场/仓库浏览 (可选)

---

## Phase 11: 多 LLM 后端支持

### 目标
扩展支持更多 LLM API 后端。

### 任务清单
- [ ] 11.1 OpenAI 兼容 API (已完成于 Phase 1)
- [ ] 11.2 Claude API (Anthropic)
- [ ] 11.3 KoboldAI / KoboldCpp
- [ ] 11.4 Text-generation-webui (Ollama 兼容)
- [ ] 11.5 Google Gemini API
- [ ] 11.6 本地模型 (通过 LM Studio / Ollama)
- [ ] 11.7 自定义 API 端点配置
- [ ] 11.8 每种后端的参数映射适配

---

## 里程碑时间线 (建议)

| 里程碑 | 阶段 | 状态 |
|--------|------|------|
| M1: 可以和AI聊天 | Phase 0-1 | 待开始 |
| M2: 聊天记录可保存 | Phase 2 | 待开始 |
| M3: 可以使用角色卡 | Phase 3 | 待开始 |
| M4: 完整提示词系统 | Phase 4 | 待开始 |
| M5: 世界书可用 | Phase 5 | 待开始 |
| M6: 正式日常使用 | Phase 6-7 | 待开始 |
| M7: 高级功能完成 | Phase 8-9 | 待开始 |
| M8: 功能完整版 | Phase 10-11 | 待开始 |