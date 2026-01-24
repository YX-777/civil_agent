---
name: feishu-tasks-mcp
description: Feishu (Lark) Task MCP server providing enterprise-level task management with auto-subtask breakdown. Integrates with Feishu Open Platform API for creating, querying, updating, and completing study tasks. Use when managing learning schedules, tracking progress, or syncing with Feishu tasks.
metadata:
  category: mcp-server
  version: 1.0.0
  priority: P0
  estimated-days: 2
  triggers: "create task, manage tasks, Feishu, 飞书任务, 任务管理"
  dependencies: ["core"]
  dependents: ["agent-langgraph"]
allowed-tools: Read Write Edit Bash(pnpm:*:)
---

# 飞书任务 MCP 服务器技能文档

**模块类型**: MCP服务器
**开发状态**: ✅ 已完成
**优先级**: P0
**预计周期**: 2 天

---

## 📖 模块概述

飞书任务 MCP 服务器提供企业级任务管理功能，基于飞书开放平台 API 实现智能学习任务管理。

**核心功能**:
- 创建学习任务
- 查询任务进度
- 更新任务状态
- 完成任务打卡

**技术特点**:
- MCP 协议：标准化工具接口
- 飞书开放平台：企业级 SaaS 集成
- 自动任务分解：支持子任务自动生成

---

## 🎯 核心功能

### 功能1: 创建学习任务

**功能描述**: 创建飞书学习任务，支持自动分解子任务。

**MCP 工具名称**: `create_feishu_task`

**参数**:
```json
{
  "module": "资料分析",
  "type": "练习",
  "quantity": 50,
  "difficulty": "medium",
  "dueDays": 7,
  "priority": "high",
  "autoBreakdown": true
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456789",
    "taskUrl": "https://.feishu.cn/task/task_123456789",
    "summary": {
      "totalTasks": 5,
      "subtasks": [
        {
          "title": "资料分析 - 基础题型 10题",
          "dueDate": "2025-01-24"
        },
        {
          "title": "资料分析 - 进阶题型 10题",
          "dueDate": "2025-01-25"
        }
      ]
    }
  }
}
```

---

### 功能2: 查询任务进度

**功能描述**: 查询用户在飞书中的任务完成情况。

**MCP 工具名称**: `query_feishu_tasks`

**参数**:
```json
{
  "dateRange": "week",  // "today" | "week" | "month" | "all"
  "status": "all",      // "all" | "in_progress" | "completed"
  "module": "all"       // "all" | "资料分析" | "数量关系" ...
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "completed": 6,
    "inProgress": 4,
    "tasks": [
      {
        "id": "task_123",
        "title": "资料分析50题",
        "status": "in_progress",
        "progress": 60,
        "dueDate": "2025-01-30"
      }
    ]
  }
}
```

---

### 功能3: 更新任务状态

**功能描述**: 更新飞书任务的进度和状态。

**MCP 工具名称**: `update_feishu_task`

**参数**:
```json
{
  "taskId": "task_123456789",
  "status": "in_progress",
  "progress": 50,
  "note": "已完成基础题型，正在攻克进阶题型"
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "message": "任务更新成功",
    "taskId": "task_123456789"
  }
}
```

---

### 功能4: 完成任务打卡

**功能描述**: 标记任务为已完成，并记录学习数据。

**MCP 工具名称**: `complete_feishu_task`

**参数**:
```json
{
  "taskId": "task_123456789",
  "actualHours": 2.5,
  "questionsCompleted": 50,
  "accuracy": 0.82,
  "reflection": "今天学习效果很好，重点掌握了混合增长率问题"
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "message": "恭喜！任务已完成",
    "taskId": "task_123456789",
    "completionRecord": {
      "date": "2025-01-23",
      "duration": "2.5小时",
      "accuracy": "82%"
    }
  }
}
```

---

## 🔧 技术实现

### 技术栈

- @modelcontextprotocol/sdk: MCP SDK
- axios: HTTP 客户端
- @civil-agent/core: 核心类型和工具

### 代码结构

```
src/
├── config/
│   └── feishu.config.ts       # 飞书配置
├── client/
│   ├── feishu-client.ts       # 飞书 API 客户端
│   └── task-manager.ts        # 任务管理器
├── tools/
│   ├── create-task.ts         # 创建任务工具
│   ├── query-tasks.ts         # 查询任务工具
│   ├── update-task.ts         # 更新任务工具
│   └── complete-task.ts       # 完成任务工具
├── server.ts                  # MCP 服务器
└── index.ts                   # 入口文件
```

### 飞书 API 客户端

**FeishuClient**:
- `createTask()`: 创建任务
- `getTask()`: 获取任务详情
- `updateTask()`: 更新任务
- `listTasks()`: 列出任务
- `completeTask()`: 完成任务

