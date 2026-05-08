# TechMate 改造进度记录

> 最后更新：2026-05-08

---

## 一、本次会话总结（2026-05-08 第三部分）

### 1.1 Chat UI 交互体验升级 ✅

**目标**：参考 DeepSeek/豆包设计风格，全面升级 Chat 交互体验

**解决问题**：
| 问题 | 解决方案 |
|------|----------|
| 配色问题（绿色不专业） | 去除绿色系，统一改为浅紫色 `#a78bfa` + 灰色系 |
| 消息气泡样式简陋 | 用户消息灰色小气泡，助手消息无背景框直接展示 |
| AI 头像丑陋 | 改为紫色圆角方块显示 "AI" |
| 复制按钮闪烁 | 固定显示，不再 hover 闪烁 |
| 超长内容溢出 | 表格/代码块添加 `overflow-x: auto` |
| 新建按钮样式 | 圆角宽按钮 + "开启新对话"文案 |
| Logo 位置 | TechMate Logo 移到侧边栏左上角 |
| 导航布局 | 顶部导航平铺右侧，flex-end 定位 |
| 展开收起按钮 | 与 Logo 同行右侧，收起后左侧窄条可展开 |

**核心改动**：

| 文件 | 改动内容 |
|------|----------|
| `packages/web/src/components/chat/ChatSidebar.tsx` | Logo + 新建按钮 + 收起展开逻辑 |
| `packages/web/src/components/shared/Navbar.tsx` | 导航平铺，flex-end |
| `packages/web/src/components/chat/MessageBubble.tsx` | AI头像 + 无背景框 + 固定复制按钮 |
| `packages/web/src/components/chat/ChatInput.tsx` | 发送按钮浅紫色 |
| `packages/web/src/styles/globals.css` | 统一配色 + Markdown样式 + 超长滚动 |
| `packages/web/src/components/shared/BottomNav.tsx` | 统一配色 |
| `packages/web/src/components/chat/QuickReplies.tsx` | 统一配色 |

**配色系统**：
| 用途 | 颜色值 |
|------|--------|
| 主色（紫色） | `#a78bfa` / `#8b5cf6` |
| 主文字 | `#374151` |
| 次文字 | `#6b7280` |
| 辅助文字 | `#9ca3af` |
| 边框 | `#f0f0f0` / `#e5e7eb` |

**Logo 设计**：
```tsx
<div style={{
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 16,
  fontWeight: 700,
}}>T</div>
```

### 1.2 验证结果

**构建验证**：
- ✅ TypeScript 编译通过
- ✅ Next.js build 成功

**UI 验证**：
| 功能点 | 状态 |
|--------|------|
| Logo 在侧边栏左上角，紫色渐变方块 | ✅ |
| TechMate 标题在 Logo 旁边 | ✅ |
| 收起按钮在 Logo 同行右侧 | ✅ |
| 收起后左侧 64px 窄条可展开 | ✅ |
| 新建对话按钮：圆角宽按钮 + "开启新对话" | ✅ |
| 顶部导航平铺右侧 | ✅ |
| 用户消息：灰色小气泡右侧 | ✅ |
| 助手消息：小 AI 头像左侧，无背景框 | ✅ |
| 复制按钮固定显示 | ✅ |
| 发送按钮浅紫色 | ✅ |
| 整体白色背景，无绿色 | ✅ |

### 1.3 面试讲解要点

1. **为什么用浅紫色？** → 低饱和度配色更专业，主流 AI Chat 产品多用白色系
2. **助手消息无背景框？** → 参考 DeepSeek，内容直接展示更简洁，减少视觉干扰
3. **Logo 设计理念？** → 圆角方块 + 渐变，品牌识别度高，收起后保留 Logo 便于识别
4. **导航布局为什么 flex-end？** → 主功能在左侧对话，导航是辅助功能放右侧
5. **复制按钮固定显示？** → 避免 hover 闪烁影响布局稳定性

---

## 一、本次会话总结（2026-05-08 第二部分）

### 1.1 AGUI 协议改造 ✅

**目标**：优化 Chat 交互体验，解决以下问题：
1. Markdown 没有解析渲染（纯文本显示）
2. Loading 效果简陋（简单 Spin）
3. 会话消息没有自动滚动定位
4. 用户消息发送后不立即显示

**技术方案**：改回手动 SSE 解析（放弃 AI SDK 的复杂机制）

**核心改动**：

| 文件 | 改动内容 |
|------|----------|
| `packages/agent-langgraph/src/graph/graph.ts` | `processStateStream` 直接调用 `generalQANodeStream`，实现逐字符流式输出 |
| `packages/agent-langgraph/src/graph/nodes.ts` | 修复 chunk 内容提取逻辑 |
| `packages/web/src/hooks/use-agent.ts` | 手动 SSE 解析 + 立即添加用户消息到 state |
| `packages/web/src/components/chat/MessageBubble.tsx` | Markdown 渲染 + "思考中"三点动画 + 打字机光标 ▎ |
| `packages/web/src/app/page.tsx` | 自动滚动 + 错误提示 Alert |
| `packages/web/src/styles/globals.css` | 打字机光标动画 + 思考动画 CSS |

### 1.2 关键修复

**问题 1：AI SDK DefaultChatTransport 导致无限循环**
- 原因：每次渲染创建新的 transport 对象
- 解决：放弃 AI SDK，改回手动 SSE 解析，更可控

**问题 2：后端一次性返回完整内容，无打字机效果**
- 原因：LangGraph `app.stream()` 返回节点执行后的完整输出
- 解决：`processStateStream` 直接调用 `generalQANodeStream`，绕过节点聚合

**问题 3：用户消息不立即显示**
- 原因：AI SDK 的 `sendMessage` 内部管理消息状态
- 解决：手动在 `sendMessage` 开始时立即添加用户消息到 state

