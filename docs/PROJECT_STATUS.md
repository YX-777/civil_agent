# Civil Agent 阶段记录（2026-03-18）

## 1. 记录目的与范围

本记录基于 **2026-03-18 当天代码仓库现状**整理，目标是：

1. 还原当前真实技术状态（以代码为准，不以历史 SKILL/规划文档为准）。
2. 标记“文档描述与代码不一致”的地方，避免误判进度。
3. 输出下一阶段可执行待办清单（按优先级拆分）。

本次核对范围：

- 根目录：`README.md`、`PROJECT_STRUCTURE.md`、`QUICK_START.md`、`STARTUP_GUIDE.md`、`DATABASE_DESIGN.md`、`SKILL.md` 等 Markdown。
- 全量包结构：`packages/*`（含 `database`、`mcp-xiaohongshu`、`web` 会话管理代码）。
- 关键启动与联调脚本：`start-all.sh`、`stop-all.sh`、`test-all.sh`。

---

## 2. 仓库快照（代码层）

### 2.1 Monorepo 结构（实际存在）

当前 `packages/` 下存在 8 个包：

1. `core`
2. `mcp-bailian-rag`
3. `mcp-feishu-tasks`
4. `agent-langgraph`
5. `scheduler`
6. `web`
7. `database`
8. `mcp-xiaohongshu`

其中 `database`、`mcp-xiaohongshu` 已经有真实代码和 `package.json`，不再是“纯规划态”。

### 2.2 当前工作区状态（非干净）

`git status --short` 显示存在未提交改动，重点包括：

- `SKILL.md`（新增）
- `packages/agent-langgraph/package.json`（修改）
- `packages/agent-langgraph/src/config/agent.config.ts`（修改）
- `packages/agent-langgraph/src/prompts/system-prompts.ts`（修改）
- `packages/agent-langgraph/src/tools/xiaohongshu-tools.ts`（新增）
- `packages/mcp-xiaohongshu/`（新增目录）
- `pnpm-lock.yaml`（修改）
- `xiaohongshu-mcp-bin/`（新增目录）

说明：仓库正在持续开发中，包含进行中的小红书集成工作。

---

## 3. 技术方案现状（按代码）

## 3.1 总体链路

当前实际主链路可描述为：

`Web(Next.js) -> Agent(LangGraph) -> MCP(RAG HTTP / 小红书 MCP 客户端) -> Database(Prisma+SQLite, 可选向量层)`

说明：

- 任务 MCP（飞书）包存在且有实现，但 Agent 当前主要显式调用的是 RAG MCP HTTP 工具。
- 小红书能力已进入接入阶段（包和工具加载已存在），但“抓取-入库-上传百炼-定时同步”完整流水线尚未闭环。

## 3.2 Web 层（已具备可用功能）

实际代码已具备：

1. 聊天主页面和多会话 UI（含侧边栏/分组/重命名/删除）。
2. 会话 API：
   - `GET /api/conversations`
   - `POST /api/conversations`
   - `GET /api/conversations/[id]`
   - `DELETE /api/conversations/[id]`
   - `PATCH /api/conversations/[id]`
3. Agent 聊天接口使用 SSE 流式返回（`/api/agent/chat`）。
4. `use-conversations` Hook + 本地 `localStorage` 当前会话记忆。

关键代码：

- `packages/web/src/app/page.tsx`
- `packages/web/src/hooks/use-conversations.ts`
- `packages/web/src/components/chat/ChatSidebar.tsx`
- `packages/web/src/app/api/conversations/route.ts`
- `packages/web/src/app/api/conversations/[id]/route.ts`
- `packages/web/src/app/api/agent/chat/route.ts`

注意点（代码风险，不是“未实现”）：

- `api/agent/chat` 仍有内存态 `Map`（`userStates`）参与，会与数据库持久化路径形成双轨状态源，后续建议统一。

## 3.3 Agent 层（已可运行）

实际代码已具备：

1. 意图识别、早晚问候、任务生成、情绪支持、通用问答节点。
2. 通过 `mcp-tools.ts` 调用 RAG HTTP 工具（默认 `http://localhost:3002`）。
3. LLM 使用 DashScope 兼容 OpenAI 接口（`qwen3-max`）。
4. 已有小红书工具加载入口（`tools/xiaohongshu-tools.ts`）。