**TaskManager**:
- `breakdownTask()`: 自动分解任务
- `calculateDueDate()`: 计算截止日期
- `assignPriority()`: 分配优先级
- `generateSubtasks()`: 生成子任务

---

## 🔌 MCP 接口定义

### 工具列表

| 工具名称 | 描述 | 参数 | 返回值 |
|---------|------|------|--------|
| create_feishu_task | 创建学习任务 | module, type, quantity, difficulty, dueDays, priority | 任务信息 |
| query_feishu_tasks | 查询任务进度 | dateRange, status, module | 任务列表 |
| update_feishu_task | 更新任务状态 | taskId, status, progress, note | 更新结果 |
| complete_feishu_task | 完成任务打卡 | taskId, actualHours, questionsCompleted, accuracy | 完成记录 |

### 服务器信息

```json
{
  "name": "@civil-agent/mcp-feishu-tasks",
  "version": "1.0.0",
  "description": "飞书任务 MCP 服务器 - 智能学习任务管理"
}
```

---

## 📝 依赖关系

### 依赖的模块

- `@civil-agent/core`: 类型定义、日志工具

### 被依赖的模块

- `@civil-agent/agent-langgraph`: Agent 调用任务管理工具

---

## 🚀 开发指南

### 本地开发

```bash
# 进入目录
cd packages/mcp-feishu-tasks

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 启动服务器
pnpm start
```

### 环境变量配置

```bash
# .env 文件
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_TENANT_ACCESS_TOKEN_ENDPOINT=https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
FEISHU_API_BASE_URL=https://open.feishu.cn/open-apis/task/v1
FEISHU_DEFAULT_TASK_LIST_ID=your_task_list_id
```

### Claude Desktop 配置

在 `~/.config/Claude/claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "feishu-tasks": {
      "command": "node",
      "args": ["/path/to/civil-service-agent/packages/mcp-feishu-tasks/dist/index.js"],
      "env": {
        "FEISHU_APP_ID": "your_app_id",
        "FEISHU_APP_SECRET": "your_app_secret"
      }
    }
  }
}
```

---

## 📋 待办事项

- [x] 搭建飞书 API 客户端 (0.5天)
- [x] 实现创建任务工具 (0.5天)
- [x] 实现查询任务工具 (0.5天)
- [x] 实现更新任务工具 (0.5天)

---

## 📚 使用示例

### Agent 调用示例

```typescript
import { CreateFeishuTaskTool } from "@civil-agent/mcp-feishu-tasks";

const tool = new CreateFeishuTaskTool();

// 创建学习任务
const result = await tool.execute({
  module: "资料分析",
  type: "练习",
  quantity: 50,
  difficulty: "medium",
  dueDays: 7,
  priority: "high",
  autoBreakdown: true
});

if (result.success) {
  console.log("任务创建成功！");
  console.log("任务链接:", result.data.taskUrl);
  console.log("子任务数:", result.data.summary.totalTasks);
}
```

### LangGraph 集成示例

```typescript
import { DynamicTool } from "@langchain/core/tools";

const createTaskTool = new DynamicTool({
  name: "create_feishu_task",
  description: "创建飞书学习任务，支持自动分解子任务",
  func: async (input: string) => {
    const params = JSON.parse(input);
    const response = await axios.post(
      "http://localhost:3001/api/mcp/feishu/create",
      params
    );
    return JSON.stringify(response.data);
  }
});
```

---

## 🎓 最佳实践

1. **任务分解**: 启用 `autoBreakdown` 自动分解大任务
2. **优先级管理**: 根据考试时间动态调整任务优先级
3. **进度跟踪**: 定期调用 `query_feishu_tasks` 更新进度
4. **学习记录**: 完成任务时记录详细的学习数据
5. **错误处理**: 捕获飞书 API 错误，提供友好提示

---

## 🔍 调试技巧

### 测试飞书 API

```bash
# 获取 tenant_access_token
curl -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
  -H "Content-Type: application/json" \
  -d '{"app_id":"your_app_id","app_secret":"your_app_secret"}'
```

### 查看日志

```bash
# 设置日志级别
LOG_LEVEL=DEBUG pnpm start
```

### 验证任务创建

1. 登录飞书
2. 进入任务列表
3. 查看新创建的任务
4. 确认子任务生成正确

---

## 📊 任务分解策略

### 自动分解规则

**根据数量分解**:
- 1-20题: 不分解
- 21-50题: 分解为 3 个子任务
- 51-100题: 分解为 5 个子任务
- 100+题: 分解为 10 个子任务

**根据难度调整**:
- Easy: 每日题数增加 20%
- Hard: 每日题数减少 20%

**根据截止日期平衡**:
- 截止日期 < 3天: 每日题数增加 30%
- 截止日期 > 7天: 每日题数减少 20%

---

**文档版本**: v1.0
**最后更新**: 2025-01-23
**维护者**: sxh
