<h1 align="center">TechMate</h1>

<p align="center">
  <em>面向前端开发者的 AI 技术学习陪伴 Agent</em>
</p>

<p align="center">
  <a href="#架构"><img alt="LangGraph" src="https://img.shields.io/badge/Agent-LangGraph-6366f1"></a>
  <a href="#架构"><img alt="RAG" src="https://img.shields.io/badge/RAG-LlamaIndex%20+%20Chroma%20+%20BM25-22c55e"></a>
  <a href="#架构"><img alt="Memory" src="https://img.shields.io/badge/Memory-4--Tier-a78bfa"></a>
  <a href="#guardrail"><img alt="GuardRail" src="https://img.shields.io/badge/GuardRail-3--Layer-f59e0b"></a>
  <a href="#observability"><img alt="OTel" src="https://img.shields.io/badge/Observability-OpenTelemetry-0ea5e9"></a>
  <a href="#许可证"><img alt="License" src="https://img.shields.io/badge/license-MIT-000000"></a>
</p>

TechMate 是一个生产级 AI 学习陪伴 Agent —— 用对话驱动技术成长，对外暴露一个会规划、会答疑、会记忆、会自我审计的统一接口。

它把当下 AI 工程的几条主线（**多节点对话编排 / 混合分层 RAG / 分层记忆 / 三层防护 / 全链路可观测**）作为**第一公民**做了完整落地，并把每一条都打通到前端 UI —— 任何一次对话都可以在 Trace Viewer / Dashboard / 任务页里追到底。

---

## 在线体验 & 截图

- **本地启动**：`bash scripts/dev/start.sh` 后访问 `http://localhost:3000`
- **快速链路**：Chat 发"帮我规划 React 3 天学习计划" → 表格流式输出 → 点"确认计划" → 任务页自动生成 3 条子任务 → 完成任务后 Profile 页"个人记忆"沉淀。

---

## 核心能力

### 🧭 LangGraph 多节点对话编排

基于官方 `StateGraph` 构建，从 `START` 经 `intent_recognition` 条件路由分发到 `task_generation` / `rag_query` / `emotion_support` / `general_qa` 等节点，全程 SSE 流式回写：

- 每个节点的进入 / 退出 / 工具调用都会作为 **step 事件** 推到前端，对应 UI 上一条"执行轨迹"
- 流式期间自动展开实时进度，结束后折叠成概览，可点击展开复盘
- 节点级别的失败兜底（如 RAG 命中率为 0 时退回 general_qa），任意环节崩溃不会让整轮回复挂掉

> 文件：`packages/agent-langgraph/src/graph/{graph,nodes,edges,state}.ts`

### 🔍 混合分层 RAG（LlamaIndex 适配层）

在 LlamaIndex 的 `BaseRetriever` / `BaseNodePostprocessor` / `RetrieverQueryEngine` 抽象上重新组织，单一 `QueryEngine` 串起整条检索链：

| 阶段 | 实现 | 角色 |
| --- | --- | --- |
| Embedding | `DashScopeEmbedding` | 接入阿里百炼 `text-embedding-v2` |
| Vector 检索 | `VectorRetriever` | ChromaDB 余弦相似度 |
| BM25 检索 | `BM25Retriever` | 启动时从 Chroma 全量拉数据现场建索引 |
| 融合 | `HybridFusionRetriever` | RRF 融合（k = 60） |
| 重排 | `BgeM3NodePostprocessor` | BGE-M3 二轮精排 |
| 合成 | `ThreeTierSynthesizer` | 三级响应策略（高置信直答 / 中置信引用源 / 低置信兜底） |

知识库通过 `content-ingestion` 多源采集（dev.to API / ruanyf-weekly Git / awesome READMEs / atom feeds），所有条目带 `source_url` 回链，前端"参考来源"卡片可点开原文。

> 文件：`packages/rag-engine/src/llamaindex/*`、`packages/content-ingestion/`

### 🧠 四阶分层记忆

仿照人类记忆模型分四层独立存取、按需融合：

```
instant   (内存滑窗，~10 条) ─┐
short     (SQLite 衰减)     │   ─► fusion (并行检索 + 加权合并) ─► prompt 注入
long      (ChromaDB 向量加权) ─┤
meta      (元记忆 / 用户画像)  ─┘
```