关键代码：

- `packages/agent-langgraph/src/graph/nodes.ts`
- `packages/agent-langgraph/src/tools/mcp-tools.ts`
- `packages/agent-langgraph/src/config/agent.config.ts`
- `packages/agent-langgraph/src/tools/xiaohongshu-tools.ts`

## 3.4 MCP 层

### mcp-bailian-rag

实际代码已具备：

1. HTTP Server 包装（`/health`, `/api/tools/search_knowledge`, `/api/tools/upload_document`）。
2. 检索器与工具实现（user history / exam experience）。
3. 可由 `start-all.sh` 启动到 3002 端口。

关键代码：

- `packages/mcp-bailian-rag/src/http-server.ts`
- `packages/mcp-bailian-rag/src/tools/*`

### mcp-feishu-tasks

包与工具代码存在（create/query/update/complete），但当前主链路是否稳定接入 Agent 需要联调验证，不应仅凭文档判定“已完全闭环”。

### mcp-xiaohongshu

实际代码已具备：

1. 独立包结构、客户端封装、工具导出。
2. 通过 `@langchain/mcp-adapters` 对接本地小红书 MCP 服务。

关键代码：

- `packages/mcp-xiaohongshu/src/client/xiaohongshu-client.ts`
- `packages/mcp-xiaohongshu/src/tools/xiaohongshu-tools.ts`
- `packages/mcp-xiaohongshu/QUICKSTART.md`

当前缺口：尚未看到与 `scheduler/database/bailian` 的端到端自动同步闭环代码。

## 3.5 Database 层（非规划态，已实现）

实际代码已具备：

1. Prisma schema（用户、会话、消息、任务、学习记录、模块进度、Agent 状态、embedding 引用等）。
2. Repository 层（conversation/message/task/user 等）。
3. 向量服务（Chroma 封装、embedding/sync service）。
4. Web 侧数据库初始化入口（`/api/database/init`）。

关键代码：

- `packages/database/prisma/schema.prisma`
- `packages/database/src/repositories/*`
- `packages/database/src/services/*`
- `packages/web/src/lib/database.ts`

结论：`database` 不是“待创建”，而是“已落地，待联调/优化”。

## 3.6 Scheduler 层（有实现）

实际代码已具备：

1. cron 调度器、队列处理、任务注册（早安/晚复盘/异常检测）。
2. 启停逻辑和 SIGINT/SIGTERM 优雅退出。

关键代码：

- `packages/scheduler/src/index.ts`
- `packages/scheduler/src/jobs/*`
- `packages/scheduler/src/queue/*`

当前缺口：观测性、与新增小红书数据任务的整合尚未完成。

---

## 4. 文档与代码不一致清单（重点）

## 4.1 规划文档落后（大量“计划中/0%”）

以下文档包含大量“未完成”勾选项，但代码事实上已实现大部分基础模块：

- `PROJECT_STRUCTURE.md`
- `PROJECT_INIT_SUMMARY.md`
- `README.md` 的进度表
- `DATABASE_DESIGN.md` 中部分早期待办

## 4.2 `packages/web/SKILL.md` 与现状冲突

文档中“会话管理 MVP（待实现）”仍为未勾选，但代码已经有：

- 会话侧边栏组件
- Hook
- 对应 API 路由
- localStorage 当前会话持久化

该部分属于文档滞后。

## 4.3 `docs/` 目录描述不一致

多个文档提到 `docs/` 目录，但当前仓库根目录无 `docs/`，属于文档结构描述不准确。

---

## 5. 当前真实待办（按优先级）

以下为“和代码真实状态对应”的待办，不重复列已完成历史项。

## P0（必须优先）

1. 文档统一与收敛
   - 统一根文档进度口径，删除/修订过期“计划中”内容。
   - 给出一份当前唯一可信状态文档（本文件即第一版）。

2. 会话状态源统一
   - 解决 `api/agent/chat` 内存态与数据库态双轨问题。
   - 明确服务重启后的会话恢复策略。

