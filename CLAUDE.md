# TechMate 项目指南

## 项目概述

TechMate 是一个 AI 技术学习助手，用于 2026 大厂前端面试项目展示。

**核心技术亮点**：
1. LangGraph 多节点对话路由 + SSE 流式响应
2. 混合分层 RAG 检索（Chroma + BM25 + BGE-M3 重排 + 三级策略）
3. 四阶分层记忆系统（instant/short/long/meta）
4. MCP 自动化采集链路（小红书技术内容）
5. GuardRail 三层防护

---

## 启动命令

```bash
# 一键启动全部服务
./start-all.sh

# 服务列表：
# - ChromaDB Server: http://localhost:8000
# - ChromaDB Web UI: http://localhost:3001
# - Web 服务:       http://localhost:3000
# - MCP 服务:       http://localhost:3002
```

---

## 项目结构

```
packages/
├── web/                 # Next.js 前端
├── agent-langgraph/     # LangGraph Agent 核心
├── rag-engine/          # RAG 检索引擎
├── database/            # 数据库服务（SQLite + ChromaDB）
├── mcp-bailian-rag/     # MCP 服务（百炼 RAG）
└── core/                # 共享常量和配置

chroma-web-ui/           # ChromaDB 可视化界面
```

---

## 关键文件

| 功能 | 文件路径 |
|------|----------|
| 进度记录 | `docs/tmp_progress.md` |
| Agent 节点定义 | `packages/agent-langgraph/src/graph/nodes.ts` |
| RAG 混合检索 | `packages/rag-engine/src/retrievers/hybrid-retriever.ts` |
| 向量检索 | `packages/rag-engine/src/retrievers/vector-retriever.ts` |
| 知识库初始化 | `init_knowledge_base.py` |
| ChromaDB Server | `start_chroma_server.py` |
| 服务启动脚本 | `start-all.sh` |

---

## 开发规范

### Git 提交
- commit message 简短（一行）
- 推送前需用户确认

### 代码风格
- TypeScript，使用中文注释
- 避免过度抽象

### 新功能开发流程
对于复杂功能（如四阶分层记忆、GuardRail防护等），在写代码前：
1. **先进入 plan 模式** — 讨论技术方案、架构设计
2. **大白话解释原理** — 用通俗易懂的语言解释技术原理，便于面试时清晰表达
3. **确认后再实现** — 避免返工，确保理解透彻

---

## 当前进度

| 任务 | 状态 |
|------|------|
| Phase 0: 文案改造 | ✅ 完成 |
| Phase 1-1: RAG Engine 集成 | ✅ 完成 |
| Phase 1-2: 四阶分层记忆系统 | ✅ 完成 |
| Phase 2: OpenTelemetry 可观测 | ✅ 完成 |
| Phase 2-2: ISR 静态增量渲染 | ✅ 完成 |
| Phase 2-3: LangGraph StateGraph | ✅ 完成 |
| Phase 3: Chat UI 交互体验升级 | ✅ 完成 |
| Phase 4: 项目改名 + 部署脚本 | ✅ 完成 |
| Phase 5: 腾讯云部署 | ✅ 完成 |
| **Phase 6: 三大功能补全（Profile 个人记忆 / Agent Dashboard / UI 统一）** | ✅ 完成（2026-05-11） |
| **Phase 7: 长期记忆快通道 + Dashboard webCount 真实化 + Markdown 强力 normalize** | ✅ 完成（2026-05-11） |
| Phase 1-3: GuardRail 三层防护 | 🔜 待开始（用户暂缓） |

---

## 面试要点速查（2026-05-11 更新）

> **现场可演示链路**（`http://localhost:3000`）：
> 1. Chat 发"记住我叫 X" → 2-3 秒后 Profile 页"🧠 个人记忆"立即看到
> 2. Chat 提问本地知识库没有的（如"今天 GitHub 趋势"）→ Dashboard webCount > 0
> 3. Chat 答复含表格/代码/标题 → markdown 正确渲染（LLM 残缺输出有兜底）

### 关键改动点（按面试讲故事用）

| 改动 | 核心文件 | 一句话讲法 |
|------|---------|----------|
| LangGraph StateGraph + SSE | `agent-langgraph/src/graph/{graph,nodes,edges}.ts` | "意图路由+流式 step 事件，每节点对应一个真实可观测的执行步骤" |
| 混合分层 RAG | `rag-engine/src/retrievers/hybrid-retriever.ts`（旧）<br>`rag-engine/src/llamaindex/`（重构中） | "Vector + BM25 + RRF + BGE-M3 + 三级 fallback" |
| 四阶分层记忆 | `agent-langgraph/src/memory/{instant,short,long,meta,fusion,fact-extractor}.ts` | "瞬时滑窗 + 短期 SQLite 衰减 + 长期 ChromaDB 加权 + 元记忆画像" |
| **fact-extractor** | `agent-langgraph/src/memory/fact-extractor.ts` | "用户主动声明（关键词）+ AI 自动提取（LLM）两条快通道直接写长期记忆" |
| **Agent 事件流水** | `agent-langgraph/src/utils/event-logger.ts` + Prisma `AgentEventLog` 表 | "Fire-and-forget 写四类事件，graceful degradation 表不存在不抛错" |
| **Dashboard 真实化** | `web/src/app/dashboard/AgentDashboardClient.tsx` + `api/dashboard/agent/route.ts` | "4 panel 聚合 SQLite+ChromaDB，所有数字都是真实跑出来的" |
| **Markdown normalize** | `web/src/components/chat/MessageBubble.tsx::normalizeMarkdown` | "抓 SSE 实测发现 LLM 输出残缺 markdown，写 5 个 Phase、20+ 条正则兜底" |
| OTel trace/span | `agent-langgraph/src/otel/` | "结构化日志输出，可对接 Jaeger/Tempo" |

### Markdown normalize 踩坑可讲故事
- **诊断**：抓 SSE 实测，qwen3.6-plus 输出会出现 `###标题|表格|`、`||` 双竖线连接表格行、`\`\`\`---` 等 6 类残缺
- **尝试 1**：切到 `@ant-design/x-markdown` —— 失败，streaming cache 把问题搞复杂
- **尝试 2**：回退 `react-markdown` + 写正则 —— `(\`\`\`[A-Za-z]+)(?=\S)` 因为**正则回溯**把 `\`\`\`typescript` 切成 `\`\`\`typescrip\nt`
- **最终方案**：禁回溯（用 `([^A-Za-z0-9_+\-\s\n])` 显式字符类），5 个 Phase 顺序处理（fence → heading → table → list → 兜底）

---

## 首次运行初始化

```bash
# 首次运行（解决改名后工作区链接问题）
bash init-first-run.sh

# 仅初始化数据库
bash init-db.sh
```

---

## 环境配置

关键环境变量（`packages/web/.env`）：
- `DASHSCOPE_API_KEY` - 阿里云百炼 API Key
- `VECTOR_DB_PATH=http://localhost:8000` - ChromaDB 地址
- `LANGCHAIN_TRACING_V2=false` - LangSmith tracing（待配置）

---

## 常见问题

### ChromaDB 连接失败
确保 ChromaDB Server 先启动：`./start-all.sh` 或 `python3 start_chroma_server.py`

### RAG 检索返回空
检查 ChromaDB 是否有数据：访问 http://localhost:3001 或运行 `python3 init_knowledge_base.py`

### MCP 403 Forbidden
小红书账号风控，暂停采集或换账号