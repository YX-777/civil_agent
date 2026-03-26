# 考公 Agent 项目结构说明

> 状态说明（2026-03-26）：
> 本文档用于描述当前仓库的真实结构。旧版本中关于 `docs/`、`data/`、`scripts/` 的目录树以及“第几周做什么”的计划表，已经不再适合作为当前结构依据。

## 根目录当前重点文件

当前更值得关注的根目录文件包括：

1. [README.md](/Users/sxh/Code/project/civil_agent/README.md)
2. [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)
3. [STARTUP_GUIDE.md](/Users/sxh/Code/project/civil_agent/STARTUP_GUIDE.md)
4. [QUICK_START.md](/Users/sxh/Code/project/civil_agent/QUICK_START.md)
5. [SKILL.md](/Users/sxh/Code/project/civil_agent/SKILL.md)
6. `package.json`
7. `pnpm-workspace.yaml`
8. `start-all.sh`
9. `stop-all.sh`
10. `test-all.sh`

## packages 目录当前实际结构

当前 `packages/` 下真实存在以下包：

1. `core`
2. `mcp-bailian-rag`
3. `mcp-feishu-tasks`
4. `agent-langgraph`
5. `scheduler`
6. `web`
7. `database`
8. `mcp-xiaohongshu`

## 各包职责

### 1. `packages/core`

职责：

- 共享类型
- 日志工具
- 公共配置与常量

### 2. `packages/mcp-bailian-rag`

职责：

- 百炼知识库检索
- 文档上传
- HTTP 服务对外暴露检索能力

### 3. `packages/mcp-feishu-tasks`

职责：

- 飞书任务 MCP 工具封装
- 任务创建、查询、更新等能力

### 4. `packages/agent-langgraph`

职责：

- LangGraph 对话状态机
- 意图识别与节点编排
- 工具调用路由
- 本地知识优先的考公经验问答增强

### 5. `packages/scheduler`

职责：

- 定时任务
- 小红书同步任务编排
- 详情重试与后台处理

### 6. `packages/web`

职责：

- Next.js 前端
- 聊天页面与会话管理
- Dashboard 与小红书同步看板
- API 路由聚合

### 7. `packages/database`

职责：

- Prisma schema
- SQLite 持久化
- Repository / Service 封装
- 向量同步与数据服务

### 8. `packages/mcp-xiaohongshu`

职责：

- 小红书 MCP 客户端封装
- 搜索、详情、登录状态等能力
- 与外部 MCP 二进制服务对接

## 当前主链路

从系统角度看，当前项目的主链路更接近：

```text
Web
  -> Agent API
  -> agent-langgraph
     -> mcp-bailian-rag
     -> mcp-xiaohongshu
     -> database
  -> scheduler
     -> 小红书同步任务
     -> database
```

## 当前结构认知上的几个注意点

### 1. 不能再假设只有 6 个包

当前仓库不是最初那版 6 包结构，而是至少 8 个包，并且：

- `database` 不是“以后再建”
- `mcp-xiaohongshu` 不是“外部工具占位”

### 2. 不能再按不存在的目录理解项目

旧文档里提到的：

- `docs/`
- `data/`
- `scripts/`

并不是当前仓库理解项目结构的核心入口，至少不应再作为 README 级别的结构图主干。

### 3. 阶段计划不等于当前结构

“第 1 周做什么、第 2 周做什么”这类计划表有历史价值，但已经不适合作为当前结构说明。

## 建议阅读顺序

如果现在要快速建立对项目的正确认知，建议按下面顺序读：

1. [README.md](/Users/sxh/Code/project/civil_agent/README.md)
2. [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)
3. 本文档
4. 各包下的 `SKILL.md`

## 当前结论

项目结构本身已经比较稳定，当前工作的重点不再是“继续拆包”，而是：

1. 让现有包之间的联调更稳
2. 让文档与代码保持一致
3. 让新增能力能够被清楚观察和验证