3. 联调脚本修正
   - `test-all.sh` 仍按旧响应结构检查 Agent，需改为 SSE/新返回结构。
   - 补充 conversation API 回归测试。

4. 环境与启动路径校准
   - `start-all.sh` / `STARTUP_GUIDE.md` 的命令、端口、日志说明需与现状一致。

## P1（本阶段完成可显著提效）

1. 小红书链路闭环（最小可用）
   - 抓取任务 -> 数据入库 -> 上传百炼 -> 状态回写 -> Agent 可检索。
   - 当前仅完成“工具接入层”。

2. 数据层一致性与性能
   - 会话/消息写入事务化和索引复核。
   - 向量同步任务的失败重试、可观测日志补齐。

3. 任务 MCP 联调验证
   - 验证 `mcp-feishu-tasks` 在真实 Agent 场景中的调用链路和异常处理。

## P2（质量与发布前工作）

1. 集成测试补全（Web + Agent + MCP + DB + Scheduler）。
2. 性能基线（核心接口延迟、错误率、吞吐）。
3. 部署与运维文档（环境变量、依赖服务、故障排查）标准化。

---

## 6. 结论（截至 2026-03-18）

项目不再处于“仅有规划文档”阶段，而是已经进入“多模块已实现、需统一口径并补联调闭环”的阶段。

最关键的问题不是“从 0 开发”，而是：

1. 文档口径落后导致认知偏差。
2. 状态与数据链路需要进一步收敛（尤其会话状态和小红书增量链路）。
3. 测试与发布级别保障尚未成体系。

本文件可作为当前阶段基线记录，后续建议按日期持续追加（如 `0325.md`, `0401.md`）。

---

## 7. 2026-03-26 增量进展补充（按当前代码校准）

本节用于补充 2026-03-18 之后已经真实落地、且当前工作区中仍保留的关键改动，避免后续继续按照“仅规划态”理解项目。

### 7.1 Agent 检索路由 MVP 已落地

当前 `agent-langgraph` 已新增“小红书考公经验优先走本地知识库”的最小闭环：

1. 新增白名单问题识别与本地 RAG 路由：
   - `packages/agent-langgraph/src/graph/xiaohongshu-rag.ts`
   - `packages/agent-langgraph/src/graph/xiaohongshu-rag.test.ts`
2. `generalQANode` 已接入该逻辑：
   - `packages/agent-langgraph/src/graph/nodes.ts`
3. 当前策略不是实时搜索小红书，而是：
   - 用户问题命中白名单词（如“杭州考公”“浙江省考”“杭州事业单位考试”“上岸经验”“报班避坑”等）
   - 优先查询本地 `exam_experience` / RAG 数据
   - 未命中或本地无结果时再回退到普通问答

这意味着：

- Agent 已具备“优先消费本地沉淀知识”的能力；
- 当前方向与“定期同步入库，不做实时小红书搜索”的业务约束一致；
- 该模块已补了单元测试，不再只是文档方案。

### 7.2 小红书同步链路已从“工具接入”推进到“可跑通的小样本闭环”

`scheduler + database + mcp-xiaohongshu` 当前已具备以下实际能力：

1. 不再抓首页推荐，改为按业务关键词搜索：
   - `杭州考公`
   - `浙江省考`
   - `杭州事业单位考试`
   - 以及同类考公经验词
2. 详情抓取后已做正文提取与评论摘录拼接：
   - `packages/scheduler/src/jobs/xiaohongshu-detail.ts`
   - `packages/scheduler/src/jobs/xiaohongshu-detail.test.ts`
3. 周期任务已接入搜索、详情、去重、入库与失败分类：
   - `packages/scheduler/src/jobs/weekly-xiaohongshu-sync.ts`
   - `packages/database/src/services/xhs-sync.service.ts`
4. 当前失败分类至少已细化为：
   - `access_denied`
   - `transient`
   - `parse_empty`
   - `login_required`
   - `invalid_param`
   - `lookup_miss`
   - `unknown`
5. MCP 调用节流已接入，默认通过 `XHS_MCP_CALL_INTERVAL_MS` 控制调用间隔，避免高频触发风控。

当前代码状态说明：