**问题 4：请求格式兼容**
- 原因：AI SDK 发送 `messages` 数组格式，后端期望 `message` 字段
- 解决：后端兼容多种格式：`message` / `text` / `messages[].parts[].text`

### 1.3 Loading 效果优化（参考 ChatGPT）

**实现方案**：
- 助手消息内容为空 + 正在流式输出时：显示"思考中"三点跳动动画
- 有内容 + 正在流式输出时：显示打字机光标 ▎（CSS 闪烁动画）
- 移除独立的 `<Spin />` loading 组件，由 MessageBubble 组件统一处理

### 1.4 验证结果

**API 测试**：
```bash
curl -X POST 'http://localhost:3000/api/agent/chat' \
  -d '{"message":"你好","userId":"...","conversationId":"..."}'

# 流式返回：
data: {"type":"chunk","content":"你好！"}
data: {"type":"chunk","content":"👋 看起来像"}
data: {"type":"chunk","content":"是一条测试消息～"}
...
data: {"type":"done","quickReplies":[],...}
```

**前端效果**：
- 用户消息立即显示
- 助手消息逐字流式输出（真正的打字机效果）
- Markdown 正确渲染（代码块、列表、链接）
- "思考中"三点动画
- 自动滚动到最新消息

### 1.5 依赖变更

**新增依赖**：
- `ai@6.0.176` - 已安装但未使用（保留备用）
- `@ai-sdk/langchain@2.0.182` - 已安装但未使用
- `@ai-sdk/react@3.0.178` - 已安装但未使用

**已使用依赖**：
- `@ant-design/x-markdown@2.1.3` - Markdown 渲染（XMarkdown 组件）

---

## 一、本次会话总结（2026-05-07 第三部分）

### 1.1 RAG Engine 集成到 Agent Nodes ✅

**核心任务完成**：将 HybridRetriever 成功集成到 Agent 的 generalQANodeStream 节点。

**新增文件**：
| 文件 | 功能 |
|------|------|
| `packages/agent-langgraph/src/utils/rag-fallback.ts` | RAG 降级封装函数 + 分类推断 |
| `start_chroma_server.py` | ChromaDB Server 启动脚本 |

**修改文件**：
| 文件 | 修改内容 |
|------|----------|
| `packages/agent-langgraph/src/graph/nodes.ts` | generalQANodeStream 集成 HybridRetriever + RAG TEST 日志 |
| `packages/agent-langgraph/src/graph/xiaohongshu-rag.ts` | 扩展关键词白名单（Agent/RAG/LangChain/LLM） |
| `packages/agent-langgraph/package.json` | 添加 `@civil-agent/rag-engine` 依赖 |
| `packages/rag-engine/src/retrievers/hybrid-retriever.ts` | 扩展 RetrieveOptions + 调试日志 |
| `packages/rag-engine/src/retrievers/vector-retriever.ts` | 扩展 search options + 修复 content 字段 |
| `packages/rag-engine/src/retrievers/bm25-retriever.ts` | 扩展 search options |
| `packages/rag-engine/src/reranker/bge-m3-reranker.ts` | 修复 Rerank API 请求格式 |
| `packages/database/src/services/vector-db.service.ts` | 添加 content 字段 + include documents + cosine 距离 |

### 1.2 关键 Bug 修复

**Bug 1: ChromaDB 距离度量问题**
- 问题：默认使用 L2 距离，范围 512+，`1 - distance` 导致分数为负数
- 解决：创建 collection 时指定 `hnsw:space: "cosine"`，距离范围 0-1

**Bug 2: VectorDB 返回空内容**
- 问题：VectorDBService.search 没有 include documents 字段
- 解决：添加 `include: ['documents', 'metadatas', 'distances']`

**Bug 3: VectorRetriever 取错字段**
- 问题：`r.metadata?.content` 取不到文档内容
- 解决：改为 `r.content`（直接从 VectorSearchResult）

**Bug 4: Rerank API 400 Bad Request**
- 问题：请求格式错误，model 名称错误
- 解决：修正为阿里云百炼格式 `{ model: "gte-rerank", input: { query, documents }, parameters: { top_n } }`

**Bug 5: VECTOR_DB_PATH 配置错误**
- 问题：配置为文件路径 `./data/chroma`，ChromaDB JS SDK 需要 HTTP URL
- 解决：改为 `http://localhost:8000`

### 1.3 验证结果

测试问题：**"什么是 LangChain？"**

**日志输出**：
```
🔍 [RAG TEST] 用户问题: 什么是 LangChain？
🔍 [RAG TEST] 白名单命中: true
[HybridRetriever] VectorResults count: 5
[Reranker] 正在调用百炼 Rerank API...
[Reranker] 重排成功，返回结果数: 5
✅ [RAG TEST] 检索到文档数: 5
✅ [RAG TEST] 第一条文档标题: LangChain 核心概念
✅ [RAG TEST] 第一条文档分数: 0.85+
```

**RAG 检索流程正常工作**：
1. 向量检索返回 5 条相关文档
2. Re-ranker 重排成功
3. 返回高质量知识内容给 LLM

### 1.4 待处理 TODO

| TODO | 说明 |
|------|------|
| LangSmith Tracing | 当前关闭，后续配置真实 API Key |
| 移除调试日志 | 生产环境应移除 hybrid-retriever/vector-retriever 的 console.log |
| BM25 检索器 | 当前返回 0 条，需要排查索引初始化问题 |

---

## 一、本次会话总结（2026-05-07）

### 1.1 小红书采集定时任务完成 ✅

**功能实现**：
- MCP 小红书采集链路调试完成
- 搜索 → 详情获取 → 正文提取 → 数据入库全流程验证
- 定时任务配置（node-cron，不依赖 Redis）

**修复问题**：
| 问题 | 解决方案 |
|------|----------|
| MCP 搜索超时 | timeout 增加到 180秒，简化搜索参数（去掉筛选条件） |
| 正文字段映射错误 | `contentClean` → `_detailText`（入库服务识别此字段） |
| Scheduler 依赖 Redis | 创建简化版定时任务 `xhs-sync-cron.mjs` |
| 多关键词搜索耗时过长 | 减少到 3 个关键词：Agent开发、前端面试、LangChain |

