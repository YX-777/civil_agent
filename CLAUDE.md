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
| Phase 1-3: GuardRail 三层防护 | 🔜 待开始（用户暂缓） |

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