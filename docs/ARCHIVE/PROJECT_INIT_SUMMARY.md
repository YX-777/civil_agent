# 考公 Agent 项目初始化总结

> 状态说明（2026-03-26）：
> 本文档保留“项目最初初始化阶段”的背景信息，但其中原有的“待创建模块/0% 进度”描述已经过时。当前真实状态请优先参考 [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)。

## 文档目的

这份文档现在更适合被理解为：

1. 记录项目最初的模块拆分思路
2. 保留早期 Monorepo 初始化背景
3. 说明哪些内容已经不再适合作为当前进度依据

## 初始化阶段的核心结论

项目从一开始就采用了 Monorepo 结构，并明确拆分为以下方向：

1. `core`：共享类型、日志、常量
2. `mcp-bailian-rag`：知识检索能力
3. `mcp-feishu-tasks`：任务系统能力
4. `agent-langgraph`：多轮对话 Agent
5. `scheduler`：定时任务与后台编排
6. `web`：Next.js 前端
7. `database`：Prisma + SQLite 持久化
8. `mcp-xiaohongshu`：小红书 MCP 客户端封装

这套拆分思路目前仍然有效，说明项目的总体模块边界没有偏掉。

## 当前和初始化阶段的差异

原始版本里曾把很多模块写成“待创建”或“0%”，但按当前仓库代码看：

1. 上述模块都已经真实存在，不再是纯计划项
2. `database` 与 `mcp-xiaohongshu` 也已经进入主代码路径
3. Web 会话管理、小红书同步、同步看板等能力都已经落地

因此，这份文档不再适合继续承担“项目进度表”的职责。

## 建议替代阅读路径

如果现在要了解项目，而不是回顾初始化背景，建议按下面顺序阅读：

1. [0318.md](/Users/sxh/Code/project/civil_agent/0318.md)
2. [README.md](/Users/sxh/Code/project/civil_agent/README.md)
3. [STARTUP_GUIDE.md](/Users/sxh/Code/project/civil_agent/STARTUP_GUIDE.md)
4. 各包下的 `SKILL.md`

## 当前保留本文件的原因

保留这份文件仍然有价值，因为它能说明：

1. 项目最初的模块划分是怎么来的
2. 为什么仓库会是今天这样的包结构
3. 哪些“计划中的目标”后来已经被真实实现

但如果需要判断：

- 现在有哪些功能可用
- 哪些任务已经完成
- 下一步还要做什么

请不要再以本文件作为唯一依据。