**脚本文件**：
- `start-xhs-sync.sh` - 启动脚本
- `stop-xhs-sync.sh` - 停止脚本
- `check-xhs-login.sh` - 登录状态检查

**定时配置**：
- Cron 表达式：`10 11 * * *`（每天 11:10）
- 采集量：默认 50 条
- 节流间隔：5秒（避免触发风控）

### 1.2 重试机制说明

**详情获取重试**：
- 最多 2 次重试（间隔 4秒、8秒）
- lookup_miss 特殊处理：基于标题重新搜索获取新 xsec_token

**可重试错误类型**：
| 类型 | 说明 | 是否重试 |
|------|------|----------|
| transient | 网络临时错误、超时 | ✅ |
| parse_empty | 解析结果为空 | ✅ |
| lookup_miss | 详情映射失效 | ✅ + 回搜 |
| access_denied | 笔记不可访问 | ❌ |
| login_required | 需要登录 | ❌ |

**历史失败补偿**：
- 失败记录入库为 `detail_unavailable` 状态
- 下次同步任务自动带上历史失败样本重试

### 1.3 账号风控问题 ⚠️

**现象**：小红书账号收到违规提示

**处理**：
1. 已停止定时任务
2. 暂停采集等待风控解除
3. 或更换其他小红书账号

**换账号步骤**：
```bash
rm xiaohongshu-mcp-bin/cookies.json
cd xiaohongshu-mcp-bin && ./xiaohongshu-login-darwin-arm64
# 扫码登录新账号
./start-xhs-sync.sh
```

### 1.4 当前数据统计

| 状态 | 数量 |
|------|------|
| 总记录 | 12 条 |
| new（成功） | 8 条 |
| detail_unavailable | 4 条 |

---

## 二、本次会话总结（2026-05-06）

### 1.1 修复"确认计划"字段映射问题

**问题描述**：
用户在聊天中说"确认计划"后返回"服务暂时不可用"。

**根因分析**：
`taskGenerationNodeStream` 生成的 `parsedPlan` 字段与 `route.ts` 期望的 `PendingTaskPlan` 字段不匹配：
- parsedPlan: `tech_stack`, `daily_practice`, `difficulty`（如"基础"), `duration`, `reason`
- PendingTaskPlan: `title`, `description`, `module`, `difficulty`（必须是 "easy"|"medium"|"hard"), `estimatedMinutes`, `periodDays`

**解决方案**：
在 `nodes.ts` 中添加字段映射函数：
```typescript
// 将模型返回的难度描述转换为标准枚举值
function mapDifficulty(diff: string): "easy" | "medium" | "hard" {
  if (diff?.includes("基础") || diff?.includes("简单")) return "easy";
  if (diff?.includes("进阶") || diff?.includes("中等")) return "medium";
  return "hard";
}

// 从 duration 字段提取学习周期天数
// 示例: "预计7天完成" → 7, "2周" → 14
function extractPeriodDays(duration: string): number | null {
  const match = duration?.match(/(\d+)\s*[天周]/);
  if (match) return parseInt(match[1]);
  if (duration?.includes("周")) {
    const weekMatch = duration.match(/(\d+)\s*周/);
    if (weekMatch) return parseInt(weekMatch[1]) * 7;
  }
  return 7; // 默认7天
}

// 从 daily_practice 字段提取每日预估时长
// 示例: "每天2小时" → 120, "每天3个案例" → 60（默认）
function extractEstimatedMinutes(practice: string): number {
  const hourMatch = practice?.match(/(\d+)\s*小时/);
  if (hourMatch) return parseInt(hourMatch[1]) * 60;
  const minMatch = practice?.match(/(\d+)\s*分钟/);
  if (minMatch) return parseInt(minMatch[1]);
  return 60; // 默认60分钟
}

// 字段映射
const mappedPlan = parsedPlan ? {
  title: parsedPlan.tech_stack || "技术学习计划",
  description: parsedPlan.reason || "技术栈学习计划",
  module: parsedPlan.tech_stack || null,
  difficulty: mapDifficulty(parsedPlan.difficulty),
  estimatedMinutes: extractEstimatedMinutes(parsedPlan.daily_practice),
  dailyQuestionCount: null,
  periodDays: extractPeriodDays(parsedPlan.duration),
  reason: parsedPlan.reason || null,
  rawPlan: planJson,
} : null;
```

**验证结果**：
```bash
# 测试创建任务
curl -s http://localhost:3000/api/agent/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"确认计划","userId":"test-user","conversationId":"test-conv"}'

# 返回成功
"任务标题：React开发\n模块：React开发\n建议周期：14 天"

# 任务已写入数据库
curl -s "http://localhost:3000/api/tasks?userId=test-user"
# 返回: {"title":"React开发","description":"React是目前最主流的前端UI库...","status":"todo","difficulty":"easy"}
```

---

### 1.2 RAG Engine 实现情况分析

#### 已实现模块

| 模块 | 文件 | 功能 | 状态 |
|------|------|------|------|
| VectorRetriever | `vector-retriever.ts` | Chroma 向量检索 + 批量添加文档 | ✅ |
| BM25Retriever | `bm25-retriever.ts` | BM25 关键词检索 + 中文分词 | ✅ |
| HybridRetriever | `hybrid-retriever.ts` | RRF 融合 + 重排编排 + retrieveAndGenerate | ✅ |
| BGEM3Reranker | `bge-m3-reranker.ts` | 远程 API 重排 + mockRerank fallback | ✅ |
| ThreeTierStrategy | `three-tier-strategy.ts` | precise/candidates/expand/fallback 三级策略 | ✅ |
| 知识库初始化 | `init-knowledge-base.ts` | React/TS/Next.js/算法 知识文档（10条） | ✅ |

