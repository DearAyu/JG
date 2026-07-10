# JG - 架构设计文档

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────┐
│                  浏览器 (用户端)                    │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Views   │  │ Stores   │  │  Services    │    │
│  │ (Pages)  │←→│ (Pinia)  │←→│  (API/LLM)   │    │
│  └────┬─────┘  └──────────┘  └──────┬───────┘    │
│       │                              │             │
│  ┌────┴──────────────────────────────┴──────┐    │
│  │            Components (UI)                │    │
│  └───────────────────────────────────────────┘    │
└───────────────────────┬───────────────────────────┘
                        │ HTTP / SSE
                        ▼
┌─────────────────────────────────────────────────┐
│              Express 后端服务                      │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Routes  │→│ Services  │→│   FileStore   │    │
│  │ (API)    │  │ (Logic)  │  │  (JSON/FS)   │    │
│  └──────────┘  └────┬─────┘  └──────────────┘    │
│                     │                             │
│              ┌──────┴───────┐                     │
│              │  LLM Proxy   │                     │
│              │  (SSE Stream)│                     │
│              └──────┬───────┘                     │
└─────────────────────┼───────────────────────────┘
                      │ HTTPS
                      ▼
              ┌───────────────┐
              │   LLM API     │
              │ (OpenAI etc)  │
              └───────────────┘
```

## 2. 技术栈详情

### 前端
| 技术 | 用途 | 理由 |
|------|------|------|
| Vue 3 | UI 框架 | Composition API, 用户选择 |
| TypeScript | 类型安全 | 大型项目必需 |
| Vite | 构建工具 | 快速 HMR, Vue 官方推荐 |
| Pinia | 状态管理 | Vue 官方推荐, 比 Vuex 简洁 |
| Vue Router | 路由 | Vue 生态标准 |
| Tailwind CSS | 样式 | 快速开发, 主题系统友好 |
| vue-i18n | 国际化 | 中/英双语支持 |

### 后端
| 技术 | 用途 | 理由 |
|------|------|------|
| Node.js | 运行时 | 与前端同语言 |
| Express | HTTP 服务 | 成熟稳定, 中间件丰富 |
| TypeScript | 类型安全 | 前后端共享类型 |
| SSE (Server-Sent Events) | 流式输出 | LLM 流式响应标准方案 |
| multer | 文件上传 | 头像/PNG 角色卡导入 |
| png-metadata | PNG 元数据 | 角色卡嵌入/提取 |

### 开发工具
| 工具 | 用途 |
|------|------|
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Vue DevTools | 调试 |
| concurrently | 同时运行前后端 |

## 3. 前端目录结构

```
client/src/
├── App.vue                      # 根组件
├── main.ts                      # 应用入口
│
├── router/                      # 路由
│   └── index.ts
│
├── stores/                      # Pinia 状态管理
│   ├── chat.ts                  # 聊天状态
│   ├── character.ts             # 角色卡状态
│   ├── worldinfo.ts             # 世界书状态
│   ├── persona.ts               # 用户人设状态
│   ├── preset.ts                # 生成预设状态
│   ├── connection.ts            # API 连接状态
│   └── settings.ts              # 全局设置状态
│
├── views/                       # 页面视图
│   ├── ChatView.vue             # 主聊天页
│   ├── CharacterView.vue        # 角色管理页
│   ├── WorldInfoView.vue        # 世界书管理页
│   ├── PersonaView.vue          # 人设管理页
│   ├── PresetView.vue           # 预设管理页
│   └── SettingsView.vue         # 设置页
│
├── components/                  # 可复用组件
│   ├── layout/
│   │   ├── AppSidebar.vue       # 左侧边栏
│   │   ├── AppHeader.vue        # 顶部栏
│   │   └── AppLayout.vue        # 主布局
│   ├── chat/
│   │   ├── ChatWindow.vue       # 聊天消息容器
│   │   ├── ChatMessage.vue      # 单条消息
│   │   ├── ChatInput.vue        # 消息输入框
│   │   ├── ChatToolbar.vue      # 聊天工具栏
│   │   ├── SwipeNavigator.vue   # Swipe 切换器
│   │   └── AuthorNote.vue       # Author's Note 输入
│   ├── character/
│   │   ├── CharacterCard.vue    # 角色卡片
│   │   ├── CharacterEditor.vue  # 角色编辑器
│   │   └── CharacterImporter.vue # 角色导入器
│   ├── worldinfo/
│   │   ├── WorldInfoEditor.vue  # 世界书编辑器
│   │   └── WorldInfoEntry.vue   # 单个条目编辑
│   ├── settings/
│   │   ├── ConnectionForm.vue   # API 连接配置
│   │   ├── PresetEditor.vue     # 预设编辑器
│   │   └── ThemeSettings.vue    # 主题设置
│   └── common/
│       ├── Modal.vue            # 模态框
│       ├── FileUpload.vue       # 文件上传
│       ├── ConfirmDialog.vue    # 确认对话框
│       └── Icon.vue             # 图标组件
│
├── services/                    # 业务服务层
│   ├── api.ts                   # 后端 API 客户端
│   ├── llm/
│   │   ├── types.ts             # LLM 请求/响应类型
│   │   ├── openai.ts            # OpenAI 兼容适配器
│   │   ├── claude.ts            # Claude 适配器
│   │   └── index.ts             # 统一接口
│   ├── prompt-builder.ts        # 提示词组装引擎
│   ├── token-counter.ts         # Token 计数器
│   └── character-card.ts        # 角色卡解析/导出
│
├── types/                       # TypeScript 类型定义
│   ├── index.ts                 # 统一导出
│   ├── character.ts             # 角色卡类型
│   ├── chat.ts                  # 聊天类型
│   ├── worldinfo.ts             # 世界书类型
│   ├── persona.ts               # 人设类型
│   ├── preset.ts                # 预设类型
│   ├── connection.ts            # 连接类型
│   └── settings.ts              # 设置类型
│
├── composables/                 # Vue 组合式函数
│   ├── useStreaming.ts          # SSE 流式响应 hook
│   ├── useTheme.ts              # 主题管理 hook
│   ├── useShortcut.ts           # 键盘快捷键 hook
│   └── useFileUpload.ts         # 文件上传 hook
│
├── utils/                       # 工具函数
│   ├── file.ts                  # 文件操作
│   ├── format.ts                # 格式化
│   ├── id.ts                    # ID 生成
│   └── markdown.ts              # Markdown 渲染
│
└── assets/                      # 静态资源
    ├── styles/
    │   ├── main.css             # 全局样式
    │   └── themes.css           # 主题变量
    └── icons/