- 小红书链路已经不是“只有工具封装”；
- 已存在搜索 -> 详情 -> 正文解析 -> 去重入库 -> 同步报告的代码路径；
- 并且已围绕该链路补了单元测试与真实小样本联调。

### 7.3 单条失败样本的手动重试能力已落地

为了解决 `detail_unavailable` 帖子需要人工二次触发的问题，当前工作区已补充“单条重试抓取”能力：

1. 新增单条重试逻辑：
   - `packages/scheduler/src/jobs/xiaohongshu-retry.ts`
2. 新增前端 API：
   - `packages/web/src/app/api/xhs-sync/retry/route.ts`
3. 失败样本支持从看板页面手动点击重试：
   - `packages/web/src/app/dashboard/xiaohongshu/page.tsx`

当前行为约束：

- 仅对 `detail_unavailable` 样本展示“重试抓取”按钮；
- 重试前会检查小红书 MCP 是否可达，必要时自动拉起 `packages/mcp-xiaohongshu/start.sh`；
- 若重试过程中命中 `lookup_miss`，会尝试基于标题/关键词重新搜索候选详情；
- 只有原始 `postId` 真实更新为 `new`，接口才返回成功；
- 已修复“匹配到相似但不是同一条帖子时误报成功”的问题。

这个修复很关键，因为此前确实出现过：

- 页面提示“刚刚重试成功”；
- 但数据库里原始帖子仍是 `detail_unavailable`；
- 根因是重试逻辑把“相似标题候选帖子”误判为原帖恢复成功。

现在这条风险已经在代码层面被收紧。

### 7.4 小红书同步看板已落地

当前 `web` 包已新增面向内部联调/验收的小红书同步看板：

1. 页面路由：
   - `/dashboard/xiaohongshu`
2. 报表 API：
   - `packages/web/src/app/api/xhs-sync/report/route.ts`
3. 数据获取 Hook：
   - `packages/web/src/hooks/use-xhs-sync-report.ts`
4. 类型定义：
   - `packages/web/src/types/index.ts`

页面当前已支持：

1. 同步总览指标：
   - 总同步次数
   - 成功次数
   - 已入库帖子数
   - 详情失败帖子数
2. 最近一次同步摘要：
   - 抓取候选数
   - 新增入库数
   - 详情失败数
   - 失败分类 breakdown
3. 最近同步记录表
4. 最近帖子样本表
5. 失败趋势图
6. 关键词效果表
7. 帖子样本筛选：
   - 全部
   - 只看正文可用
   - 只看详情失败
8. 失败样本行内“重试抓取”操作

补充说明：

- 看板已不是静态页面，而是直接读本地数据库中的 `xhs_sync_runs` 与 `xhs_posts`；
- 前端展示已补中文错误映射，避免页面直接暴露 `noteDetailMap not found` 等技术错误给使用者；
- `errorCategory` 会从 `content_raw` 中解析 `_detailErrorCategory`，用于更友好的失败展示。

### 7.5 运行稳定性补充

围绕这轮联调，还做了几项实际的运行修正：

1. `packages/mcp-xiaohongshu/start.sh` 已调整为后台常驻模式，避免脚本退出后 MCP 子进程被一并带停。
2. Web 开发态出现过 `_next/static/*` 404 与 `vendor-chunks` 缓存错乱，当前标准处理方式仍是：
   - `./stop-all.sh`
   - 清理 `packages/web/.next`
   - `./start-all.sh`
3. 小红书重试接口曾把 `GET /mcp` 返回 `405` 误判为“服务不可达”，现已修正为：
   - 只要能连上 `18060/mcp`，即视为 MCP 已监听；
   - 不再把 `405` 当成服务不可用。

### 7.6 截至当前仍未完成的真实待办

结合本轮实际落地情况，接下来仍值得继续推进的点主要有：

#### 新增阻塞记录（2026-04-16）

Agent 任务链路的本地代码闭环已补上：

1. 任务计划生成后可解析为结构化 `pendingTaskPlan`
2. 用户点击/发送 `确认计划` 时，可直接创建真实任务
3. 任务页与任务完成后的学习记录写入均已接到真实数据库

但在“自然语言 -> Agent 调模型生成计划”这一步，当前环境仍存在外部依赖阻塞：