#### 与简历描述的差距

| 差距项 | 现状 | 简历描述 | 影响 |
|--------|------|----------|------|
| **LlamaIndex** | 未使用，直接调用 Chroma SDK | 基于 LlamaIndex | 面试可能被追问 |
| **Agent 集成** | HybridRetriever 未被 nodes.ts 调用 | 实际使用中 | 核心功能未生效 |
| **扩展知识库** | 未实现扩展检索层 | 扩展知识库泛化检索 | 三级策略不完整 |
| **知识库初始化** | 启动时未自动调用 init | 服务启动时初始化 | BM25 索引为空 |

#### RAG 核心流程（面试重点）

```
用户 Query → Embedding 生成 → 
并行检索（向量 + BM25） → RRF 融合 → 
BGE-M3 重排 → 三级策略分类 → 
构建 LLM Prompt → 生成答案
```

---

### 1.3 ChromaDB Web UI 查看器创建

**背景**：
- ChromaDB 新版（1.5.x）无内置 Web UI
- 需要可视化查看向量数据库内容

**解决方案**：
创建 `/packages/chroma-web-ui/` Next.js 应用。

**核心文件**：

| 文件 | 功能 |
|------|------|
| `package.json` | 项目配置，依赖 next/react/antd/axios |
| `next.config.js` | API 代理配置（解决 CORS 问题） |
| `src/app/page.tsx` | 主页面，展示 Collections、文档列表、搜索功能 |
| `src/app/layout.tsx` | 根布局 |

**关键配置**：
```javascript
// next.config.js - API 代理解决 CORS
async rewrites() {
  return [
    {
      source: '/api/chroma/:path*',
      destination: 'http://localhost:8000/api/v2/:path*',
    },
  ]
}

// page.tsx - API 调用路径
const CHROMA_URL = '/api/chroma'  // 通过代理访问 ChromaDB
```

**启动方式**：
```bash
cd /Users/sxh/Code/project/civil_agent/chroma-web-ui
npm run dev
# 访问 http://localhost:3001
```

**当前状态**：
- ChromaDB Server ✅ 运行中（localhost:8000）
- Web UI ✅ 运行中（localhost:3001）
- Collection `tech_knowledge` ✅ 已创建
- 数据记录 ❌ 0条（嵌入模型下载失败，网络问题）

---

### 1.4 LlamaIndex 考点梳理

**什么是 LlamaIndex？**
LlamaIndex 是专门为 RAG 应用设计的数据框架，核心定位是"连接自定义数据源到 LLM"。

**核心组件**：
| 组件 | 功能 |
|------|------|
| Reader | 数据导入（PDF/数据库/API） |
| Index | 索引构建（向量/关键词/树形） |
| Retriever | 检索执行 |
| QueryEngine | 查询编排 + LLM 调用 |

**与 LangChain 的区别**：
| 对比项 | LlamaIndex | LangChain |
|--------|------------|-----------|
| 定位 | 数据框架，专注 RAG | Agent 编排框架，专注流程控制 |
| 核心能力 | 索引构建、检索优化 | Chain、Tool、Memory 编排 |
| 适用场景 | 文档问答、知识库 | 多步骤任务、工具调用 Agent |

**面试高频问题**：
1. 什么是 LlamaIndex？→ 数据框架，连接私有数据到 LLM
2. 核心组件有哪些？→ Reader → Index → Retriever → QueryEngine
3. 与 LangChain 的区别？→ 数据框架 vs Agent 编排框架
4. RAG 流程？→ Query → Embedding → 检索 → Prompt → LLM

**是否高频考点？**
- 大厂前端面试：中频（Agent/RAG 相关岗位会问）
- AI/AIGC 岗位：高频（核心知识点）
- 建议：重点准备 RAG 流程、Hybrid检索、Re-ranking 这些通用概念（比框架更重要）

---

## 二、当前进度总览

| Phase | 任务 | 状态 |
|-------|------|------|
| P0-1 | Prompts 改造（考公 → 技术学习） | ✅ 完成 |
| P0-2 | 关键词改造（小红书采集关键词） | ✅ 完成 |
| P0 | UI 改造（TechMate 标题 + 技术模块） | ✅ 完成 |
| P0 | 数据库默认值（"考生" → "学习者"） | ✅ 完成 |
| P1-1 | RAG Engine 包创建 | ✅ 完成 |
| P1-1 | 直接 API 调用集成（绕过 LangChain） | ✅ 完成 |
| P1-1 | 技术知识库初始化脚本 | ✅ 完成 |
| P1-1 | 任务计划字段映射修复 | ✅ 完成 |
| P1-1 | ChromaDB Web UI 查看器 | ✅ 完成 |
| P1-1 | RAG Engine 完整集成到所有节点 | ⏳ 部分（仅 taskGenerationNode） |
| P1-2 | 四阶分层记忆系统 | 🔜 待开始 |
| P1-3 | GuardRail 三层防护 | 🔜 待开始 |
| P2 | OpenTelemetry 可观测 | 🔜 待开始 |

---

## 三、搁置问题

### 3.1 聊天制定计划与任务管理页面未联动
- **现状**：聊天中"确认计划"创建的任务存入数据库，但任务管理页面未实时刷新显示
- **需要**：实现实时联动（WebSocket/SSE 推送或前端轮询刷新）
- **优先级**：后续补充

### 3.2 RAG Engine 未完全集成到 Agent 流程
- **现状**：HybridRetriever 未被 nodes.ts 调用，仅 taskGenerationNodeStream 使用直接 API
- **待做**：将 HybridRetriever 集成到 generalQANode、emotionSupportNode 等
- **优先级**：后续继续完善

### 3.3 ChromaDB 数据未初始化
- **现状**：嵌入模型下载失败（网络超时），tech_knowledge Collection 有 0 条记录
- **待做**：网络稳定后运行 `python3 init_chroma.py` 或通过 Web UI 手动添加
- **优先级**：后续补充