```

## 4. 后端目录结构

```
server/src/
├── index.ts                     # 服务入口
│
├── routes/                      # API 路由
│   ├── characters.ts            # 角色卡 API
│   ├── chats.ts                 # 聊天 API
│   ├── worldinfo.ts             # 世界书 API
│   ├── personas.ts              # 人设 API
│   ├── presets.ts               # 预设 API
│   ├── settings.ts              # 设置 API
│   ├── connections.ts           # 连接 API
│   └── generate.ts              # LLM 生成 API (SSE)
│
├── services/                    # 业务逻辑
│   ├── llm/
│   │   ├── openai.ts            # OpenAI 兼容
│   │   ├── claude.ts            # Claude
│   │   └── index.ts             # 统一接口
│   ├── file-store.ts            # 文件存储服务
│   └── png-metadata.ts          # PNG 元数据服务
│
├── middleware/
│   ├── error-handler.ts         # 错误处理中间件
│   └── cors.ts                  # CORS 配置
│
├── utils/
│   ├── id.ts                    # ID 生成
│   └── path.ts                  # 路径工具
│
└── types/                       # 共享类型 (与前端口端共用)
    └── index.ts
```

## 5. 数据流架构

### 5.1 消息发送流程

```
用户输入消息
    │
    ▼
ChatInput.vue → chat store.sendMessage(text)
    │
    ▼
chat store 调用 promptBuilder.buildContext(session, character, persona, worldInfo)
    │
    ▼
promptBuilder 组装完整消息数组:
  [system_prompt, character_desc, world_info, persona, ...chat_history, new_message]
    │
    ▼
chat store 调用 llmService.generate(messages, preset, connection)
    │
    ▼
api.ts → POST /api/generate (SSE)
    │
    ▼
后端 generate.ts 路由 → llm/openai.ts → 调用 LLM API
    │
    ▼
LLM API 返回流式 tokens
    │
    ▼
后端通过 SSE 逐 token 转发给前端
    │
    ▼
前端 useStreaming 接收 → chat store 追加到当前消息
    │
    ▼
ChatMessage.vue 实时渲染流式内容
    │
    ▼
流结束 → chat store 保存消息到后端 (POST /api/chats/:id/messages)
```

### 5.2 提示词组装流程

```
PromptBuilder.buildContext()
    │
    ├── 1. System Prompt (用户自定义 or 默认)
    ├── 2. 角色描述 (character.description)
    ├── 3. 角色性格 (character.personality)
    ├── 4. 场景描述 (character.scenario)
    ├── 5. 角色示例对话 (character.mes_example)
    ├── 6. 世界书条目 (worldInfoEngine.scan(messages))
    ├── 7. 用户人设 (persona.description)
    ├── 8. 聊天历史 (按 token 预算截断)
    │      └── Author's Note 在指定 depth 位置注入
    ├── 9. Post-history instructions (character.post_history_instructions)
    │
    ▼
    tokenCounter.count(messages) → 检查是否超出预算
    │
    ▼
    超出 → 从最早的聊天历史开始删除, 保留 system/角色/世界书
    │
    ▼
    返回最终 messages[]