1. `agent-langgraph` 运行时固定走 DashScope OpenAI 兼容接口
   - 默认模型：`qwen3-max`
   - 默认读取：`DASHSCOPE_API_KEY`
2. 当前本地运行环境未发现可用的 `.env` / `.env.local`
3. Web 运行日志显示：
   - `dotenv` 实际注入环境变量数量为 `0`
   - Agent 调模型时出现 `403 Forbidden` 或 `Connection error`

当前判断：

1. 本地任务闭环代码已可用；
2. Agent 真实自然语言生成计划仍受 DashScope 鉴权/模型权限配置阻塞；
3. 该问题属于环境与外部模型接入待办，不阻塞继续推进后续本地功能。

TODO：

1. 补齐 `DASHSCOPE_API_KEY`
2. 校验当前账号是否具备 `qwen3-max` 权限
3. 如无权限，回退到当前账号可用的 Qwen 模型并重新联调聊天主链路

#### P0

1. 会话状态源统一继续收口
   - `conversation / messages / agent_states` 的职责边界虽然已经比之前清晰，但仍需要进一步固化与补边界测试。
2. 小红书失败样本继续压缩
   - 重点继续降低 `unknown` 占比，并验证 `lookup_miss` 补救路径的真实收益。

#### P1

1. 小红书同步结果可观测性继续增强
   - 例如增加失败原因筛选、按时间范围查看、按关键词维度查看更多历史结果。
2. 看板交互继续完善
   - 例如按失败原因筛选、直接查看完整错误上下文、对重试结果做更细粒度状态提示。
3. 文档统一继续推进
   - 根目录 `SKILL.md`、部分旧规划文档仍带有明显“未来式”描述，需逐步切换成“已实现/未实现”并存的真实口径。

### 7.7 当前建议

从当前代码和文档的一致性角度看，`0318.md` 已经不再只是“03-18 当天快照”，而是实际承担了阶段记录的职责。后续如果不新建 `0326.md`，至少应继续按日期追加，保持这里是“项目真实状态”的第一入口。

---

## 7. 运行故障补充（2026-03-19）

### 7.1 实际遇到的问题

1. `http://localhost:3000` 首页可打开，但 `_next/static/*` 资源出现 404。
2. 在一次手工重启后，3000 端口进程退出，浏览器报“无法访问此网站”。
3. 启动脚本提示“可查看 `/tmp/web-service.log` 与 `/tmp/mcp-service.log`”，但原脚本没有真实写入日志文件，排障信息不完整。

### 7.2 根因归纳

1. 启动链路没有对 `_next` 静态资源做健康检查，只校验了首页可达，导致“部分可用”状态未被及时识别。
2. 进程生命周期管理不完整：缺少统一退出清理机制，容易出现旧进程残留或新进程退出后无感知。
3. 日志说明与脚本行为不一致，导致问题定位成本上升。

### 7.3 已落地修复

1. `start-all.sh` 增加真实日志重定向：
   - Web：`/tmp/web-service.log`
   - MCP：`/tmp/mcp-service.log`
2. 增加启动校验函数：
   - MCP 健康检查：`/health`
   - Web 可达检查：`http://localhost:3000`
   - `_next` 静态资源检查：从首页 HTML 解析静态资源 URL 并请求校验
3. 增加 `trap` 退出清理逻辑，确保脚本退出时回收子进程并清理 PID 文件。
4. `stop-all.sh` 增加 PID 存活判断后再 kill，减少误报并提升脚本幂等性。

### 7.4 标准排障顺序（前端 3000）

1. 先看端口：
   - `lsof -nP -iTCP:3000 -sTCP:LISTEN`
2. 再看日志：
   - `tail -f /tmp/web-service.log`
3. 如果出现 `_next/static` 404：
   - 执行 `./stop-all.sh`
   - 执行 `./start-all.sh`
   - 观察启动输出里的 `_next` 静态资源校验是否通过
4. 若仍失败，采集并上报：
   - 任意一个 404 资源 URL
   - 对应请求 Response headers / body
   - `/tmp/web-service.log` 最近 100 行

---

## 8. 下一阶段可执行任务单（基于当前真实状态）