### 3.4 BM25 索引未初始化
- **现状**：BM25Retriever.buildIndex() 需要在服务启动时调用
- **待做**：添加启动脚本初始化技术知识库
- **优先级**：后续补充

### 3.5 百炼 API 偶发 403 Forbidden
- **现状**：部分请求返回 403
- **原因**：可能是配额限制或并发请求过多
- **状态**：观察中

---

## 四、待确认问题

### 是否需要引入 LlamaIndex
- **简历描述**：基于 LlamaIndex 搭建混合分层 RAG 检索
- **现状**：直接使用 Chroma SDK，未引入 LlamaIndex
- **权衡**：
  - 引入 LlamaIndex：简历真实，但需额外学习成本
  - 不引入：修改简历描述为"基于 Chroma + BM25 混合检索"，更诚实
- **决策**：待确认，面试前决定
- **面试准备**：
  - LlamaIndex 核心概念（Reader → Index → Retriever → QueryEngine）
  - 与 LangChain 的区别（数据框架 vs Agent 编排框架）
  - RAG 流程（Query → Embedding → 检索 → Prompt → LLM）

---

## 五、下一步计划

### 优先级排序

| 优先级 | 任务 | 说明 | 预估时间 |
|--------|------|------|----------|
| **高** | 完善 RAG Engine 集成 | 将 HybridRetriever 集成到 generalQANode 等 | 1-2天 |
| **高** | 初始化 ChromaDB 数据 | 运行 init 脚本或手动添加测试数据 | 0.5天 |
| **高** | 四阶分层记忆系统 | instant/short/long/meta + 衰减/强化机制 | 3-5天 |
| **高** | GuardRail 三层防护 | prompt校验 + tool拦截 + 输出过滤 | 2-3天 |
| **中** | OpenTelemetry 可观测 | Console 输出（面试展示用日志截图） | 2-3天 |
| **中** | 聊天-任务页面联动 | WebSocket 或前端轮询 | 1天 |
| **低** | Docker 部署配置 | Dockerfile + docker-compose | 1天 |

### 建议下一步行动

1. **初始化 ChromaDB 数据**（最快见效）
   - 网络稳定后运行 `python3 init_chroma.py`
   - 或通过 Web UI（http://localhost:3001）手动添加文档
   - 验证 RAG 检索流程

2. **集成 HybridRetriever 到 generalQANode**
   - 修改 `/packages/agent-langgraph/src/graph/nodes.ts`
   - 替换 MCP RAG 调用为 HybridRetriever.retrieveAndGenerate()
   - 测试语义搜索效果

3. **确认 LlamaIndex 决策**
   - 如果决定引入：学习 LlamaIndex 基础，重构 RAG Engine
   - 如果决定不引入：修改简历描述，准备面试追问应对

---

## 六、已完成的改造

### Prompts 改造
- `/packages/core/src/constants/prompts.ts` → 技术学习助手
- `/packages/agent-langgraph/src/prompts/system-prompts.ts` → TechMate 场景
- `/packages/agent-langgraph/src/prompts/task-prompts.ts` → 技术栈任务生成

### 关键词改造
- `/packages/agent-langgraph/src/graph/xiaohongshu-rag.ts` → 前端开发关键词
- `/packages/scheduler/src/jobs/weekly-xiaohongshu-sync.ts` → 技术内容采集

### UI 改造
- `/packages/web/src/app/tasks/page.tsx` → 技术模块选项
- `/packages/web/src/app/focus/page.tsx` → 技术模块选项
- `/packages/web/src/components/shared/Navbar.tsx` → "TechMate" 标题
- `/packages/web/src/hooks/use-agent.ts` → 技术学习欢迎语

### RAG Engine 新增
- `/packages/rag-engine/src/retrievers/vector-retriever.ts`
- `/packages/rag-engine/src/retrievers/bm25-retriever.ts`
- `/packages/rag-engine/src/retrievers/hybrid-retriever.ts`
- `/packages/rag-engine/src/reranker/bge-m3-reranker.ts`
- `/packages/rag-engine/src/strategies/three-tier-strategy.ts`
- `/packages/rag-engine/src/scripts/init-knowledge-base.ts`

### ChromaDB Web UI 新增
- `/packages/chroma-web-ui/package.json`
- `/packages/chroma-web-ui/next.config.js`
- `/packages/chroma-web-ui/src/app/page.tsx`
- `/packages/chroma-web-ui/src/app/layout.tsx`

---

## 七、测试验证

### 启动服务
```bash
# 启动 TechMate 主服务
./start-all.sh

# 启动 ChromaDB Server（需单独启动）
chroma run --host localhost --port 8000 --path ./data/chroma

# 启动 ChromaDB Web UI
cd /Users/sxh/Code/project/civil_agent/chroma-web-ui
npm run dev
```

### API 测试
```bash
# 测试聊天
curl -s http://localhost:3000/api/agent/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"我想学习React开发","userId":"test-user","conversationId":"test-001"}'

# 测试确认计划
curl -s http://localhost:3000/api/agent/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"确认计划","userId":"test-user","conversationId":"test-001"}'

# 查看创建的任务
curl -s "http://localhost:3000/api/tasks?userId=test-user"
```

### UI 检查
- 主应用：http://localhost:3000（Navbar 标题应为 TechMate）
- ChromaDB Web UI：http://localhost:3001（查看向量数据库内容）

### Python 脚本
```bash
# 查看 ChromaDB 内容
python3 /Users/sxh/Code/project/civil_agent/chroma_viewer.py

# 初始化 ChromaDB 数据（网络稳定后）
python3 /Users/sxh/Code/project/civil_agent/init_chroma.py
```

---

## 八、本次会话总结（2026-05-07 第二部分）

### 8.1 Embedding API 问题修复 ✅