- **fact-extractor**：用户主动声明 + LLM 自动提取双通道直写长期记忆
- **reinforce**：高频话题强化分数，自动从 short 归档到 long
- **新鲜度衰减**：时间衰减 + 反复使用复活，避免越老越权威

> 文件：`packages/agent-langgraph/src/memory/{instant,short,long,meta,fusion,reinforce,fact-extractor}.ts`

### 🛡️ GuardRail 三层防护 <a id="guardrail"></a>

`harness-engineering` 思路在 Agent 的每个边界放一个守门员，全部基于规则 + 嵌入计算，**0 LLM 调用 0 token 成本**：

| 层 | 入口 | 核心策略 | 失败动作 |
| --- | --- | --- | --- |
| **L1 输入** | 用户消息入口 | 8 条注入模式（中英文 ignore / DAN / 角色扮演伪 system / Markdown 注入 / system prompt 泄露 / 密钥套取） | 400 拦截，返回 `GUARDRAIL_BLOCKED` |
| **L2 工具** | 工具调用前 | Zod schema + 黑名单（SQL 注入 / Shell 注入 / SSRF / 内网地址 / `file://`） | 拒绝该次工具调用，记录命中规则 |
| **L3 输出** | LLM 输出后异步 | Jaccard CJK-aware 相关性 + 启发式事实抽取 vs RAG 来源交叉验证 | 仅记录 + UI 徽章告警，不阻塞流式 |

通过的对话在消息卡片下方会出现"🛡️ 已通过 3 层防护"折叠徽章，含 sim / factCoverage 指标。

> 文件：`packages/agent-langgraph/src/guardrail/{input,tool,output}-guard.ts` + `policies.ts`

### 📊 OpenTelemetry 全链路可观测 <a id="observability"></a>

`AsyncLocalStorage` 隐式上下文 + `withSpan` 高阶函数，所有 node / tool / LLM / GuardRail 调用都落一个 span：

- **JSONL 落盘**：`logs/traces/{conversationId}.jsonl`，按 conversation 切分，grep 即可复盘
- **Trace Viewer**（Dashboard 右上）：按 conversationId 拉取 JSONL，瀑布图展示完整调用链
- **Dashboard 实时指标**：会话数 / RAG 命中率 / Agent 事件类型分布 / GuardRail L1/L2/L3 通过率

> 文件：`packages/agent-langgraph/src/otel/{instrumentation,exporters/jsonl-exporter,async-context}.ts`

### 🪪 任务规划 × 飞书任务双向闭环

Chat 里"帮我规划 React 学习计划，3 天周期" → 流式输出 markdown 表格 → 点"确认计划" → 后端按 `periodDays` 拆 N 条子任务写入任务页 → 回复带 `👉 [前往任务页查看](/tasks)` → 用户在任务页完成 → fire-and-forget 写长期记忆 → Profile "个人记忆" 沉淀。

> 文件：`packages/web/src/app/api/agent/chat/route.ts` + `packages/web/src/app/api/tasks/[id]/complete/route.ts`

---

## 架构

```
                 ┌────────────────────────────────────┐
                 │     Next.js 14 (App Router)        │
                 │  Chat / Dashboard / Tasks / Profile│
                 │  Trace Viewer · SSE Streaming       │
                 └────────────────┬───────────────────┘
                                  │ SSE
                 ┌────────────────▼───────────────────┐
                 │       Agent API (Route Handler)    │
                 │   GuardRail L1 → LangGraph → L3    │
                 └────────────────┬───────────────────┘
                                  │
                 ┌────────────────▼───────────────────┐
                 │     LangGraph StateGraph           │
                 │  intent → task / rag / qa / emotion│
                 │  + 4-tier Memory + OTel Span       │
                 └────┬──────┬──────┬─────────┬───────┘
                      │      │      │         │
                      ▼      ▼      ▼         ▼
                  Memory   RAG     MCP    Generation
                 (SQLite  (Chroma  (Bailian  (DashScope
                  +Vector +BM25    /XHS/    qwen3.6-plus
                  +Meta)  +Rerank) Feishu)   stream)
```