本节用于替换“笼统待办”的表达方式，按当前代码现状拆成可直接执行的开发项。原则是：

1. 不重复记录已经完成或已明显推进的事项。
2. 优先记录“会影响后续开发稳定性”的基础问题。
3. 小红书链路以“先可稳定服务 Agent，再追求完备能力”为主。

### 8.1 已完成或已明显推进的事项

以下事项不再作为当前最高优先级待办：

1. 启动链路基础校准已完成
   - `start-all.sh` / `stop-all.sh` 已支持日志落盘、PID 管理、静态资源自检。
   - 前端 `_next/static/*` 404 的一类启动问题已有标准排障路径。

2. 会话初始化竞态的首轮修复已完成
   - 页面刷新反复创建新会话的问题已修复。
   - 历史会话恢复与当前会话 bootstrap 逻辑已做首轮收敛。

3. 小红书同步基础能力已具备
   - 已有关键词搜索、详情抓取、去重入库、同步结果记录等基础模块。
   - 已不再停留在“只有工具接入，没有任务代码”的阶段。

### 8.2 P0：下一步必须先做的功能

#### P0-1 Agent 检索路由 MVP

目标：

让 Agent 在命中“小红书经验类问题”时，优先查询本地知识库/数据库，而不是实时调用小红书搜索。

要做的功能：

1. 定义白名单问题范围
   - 如：`杭州考公`、`浙江省考`、`杭州事业单位考试`、岗位备考经验、面试经验、报班避坑等。

2. 增加意图命中后的检索分流
   - 命中白名单：查本地 RAG / 数据库摘要
   - 未命中：走当前通用回答链路

3. 统一返回结果结构
   - 至少包含：摘要内容、来源帖子标识、可选引用信息
   - 避免只返回模糊结论，不给来源

4. 明确失败降级策略
   - 本地知识为空或命中不足时，回退到通用回答
   - 不能因为小红书知识缺失直接让整轮对话失败

验收标准：

1. 命中白名单问题时，Agent 的上下文里能看到本地小红书知识注入。
2. 不触发实时小红书搜索。
3. 在知识为空时仍能返回正常回答。

#### P0-2 小红书正文提取与详情成功率优化

目标：

让入库数据真正可用于后续 RAG，而不是只有标题、作者、点赞等元信息。

要做的功能：

1. 固化业务搜索词
   - 以当前目标词为主：`杭州考公`、`浙江省考`、`杭州事业单位考试`
   - 不再以首页推荐流作为主数据源

2. 继续增强正文解析
   - 优先提取帖子正文主文本
   - 补充评论或说明字段的解析策略
   - 明确 `content`、`raw_detail`、`error_message` 等字段各自承载什么信息

3. 降低 `detail_unavailable` 比例
   - 区分失败类型：登录问题、页面加载失败、参数问题、解析失败、风控/限流
   - 针对不同失败类型做限次重试或降级标记

4. 增加 MCP 调用节流
   - 每次调用之间加入固定或可配置间隔
   - 避免短时间连续调用导致封控风险上升

验收标准：

1. 小样本抓取（例如 5 条）里，大多数记录应有可读正文。
2. 同步报告里能看出每种失败原因的数量。
3. 整个抓取过程不会因为单条详情失败而整体中断。

#### P0-3 会话状态源统一收尾

目标：

把 `conversation`、`messages`、`agent_states` 的边界彻底固定，避免后续再次出现双轨状态和时序不一致。

要做的功能：

1. 明确三张表职责
   - `conversation`：会话元数据与标题
   - `messages`：用户/助手最终消息记录
   - `agent_states`：当前轮运行态与结构化状态快照

2. 统一流式生成中的写入策略
   - 什么时候写用户消息
   - 什么时候写 assistant 最终消息
   - 什么时候更新 agent state
   - 流中断时保留什么，回滚什么

3. 清理残余双写风险
   - 继续排查 `api/agent/chat` 中仍可能依赖内存态的路径
   - 避免服务重启后状态恢复不一致

4. 补边界测试
   - SSE 中断
   - 页面刷新
   - 重复提交
   - 切换会话后返回继续对话

验收标准：