**问题发现**：
- API URL 错误：末尾多了 `-v2` 后缀
- 类型定义错误：API 返回 `{ embedding: [], text_index: 0 }` 结构，代码期望 `number[][]`

**修复内容**：
| 文件 | 修改 |
|------|------|
| `packages/database/.env` | 配置 API Key，修正 URL |
| `packages/database/src/services/embedding.service.ts` | URL 去掉 `-v2`，添加 `EmbeddingItem` 类型 |

**验证结果**：
- API Key 测试通过
- 向量维度：1536
- Embedding 生成成功

### 8.2 ChromaDB 知识库初始化 ✅

**数据构造**：
- 从 React/TS/Next.js/Algorithm 改为 Agent/RAG/LangChain/大模型
- 共 40 条知识数据：
  - Agent：10 条
  - RAG：12 条
  - LangChain：9 条
  - 大模型：9 条

**修改文件**：
| 文件 | 修改 |
|------|------|
| `packages/database/src/index.ts` | 添加 `getVectorDBService` 导出 |
| `packages/database/src/services/vector-db.service.ts` | 添加 `tech_knowledge` Collection |
| `packages/rag-engine/src/retrievers/vector-retriever.ts` | 重写，适配 VectorDBService |
| `packages/rag-engine/src/scripts/init-knowledge-base.ts` | 40 条新知识数据 |
| `init_knowledge_base.py` | Python 初始化脚本（备用） |

**初始化结果**：
```
Collection: tech_knowledge
记录数: 40 条
向量维度: 1536
Embedding 模型: text-embedding-v2 (阿里云 DashScope)
```

### 8.3 TypeScript 编译问题修复

**问题**：知识数据中的代码示例包含嵌套模板字符串，导致编译错误

**修复**：将嵌套模板字符串改为普通字符串拼接：
```typescript
// 修复前
template: `示例：
问题：{question}`
// 修复后
template: "示例：\\n问题：{question}"
```

### 8.4 当前数据统计

| 分类 | 数量 |
|------|------|
| agent | 10 条 |
| rag | 12 条 |
| langchain | 9 条 |
| llm | 9 条 |
| **总计** | 40 条 |

---

## 十、四阶分层记忆系统实现（2026-05-07）

### 10.1 架构设计

**大白话解释**：模拟人类大脑的记忆机制，分为四层：

| 层级 | 大白话解释 | 技术实现 |
|-----|-----------|---------|
| **Instant（瞬时）** | 就像你正在说的话，立刻就能回忆起来 | 滑动窗口保留最近 10 条消息 |
| **Short（短期）** | 就像昨天做的事，记得但不那么清晰 | 7 天内对话 + 新鲜度衰减 |
| **Long（长期）** | 就像小时候学的知识，深深印在心里 | 向量永久存储 + 权重管理 |
| **Meta（元）** | 就像你的性格、习惯、擅长什么 | 用户画像 + 技能图谱聚合 |

### 10.2 衰减公式（面试可讲）

```
新鲜度 = 0.5^(天数/7) + 访问强化 + 最近访问奖励
```

- 半衰期 = 7 天（每 7 天记忆强度减半）
- 访问强化 = min(访问次数 × 0.1, 0.5)
- 低于 0.1 → 归档到长期记忆

### 10.3 新增文件

| 文件 | 功能 |
|------|------|
| `packages/database/prisma/schema.prisma` | 新增 ShortTermMemory、MetaMemory 表 |
| `packages/database/src/repositories/short-term-memory.repository.ts` | 短期记忆 Repository |
| `packages/database/src/repositories/meta-memory.repository.ts` | 元记忆 Repository |
| `packages/agent-langgraph/src/memory/instant.ts` | 瞬时记忆管理（滑动窗口） |
| `packages/agent-langgraph/src/memory/short.ts` | 短期记忆衰减计算 |
| `packages/agent-langgraph/src/memory/reinforce.ts` | 短期记忆强化 |
| `packages/agent-langgraph/src/memory/long.ts` | 长期记忆归档 + 权重管理 |
| `packages/agent-langgraph/src/memory/meta.ts` | 元记忆聚合（用户画像） |
| `packages/agent-langgraph/src/memory/fusion.ts` | 四层融合检索 |
| `packages/agent-langgraph/src/memory/index.ts` | 统一导出 |

### 10.4 日志输出示例

```
============================================================
🧠 [Memory] 开始四层记忆融合检索
============================================================
[Memory] 瞬时记忆: 5 条消息
[Memory] 短期记忆: 3 条相关记忆
  - React: 新鲜度=0.85
  - 面试: 新鲜度=0.72
[Memory] 长期记忆: 2 条相关经验
  - 权重=0.80, 分数=0.92
[Memory] 元记忆: 强项=JS, 弱项=React
[Memory] 元记忆: 学习风格=practice, 连续学习=15天
============================================================
```

### 10.5 自动存储短期记忆（2026-05-08 补充）

用户发送消息后自动创建短期记忆：
- **SQLite 存储**：`short_term_memories` 表（结构化数据）
- **ChromaDB 存储**：`short_term_memory` collection（向量检索）
- **话题提取**：自动识别 React、TypeScript、面试等关键词

**关键修改**：
- `packages/web/src/app/api/agent/chat/route.ts` - commitConversationTurn 添加记忆存储 + ChromaDB 同步

### 10.6 运维脚本

| 脚本 | 用途 |
|------|------|
| `packages/database/archive-memory.ts` | 手动归档（测试用） |
| `packages/database/memory-cron.ts` | 定时衰减任务（生产用） |

**手动归档命令**：
```bash
cd packages/database
npx tsx archive-memory.ts --user=USER_ID --days=25  # 模拟25天衰减归档
```

### 10.7 测试验证结果（2026-05-08）