```

## 6. API 接口设计

### 6.1 角色 API
```
GET    /api/characters              # 获取所有角色
GET    /api/characters/:id          # 获取单个角色
POST   /api/characters              # 创建角色
PUT    /api/characters/:id          # 更新角色
DELETE /api/characters/:id          # 删除角色
POST   /api/characters/import       # 导入角色 (JSON/PNG)
GET    /api/characters/:id/export   # 导出角色 (JSON/PNG)
POST   /api/characters/:id/avatar   # 上传头像
GET    /api/characters/:id/avatar   # 获取头像
```

### 6.2 聊天 API
```
GET    /api/chats                   # 获取所有聊天 (支持 ?characterId= 过滤)
GET    /api/chats/:id               # 获取单个聊天 + 所有消息
POST   /api/chats                   # 创建聊天
PUT    /api/chats/:id               # 更新聊天 (标题等)
DELETE /api/chats/:id               # 删除聊天
POST   /api/chats/:id/messages      # 追加消息
PUT    /api/chats/:id/messages/:msgId  # 编辑消息
DELETE /api/chats/:id/messages/:msgId  # 删除消息
POST   /api/chats/:id/regenerate    # 重新生成最后一条 AI 消息
```

### 6.3 生成 API (SSE)
```
POST   /api/generate                # LLM 生成 (SSE 流式)
  Body: {
    messages: Message[]
    preset: GenerationPreset
    connection: ConnectionConfig
  }
  Response: SSE stream
    data: { type: "token", content: "..." }
    data: { type: "done" }
    data: { type: "error", message: "..." }
```

### 6.4 世界书 API
```
GET    /api/worldinfo               # 获取所有世界书
GET    /api/worldinfo/:id           # 获取单个世界书
POST   /api/worldinfo               # 创建世界书
PUT    /api/worldinfo/:id           # 更新世界书
DELETE /api/worldinfo/:id           # 删除世界书
```

### 6.5 人设 API
```
GET    /api/personas                # 获取所有人设
POST   /api/personas                # 创建人设
PUT    /api/personas/:id            # 更新人设
DELETE /api/personas/:id            # 删除人设
POST   /api/personas/:id/avatar     # 上传人设头像
```

### 6.6 预设 API
```
GET    /api/presets                 # 获取所有预设
POST   /api/presets                 # 创建预设
PUT    /api/presets/:id             # 更新预设
DELETE /api/presets/:id             # 删除预设
POST   /api/presets/import          # 导入预设 (JSON)
```

### 6.7 设置 & 连接 API
```
GET    /api/settings                # 获取全局设置
PUT    /api/settings                # 更新全局设置
GET    /api/connections             # 获取所有连接配置
POST   /api/connections             # 创建连接配置
PUT    /api/connections/:id         # 更新连接配置
DELETE /api/connections/:id         # 删除连接配置
POST   /api/connections/:id/test    # 测试连接
```

## 7. LLM 适配器架构

```
LLMAdapter (统一接口)
├── generate(messages, preset): AsyncGenerator<string>
└── countTokens(messages): number

实现:
├── OpenAIAdapter     → /v1/chat/completions (OpenAI, OpenRouter, 本地兼容)
├── ClaudeAdapter     → /v1/messages (Anthropic)
├── KoboldAdapter     → /api/v1/generate (KoboldAI)
└── OllamaAdapter     → /api/chat (Ollama)
```

每个适配器负责:
1. 将统一消息格式转换为目标 API 格式
2. 将统一参数映射为 API 特定参数
3. 处理流式响应解析
4. 处理错误和重试

## 8. 文件存储格式

### 角色卡文件: `data/characters/{id}.json`
```json
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": { ... }
}
```

### 聊天记录: `data/chats/{id}.json`
```json
{
  "id": "chat_xxx",
  "characterId": "char_xxx",
  "personaId": "persona_xxx",
  "title": "与 Alice 的对话",
  "presetId": "preset_xxx",
  "createdAt": 1700000000000,
  "updatedAt": 1700000000000,
  "messages": [
    {
      "id": "msg_xxx",
      "role": "user",
      "content": "你好",
      "timestamp": 1700000000000
    },
    {
      "id": "msg_yyy",
      "role": "assistant",
      "content": "你好！",
      "timestamp": 1700000001000,
      "swipes": ["你好！", "嗨~"],
      "swipeIndex": 0
    }
  ]
}
```

### 世界书: `data/worldinfo/{id}.json`
### 人设: `data/personas/{id}.json`
### 预设: `data/presets/{id}.json`
### 全局设置: `data/settings.json`
### 连接配置: `data/connections.json`

## 9. 主题系统设计

```css
/* themes.css */
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f3460;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent-color: #e94560;
  --border-color: #2a2a4a;
  --message-user-bg: #16213e;
  --message-assistant-bg: #0f3460;
  --font-size: 15px;
  --font-family: 'Segoe UI', sans-serif;
}

[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-secondary: #606060;
  ...
}
```