1. 刷新页面不会新增空白会话。
2. 历史会话能稳定恢复。
3. 数据库中不会持续累积“只有壳没有消息”的无效会话。

### 8.3 P1：本阶段完成后会明显提效的功能

#### P1-1 小红书同步结果可观测性

目标：

让同步任务从“能跑”变成“可诊断、可比较、可追踪”。

要做的功能：

1. 为每次同步输出统一报告
   - 搜索关键词
   - 抓取数量
   - 新增数量
   - 去重数量
   - 详情失败数量
   - 各失败原因统计

2. 提供最近一次同步查询入口
   - 可先做数据库查询或内部 API
   - 不要求一开始就做成管理后台页面

3. 对高失败率关键词做标记
   - 为后续调参、切词、改抓取策略提供依据

验收标准：

1. 任意一次同步任务结束后，都能快速回答“抓了多少、成功多少、失败为什么”。

#### P1-2 联调脚本与回归测试补齐

目标：

让当前真实链路有一套最小可重复验证的方法，避免后续修改后靠人工猜测是否回归。

要做的功能：

1. 修正 `test-all.sh`
   - 对齐当前 SSE 返回结构
   - 对齐当前 conversation / agent state API

2. 增加关键回归测试
   - conversation API
   - agent state API
   - 会话初始化与恢复逻辑
   - 小红书同步小样本流程

3. 把启动与联调检查串起来
   - 启动成功
   - Web 页面可访问
   - `_next` 资源可访问
   - 关键 API 可通

验收标准：

1. 新人或后续自己拉起项目后，可以按脚本完成一轮基础自检。

#### P1-3 任务 MCP 联调验证

目标：

确认 `mcp-feishu-tasks` 不是“代码存在但主链路不可用”。

要做的功能：

1. 验证 Agent 场景下任务创建/查询/更新调用
2. 验证异常处理与用户提示
3. 确认与当前对话主链路不会互相污染状态

验收标准：

1. 至少一条真实 Agent 对话路径可以稳定调用任务 MCP。

### 8.4 P2：质量与发布前补强项

1. 集成测试补全
   - Web + Agent + MCP + DB + Scheduler 的最小闭环测试

2. 性能基线
   - 对聊天接口、同步任务、检索接口建立基础耗时与错误率观察

3. 文档统一收尾
   - `README.md`、各包 `SKILL.md`、启动说明与当前真实进度统一
   - 减少“旧规划文档误导当前判断”的风险

### 8.5 推荐执行顺序

如果按“先确保产品有用，再补完整度”的原则，建议顺序如下：

1. `P0-1 Agent 检索路由 MVP`
2. `P0-2 小红书正文提取与详情成功率优化`
3. `P0-3 会话状态源统一收尾`
4. `P1-1 小红书同步结果可观测性`
5. `P1-2 联调脚本与回归测试补齐`
6. `P1-3 任务 MCP 联调验证`

### 8.6 当前阶段判断

截至目前，项目的核心矛盾已经不是“基础模块缺失”，而是：

1. 已有模块之间的边界和时序还需要继续收敛。
2. 小红书链路需要从“抓到数据”升级为“稳定服务 Agent”。
3. 测试、脚本、文档要跟上当前真实进度，避免后续重复踩坑。

## 9. 推荐代码阅读顺序（2026-03-26 注释版）

本节用于记录“当前最值得先读的代码文件”。这些文件已经补过较详细的中文注释，适合作为理解系统现状的主入口。

### 9.1 如果要理解“会话为什么不会因刷新重复创建”

建议按这个顺序读：

1. `packages/web/src/app/page.tsx`
   - 看首页初始化如何等待 `hasBootstrapped`
   - 看什么时候会自动选中已有会话
   - 看什么时候才会自动创建默认新会话
2. `packages/web/src/hooks/use-conversations.ts`
   - 看 `isLoading` 和 `hasBootstrapped` 的区别
   - 看 `localStorage` 恢复逻辑
   - 看当前会话切换、删除、更新时如何同步本地状态
3. `packages/web/src/hooks/use-agent.ts`
   - 看发送消息前为什么必须已有 `conversationId`
   - 看 SSE `chunk / done / error` 的前端消费方式
