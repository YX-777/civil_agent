# TechMate - AI 技术学习陪伴助手

一个基于 `LangGraph + MCP + RAG + Next.js` 的技术学习陪伴系统，帮助开发者提升前端技术能力。

**技术亮点**：
1. LangGraph 多节点对话路由 + SSE 流式响应
2. 混合分层 RAG 检索（Chroma + BM25 + BGE-M3 重排 + 三级策略）
3. 四阶分层记忆系统（instant/short/long/meta）
4. MCP 自动化采集链路（小红书技术内容）
5. GuardRail 三层防护

## 当前状态

核心功能已落地并可运行：
1. Web 多会话聊天界面（DeepSeek 风格 UI）
2. LangGraph Agent 多轮对话与意图路由
3. 混合 RAG 检索服务
4. SQLite + Prisma + ChromaDB 数据持久化
5. 小红书技术内容采集链路
6. 四阶分层记忆系统

## 技术架构

```text
Web (Next.js 14)
  -> Agent API / SSE
  -> LangGraph Agent
     -> RAG Engine (Chroma + BM25)
     -> MCP 服务
     -> 四阶分层记忆
  -> SQLite (Prisma) + ChromaDB
```

当前 `packages/` 下包含：

| 包名 | 功能 |
|------|------|
| `@tech-mate/core` | 核心类型和配置 |
| `@tech-mate/web` | Next.js 前端界面 |
| `@tech-mate/agent-langgraph` | LangGraph Agent 核心 |
| `@tech-mate/rag-engine` | 混合 RAG 检索引擎 |
| `@tech-mate/database` | 数据库服务 |
| `@tech-mate/scheduler` | 定时任务调度 |
| `@tech-mate/mcp-*` | MCP 服务包 |

## 快速启动

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
```bash
cp packages/web/.env.example packages/web/.env
```

配置：
- `DASHSCOPE_API_KEY` - 阿里云千问 API Key
- `VECTOR_DB_PATH=http://localhost:8000` - ChromaDB 地址

### 3. 一键启动
```bash
./start-all.sh
```

服务列表：
- Web: `http://localhost:3000`
- ChromaDB: `http://localhost:8000`
- ChromaDB Web UI: `http://localhost:3001`
- MCP: `http://localhost:3002`

## 常用命令

```bash
# Web 开发
pnpm --filter @tech-mate/web dev

# 构建
pnpm --filter @tech-mate/agent-langgraph build
pnpm --filter @tech-mate/scheduler build

# 类型检查
pnpm type-check
```

## 部署到阿里云

详见 `docker/DEPLOY.md`

## 许可证

MIT