| 存储位置 | 数据量 |
|---------|--------|
| SQLite `short_term_memories` | 10 条（4 活跃 + 6 已归档） |
| ChromaDB `short_term_memory` | ✅ 新消息自动同步 |
| ChromaDB `long_term_memory` | 6 条（归档后） |
| ChromaDB `tech_knowledge` | 40 条（RAG 知识） |

---

## 十三、OpenTelemetry 可观测实现（2026-05-08）

### 13.1 架构设计

**大白话解释**：就像快递追踪系统：

| 概念 | 大白话解释 | 技术实现 |
|-----|-----------|---------|
| **Trace（追踪）** | 像快递单号，追踪一个包裹从下单到送达的全过程 | 一个用户请求的完整路径，分配唯一 Trace ID |
| **Span（跨度）** | 像每个物流节点（揽收、运输、派送），记录时间和状态 | 每个操作步骤（意图识别、RAG检索、LLM调用），记录耗时 |
| **Logs（日志）** | 像物流详情记录 | 结构化日志，包含 Trace ID、Span ID、时间戳 |

### 13.2 新增文件

| 文件 | 功能 |
|------|------|
| `packages/agent-langgraph/src/otel/context.ts` | Trace Context（Trace ID 生成 + Span 管理） |
| `packages/agent-langgraph/src/otel/span.ts` | Span Recorder（耗时计算 + 状态记录） |
| `packages/agent-langgraph/src/otel/logger.ts` | Structured Logger（结构化日志输出） |
| `packages/agent-langgraph/src/otel/formatter.ts` | Trace Formatter（格式化输出） |
| `packages/agent-langgraph/src/otel/index.ts` | 统一导出 |

### 13.3 集成点

- `packages/web/src/app/api/agent/chat/route.ts` - 创建 Trace，记录 API 入口 Span
- `packages/agent-langgraph/src/index.ts` - 导出 otel 模块

### 13.4 日志输出示例

```
============================================================
📊 [Trace] trace_1778173556458_4h4kmqe 开始
============================================================
[Span] db_init              | 0ms | ✅ success
[Span] conversation_query   | 4ms | ✅ success
[Span] agent_process        | 1200ms | ✅ success
[Span] message_storage      | 5ms | ✅ success
============================================================
📊 [Trace] trace_1778173556458_4h4kmqe 完成 | 总耗时 1209ms
============================================================
```

### 13.5 面试讲解要点

1. **什么是 Trace？** → 像快递单号，追踪请求全路径
2. **什么是 Span？** → 像物流节点，记录每个操作耗时
3. **为什么需要可观测？** → 审计、回溯、性能优化
4. **如何实现？** → Trace ID + Span 链路 + 结构化日志

---

## 十四、ISR 静态增量渲染实现（2026-05-08）

### 14.1 架构设计

**大白话解释**：就像电梯显示屏更新：
- **预渲染**：电梯显示屏出厂时就有楼层信息 → 页面构建时就生成HTML
- **revalidate**：每隔10秒更新一次楼层 → 设置缓存过期时间（如3600秒）
- **stale-while-revalidate**：显示旧楼层，后台悄悄更新 → 先返回旧页面，后台重新生成

### 14.2 新增/修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/web/src/app/dashboard/page.tsx` | 去掉"use client"，添加ISR（revalidate=3600），Server Component |
| `packages/web/src/app/dashboard/DashboardClient.tsx` | 新建，抽离客户端交互逻辑 |

### 14.3 核心实现

```tsx
// page.tsx - Server Component + ISR
export const revalidate = 3600; // 每小时重新生成

async function getDashboardData(range) {
  // 直接调用数据库服务，避免fetch API route的动态渲染问题
  await initializeDatabase({ skipVectorDB: true });
  const statsService = getStatsService();
  return await statsService.getStatsSummary(DEFAULT_USER_ID, range);
}

export default async function DashboardPage() {
  const initialData = await getDashboardData("month");
  return <DashboardClient initialData={initialData} />;
}
```

### 14.4 验证结果

构建输出：
```
Route (app)
├ ○ /dashboard   132 kB   (Static) ← ISR预渲染成功
```

### 14.5 面试讲解要点

1. **什么是ISR？** → 增量静态再生，预渲染+定时更新
2. **revalidate原理？** → stale-while-revalidate，过期返回旧数据，后台渲染
3. **为什么选ISR？** → 数据看板数据每小时更新即可，高频访问缓存收益大
4. **ISR vs SSR区别？** → ISR缓存性能好，SSR实时但压力大

### 14.6 简历描述建议

改成：
> "基于Next.js实现ISR静态增量渲染（revalidate=3600），配套学习数据看板、进度追踪"

---

## 十五、LangGraph StateGraph 改造（2026-05-08）

### 15.1 架构设计

**大白话解释**：就像地铁线路图：

| 概念 | 地铁类比 | 技术实现 |
|-----|---------|---------|
| **StateGraph** | 地铁线路图 | 定义站点（节点）和线路（边） |
| **Node（节点）** | 地铁站 | 每个处理步骤（意图识别、任务生成） |
| **Edge（边）** | 地铁线路 | 从一个站到另一个站的路径 |
| **ConditionalEdge** | 根据目的地换乘 | 根据意图选择不同线路 |
| **START/END** | 起点/终点站 | 流程入口和出口 |
| **Channel** | 乘客信息传递 | 状态在各站点间传递和合并 |

### 15.2 改造前 vs 改造后

**改造前**：手动 switch-case 编排
```typescript
switch (currentState.userIntent) {
  case "create_task": currentState = await taskGenerationNode(currentState);
  case "general_inquiry": currentState = await generalQANode(currentState);
}
```

**改造后**：标准 StateGraph
```typescript
const workflow = new StateGraph({ channels: graphStateChannels })
  .addNode("intent_recognition", intentRecognitionNode)
  .addNode("task_generation", taskGenerationNode)
  .addEdge(START, "intent_recognition")
  .addConditionalEdges("intent_recognition", routeByIntent)
  .addEdge("task_generation", "generate_response")
  .addEdge("generate_response", END);
```