4. `packages/web/src/app/api/agent/chat/route.ts`
   - 看服务端如何加载 `agent_states`
   - 看为什么完整 assistant 回复拿到后才统一事务落库
   - 看 `messages / conversation / agent_states` 的提交时序

适合回答的问题：

1. 为什么刷新页面不会再重复建新会话？
2. 为什么历史会话现在可以稳定恢复？
3. 为什么 `agent_states` 和 `messages` 仍然都需要保留？

### 9.2 如果要理解“小红书同步主链路”

建议按这个顺序读：

1. `packages/scheduler/src/jobs/weekly-xiaohongshu-sync.ts`
   - 看整轮同步任务的入口
   - 看“历史失败样本补偿 + 新关键词搜索”如何合并
   - 看 MCP 节流、详情抓取、重试和失败统计
2. `packages/scheduler/src/jobs/xiaohongshu-detail.ts`
   - 看正文提取、评论摘录、失败分类、候选匹配
3. `packages/database/src/services/xhs-sync.service.ts`
   - 看 feed 如何归一化成数据库入参
   - 看 postId 去重、内容哈希去重、run 统计报告写回
4. `packages/scheduler/src/jobs/xiaohongshu-retry.ts`
   - 看单条失败样本重试与批量同步的区别
   - 看为什么要严格校验原始 `postId` 是否真的恢复成功

适合回答的问题：

1. 现在抓的是首页推荐还是业务关键词？
2. 为什么有的帖子会落成 `detail_unavailable`？
3. `lookup_miss` 是什么，为什么要重新搜索？
4. 为什么会有“按 postId 去重”和“按内容哈希去重”两层？

### 9.3 如果要理解“Agent 如何优先使用本地小红书知识”

建议按这个顺序读：

1. `packages/agent-langgraph/src/graph/xiaohongshu-rag.ts`
   - 看白名单词命中
   - 看本地知识上下文怎么组装
   - 看为什么不假装实时搜索
2. `packages/agent-langgraph/src/graph/nodes.ts`
   - 看 `generalQANode`
   - 看 `generalQANodeStream`
   - 看非流式与流式如何保持同一套路由逻辑
3. `packages/agent-langgraph/src/graph/xiaohongshu-rag.test.ts`
   - 看当前设计最在意防哪些回归

适合回答的问题：

1. 为什么命中“杭州考公/浙江省考”这类问题时会优先查本地库？
2. 为什么现在不希望 Agent 实时搜索小红书？
3. 流式回答和非流式回答为什么行为一致？

### 9.4 如果要理解“小红书同步看板与手动重试”

建议按这个顺序读：

1. `packages/web/src/app/api/xhs-sync/report/route.ts`
   - 看报表 API 从数据库取哪些数据
   - 看 `errorCategory` 和 `report_json` 如何解析
2. `packages/web/src/hooks/use-xhs-sync-report.ts`
   - 看看板数据加载与刷新
3. `packages/web/src/app/dashboard/xiaohongshu/page.tsx`
   - 看失败趋势、关键词效果、帖子样本表
   - 看中文错误映射
   - 看“重试抓取”按钮交互
4. `packages/web/src/app/api/xhs-sync/retry/route.ts`
   - 看为什么要先检查/自动拉起 MCP
   - 看为什么 `GET /mcp` 返回 `405` 也视为服务可达

适合回答的问题：

1. 为什么页面里现在显示的是中文失败原因？
2. 为什么之前会出现“提示重试成功但实际没恢复”的假成功？
3. 为什么现在手动重试更可信？

### 9.5 当前最小阅读建议

如果时间有限，建议至少先读这 6 个文件：

1. `packages/web/src/app/api/agent/chat/route.ts`
2. `packages/web/src/hooks/use-conversations.ts`
3. `packages/scheduler/src/jobs/weekly-xiaohongshu-sync.ts`
4. `packages/scheduler/src/jobs/xiaohongshu-retry.ts`
5. `packages/database/src/services/xhs-sync.service.ts`
6. `packages/web/src/app/dashboard/xiaohongshu/page.tsx`

这 6 个文件基本可以覆盖：

1. 会话主链路
2. 小红书同步主链路
3. 失败样本诊断与人工重试
4. 看板可视化与当前验收入口