---

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Next.js 14（App Router）、React 18、Ant Design、Tailwind |
| Agent | LangGraph 0.4、LangChain Core |
| RAG | LlamaIndex 0.11、ChromaDB、BM25、BGE-M3 Reranker |
| Memory | Prisma + SQLite（短期 / 元）、ChromaDB（长期） |
| LLM | DashScope qwen3.6-plus（流式）、`text-embedding-v2` |
| Observability | 自研 OTel-compatible JSONL exporter |
| MCP | 阿里百炼 RAG、小红书内容、飞书任务 |
| 工程 | pnpm workspaces、TypeScript 5、tsx、Turbo（可选） |

---

## 快速开始

### 1. 依赖

```bash
node --version    # ≥ 18
pnpm --version    # ≥ 8
python3 --version # ≥ 3.10（ChromaDB 运行时）
```

### 2. 安装与初始化

```bash
git clone <repo>
cd <repo>

# 配置环境变量（DASHSCOPE_API_KEY 必填）
cp packages/web/.env.example packages/web/.env
# 编辑 packages/web/.env

# 首次初始化（依赖 + Prisma + 数据库 + 默认用户）
bash scripts/dev/init-first-run.sh
```

### 3. 启动

```bash
bash scripts/dev/start.sh
# 浏览器打开 http://localhost:3000
```

### 4.（可选）灌入知识库

```bash
# 最小集（40 条）
python3 scripts/data/init-knowledge-base.py

# 全量 bootstrap（~750 条，多源采集）
bash scripts/data/bootstrap-kb.sh
```

---

## 项目结构

```
techmate/
├── packages/
│   ├── web/                 # Next.js 前端 + API Routes
│   ├── agent-langgraph/     # LangGraph Agent 核心
│   ├── rag-engine/          # 混合 RAG（含 LlamaIndex 适配层）
│   ├── database/            # Prisma + SQLite + ChromaDB 客户端
│   ├── content-ingestion/   # 多源知识库采集
│   ├── scheduler/           # 定时任务（早安 / 周同步 / 异常巡检）
│   ├── mcp-bailian-rag/     # 百炼 RAG MCP
│   ├── mcp-xiaohongshu/     # 小红书内容 MCP
│   ├── mcp-feishu-tasks/    # 飞书任务 MCP
│   └── core/                # 共享常量 / 配置 / 日志
├── scripts/
│   ├── dev/                 # 本地开发启停（详见 scripts/README.md）
│   ├── data/                # 知识库 bootstrap / 迁移
│   └── deploy/              # Linux 部署 / systemd / swap
├── chroma-web-ui/           # ChromaDB 可视化前端（独立 Next 项目）
├── docker/                  # Dockerfile / docker-compose / nginx
└── docs/                    # 架构设计文档
```

每个 `packages/*` 都是独立 npm 包，通过 pnpm workspace 联动；包间使用 `@tech-mate/*` 命名空间。

---

## 部署

`scripts/deploy/` 下有完整的 Linux 部署链路：

```bash
sudo bash scripts/deploy/init-linux.sh        # 装 Node / pnpm / Python / ChromaDB / swap
sudo bash scripts/deploy/deploy-linux.sh      # 一键部署 + systemd
bash scripts/deploy/update-server.sh          # 每次发版热更新
```

Docker 方案见 `docker/DEPLOY.md`。

---

## 工程化亮点

- **monorepo / pnpm workspace**：`packages/*` 包间 symlink 互联，TypeScript 跨包 transpile（Next.js `transpilePackages`）
- **`tsx` 即开即跑**：所有 packages 既可直接 `tsx src/...ts` 又可 `pnpm -r build` 产物运行
- **流式回写**：从 LangGraph 节点 → API route → SSE → React 全链路 yield，首字节 ~1s
- **AsyncLocalStorage Generator 修复**：跨 yield 边界手动 `als.run` 包每个 `.next()`，trace 上下文不丢失
- **Markdown normalize**：抓 SSE 实测，5 个 Phase / 20+ 条正则把 LLM 残缺输出兜底
- **CJK-aware Jaccard**：相关性计算用 2-char bigram 分词，避免中文整句变一个 token

---

## 许可证

[MIT](./LICENSE)