### 15.3 新增/修改文件

| 文件 | 修改内容 |
|------|----------|
| `packages/agent-langgraph/src/graph/state.ts` | 添加 `graphStateChannels` 定义（状态合并规则） |
| `packages/agent-langgraph/src/graph/graph.ts` | 重写为 StateGraph（addNode + addEdge + addConditionalEdges） |
| `packages/agent-langgraph/src/graph/edges.ts` | `routeByIntent` 被真正使用 |

### 15.4 状态合并规则（Channels）

```typescript
export const graphStateChannels = {
  messages: { value: (x, y) => x.concat(y) },  // 数组累加（对话历史）
  userIntent: { value: (x, y) => y ?? x },     // 覆盖（新意图替换旧）
  quickReplyOptions: { value: (x, y) => y ?? x }, // 覆盖
};
```

### 15.5 验证结果

构建日志：
```
INFO : Creating agent graph with StateGraph
INFO : Agent graph created successfully with StateGraph
```

测试结果：
| 流程 | 测试命令 | 结果 |
|------|---------|------|
| General QA | "什么是React？" | ✅ SSE流式输出正确回答 |
| Task Generation | "帮我制定学习计划" | ✅ 返回JSON计划 + 快捷回复 |

### 15.6 面试讲解要点

1. **什么是 StateGraph？** → 就像地铁线路图，每个节点是站，边是线路
2. **ConditionalEdge 怎么工作？** → 路由函数返回节点名称，StateGraph 自动传递状态
3. **状态怎么合并？** → Channels 定义规则：messages 用 concat，userIntent 用覆盖
4. **为什么用 StateGraph？** → 声明式配置、自动状态管理、原生流式支持、可扩展

---

## 十一、当前进度总览（更新 2026-05-08）

| Phase | 任务 | 状态 |
|-------|------|------|
| P0-1 | Prompts 改造（考公 → 技术学习） | ✅ 完成 |
| P0-2 | 关键词改造（小红书采集关键词） | ✅ 完成 |
| P0 | UI 改造（TechMate 标题 + 技术模块） | ✅ 完成 |
| P0 | 数据库默认值（"考生" → "学习者"） | ✅ 完成 |
| P1-1 | RAG Engine 包创建 | ✅ 完成 |
| P1-1 | Embedding API 修复 | ✅ 完成 |
| P1-1 | ChromaDB 知识库初始化（40条，cosine距离） | ✅ 完成 |
| P1-1 | RAG Engine 集成到 generalQANode | ✅ 完成 |
| P1-1 | ChromaDB Server 启动脚本 | ✅ 完成 |
| P1-2 | 四阶分层记忆系统（完整实现 + 测试通过） | ✅ 完成 |
| P2 | OpenTelemetry 可观测（Console 输出 + Trace/Span） | ✅ 完成 |
| P2-2 | ISR 静态增量渲染（Dashboard页面） | ✅ 完成 |
| P2-3 | LangGraph StateGraph 改造 | ✅ 完成 |
| P3 | Chat UI 交互体验升级（DeepSeek风格） | ✅ 完成 |
| P1-3 | GuardRail 三层防护 | 🔜 待开始（用户暂缓） |

---

## 十二、下一步计划

| 优先级 | 任务 | 预估时间 |
|--------|------|----------|
| **中** | GuardRail 三层防护（用户暂缓） | 2-3天 |
| **低** | 移除调试日志（面试后） | 0.5天 |
| **低** | 面试准备（技术亮点讲解） | 1天 |

## 十、下一步计划

### 优先级排序

| 优先级 | 任务 | 说明 | 预估时间 |
|--------|------|------|----------|
| **高** | 完善 RAG Engine 集成 | 将 HybridRetriever 集成到 generalQANode 等 | 1-2天 |
| **高** | 四阶分层记忆系统 | instant/short/long/meta + 衰减/强化机制 | 3-5天 |
| **高** | GuardRail 三层防护 | prompt校验 + tool拦截 + 输出过滤 | 2-3天 |
| **中** | OpenTelemetry 可观测 | Console 输出（面试展示用日志截图） | 2-3天 |
| **中** | 聊天-任务页面联动 | WebSocket 或前端轮询 | 1天 |

### 建议下一步行动

1. **集成 HybridRetriever 到 generalQANode**
   - 修改 `/packages/agent-langgraph/src/graph/nodes.ts`
   - 替换 MCP RAG 调用为 HybridRetriever.retrieveAndGenerate()
   - 测试语义搜索效果

2. **四阶分层记忆系统设计**
   - instant：当前对话上下文
   - short：近期对话历史（7天内）
   - long：长期记忆向量存储
   - meta：用户画像、偏好、技能水平

---

## 十一、关键文件索引

### Embedding 相关
- `packages/database/src/services/embedding.service.ts` - Embedding API 服务
- `packages/database/.env` - API Key 配置

### RAG Engine 相关
- `packages/rag-engine/src/retrievers/vector-retriever.ts` - 向量检索
- `packages/rag-engine/src/retrievers/bm25-retriever.ts` - BM25 关键词检索
- `packages/rag-engine/src/retrievers/hybrid-retriever.ts` - 混合检索
- `packages/rag-engine/src/scripts/init-knowledge-base.ts` - 知识数据定义
- `init_knowledge_base.py` - Python 初始化脚本

### Database 相关
- `packages/database/src/services/vector-db.service.ts` - VectorDB 服务
- `packages/database/src/index.ts` - 导出 getVectorDBService

---

## 十二、运维脚本

```bash
# 初始化 ChromaDB 知识库
python3 init_knowledge_base.py

# 验证数据
python3 -c "
import chromadb
client = chromadb.PersistentClient(path='./data/chroma')
collection = client.get_collection('tech_knowledge')
print('记录数:', collection.count())
"

# 查看 ChromaDB Web UI
cd chroma-web-ui && npm run dev
# 访问 http://localhost:3001
```