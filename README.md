# AI 备考陪伴教练 - 考公 Agent 项目

一个基于 `LangGraph + MCP + RAG + Next.js` 的考公备考陪伴系统。当前项目已经不是纯规划态，而是进入了“核心链路已落地、继续补齐联调与稳定性”的阶段。

## 当前状态

截至 `2026-03-26`，仓库中已经真实存在并可运行的能力包括：

1. Web 多会话聊天界面与会话管理
2. LangGraph Agent 多轮对话与意图路由
3. 百炼 RAG 检索服务
4. SQLite + Prisma 数据持久化
5. 小红书搜索 -> 详情 -> 正文提取 -> 去重入库链路
6. Agent 命中考公经验类问题时优先查询本地知识
7. 小红书同步看板与失败样本手动重试

如果需要看“当前真实代码状态、已完成项、剩余待办”，请优先阅读：

- [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)

## 技术架构

```text
Web (Next.js 14)
  -> Agent API / SSE
  -> LangGraph Agent
     -> 百炼 RAG MCP (HTTP)
     -> 小红书 MCP 客户端
     -> 数据库 Repository / Service
  -> SQLite (Prisma)
  -> Scheduler (定时任务 / 同步任务)
```

当前 `packages/` 下实际存在 8 个包：

1. `core`
2. `mcp-bailian-rag`
3. `mcp-feishu-tasks`
4. `agent-langgraph`
5. `scheduler`
6. `web`
7. `database`
8. `mcp-xiaohongshu`

## 当前重点页面与接口

### Web 页面

- `/`：聊天主界面
- `/dashboard`：总看板
- `/dashboard/xiaohongshu`：小红书同步看板
- `/focus`
- `/tasks`
- `/calendar`
- `/profile`

### 关键接口

- `/api/agent/chat`
- `/api/conversations`
- `/api/xhs-sync/report`
- `/api/xhs-sync/retry`

## 快速启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

按当前代码，至少需要关注：

- `DASHSCOPE_API_KEY`
- `MCP_BAILIAN_RAG_URL`
- 小红书 MCP 相关配置

### 3. 一键启动

推荐统一使用根目录脚本：

```bash
./start-all.sh
```

停止服务：

```bash
./stop-all.sh
```

当前这套脚本会负责：

1. 启动 Web 服务（`3000`）
2. 启动百炼 RAG HTTP 服务（`3002`）
3. 输出日志到 `/tmp/web-service.log` 与 `/tmp/mcp-service.log`
4. 校验 `_next` 静态资源是否可访问，减少“首页能开但资源 404”的误判

## 小红书相关说明

当前项目对小红书数据的使用口径已经明确：

1. 不抓首页推荐作为主链路
2. 以搜索关键词为主：
   - `杭州考公`
   - `浙江省考`
   - `杭州事业单位考试`
   - 及同类备考经验词
3. 同步结果先入本地库，再供 Agent 命中白名单问题时优先检索
4. 不希望让 Agent 在用户提问时实时搜索小红书

当前已落地能力：

- 搜索结果详情抓取
- 正文提取与评论摘录
- 失败分类
- 单条失败样本手动重试
- Web 可视化同步看板

## 开发文档

与当前代码最相关的文档入口：

- [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)：当前真实阶段记录
- [SKILL.md](/Users/sxh/Code/project/civil_agent/SKILL.md)：小红书 + Agent 增强总体方案
- [packages/web/SKILL.md](/Users/sxh/Code/project/civil_agent/packages/web/SKILL.md)
- [packages/agent-langgraph/SKILL.md](/Users/sxh/Code/project/civil_agent/packages/agent-langgraph/SKILL.md)
- [packages/mcp-xiaohongshu/SKILL.md](/Users/sxh/Code/project/civil_agent/packages/mcp-xiaohongshu/SKILL.md)
- [STARTUP_GUIDE.md](/Users/sxh/Code/project/civil_agent/STARTUP_GUIDE.md)

## 常用命令

```bash
# 安装依赖
pnpm install

# Web 开发
pnpm --filter @civil-agent/web dev

# 类型检查
pnpm type-check

# 构建指定包
pnpm --filter @civil-agent/agent-langgraph build
pnpm --filter @civil-agent/scheduler build

# 运行单元测试
pnpm --filter @civil-agent/agent-langgraph test:unit
pnpm --filter @civil-agent/scheduler test:unit
```

## 当前已知事项

1. 仓库中部分旧文档仍保留早期规划口径，不能直接代表最新进度。
2. Next.js 开发态如果出现 `/_next/static/*` 404 或 `vendor-chunks` 资源异常，优先执行：
   - `./stop-all.sh`
   - 清理 `packages/web/.next`
   - `./start-all.sh`
3. 小红书 MCP 是否“可达”不能只看 `GET /mcp` 是否返回 `200`，返回 `405` 也可能只是方法不允许，不代表服务未启动。

## 下一阶段重点

1. 会话状态源继续收口
2. 小红书失败样本继续压缩
3. 小红书看板筛选与诊断能力继续增强
4. 继续统一根文档与包级文档口径

## 许可证

MIT
