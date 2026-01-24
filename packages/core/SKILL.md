---
name: core-library
description: Core library providing TypeScript type definitions, logging utilities, error handling, prompt templates, and configuration constants for the civil service agent project. Foundation module that all other packages depend on. Use when accessing shared types, logging, or configuration.
metadata:
  category: foundation
  version: 1.0.0
  priority: P0
  estimated-days: 2
  triggers: "type definition, logging, error handling, prompts, config"
  dependencies: []
  dependents: ["mcp-bailian-rag", "mcp-feishu-tasks", "agent-langgraph", "scheduler", "web"]
allowed-tools: Read Write Edit
---

# 核心包 (core) 技能文档

**模块类型**: 核心库
**开发状态**: ✅ 已完成
**优先级**: P0
**预计周期**: 2 天

---

## 📖 模块概述

核心包提供考公 Agent 项目的基础设施，包括：
- **类型定义**：Agent、RAG、MCP 相关的 TypeScript 类型
- **工具函数**：日志、错误处理等通用工具
- **常量定义**：提示词模板、配置常量等

所有其他模块都依赖此包，确保项目类型一致性和代码复用。

---

## 🎯 核心功能

### 功能1: 类型定义系统

**功能描述**: 提供完整的 TypeScript 类型定义，确保项目类型安全。

**包含类型**:
- `agent.ts`: Agent 状态、配置、意图类型
- `rag.ts`: RAG 检索、学习记录、经验文档类型
- `mcp.ts`: MCP 工具、飞书任务类型
- `index.ts`: 通用类型（分页、响应等）

**使用示例**:
```typescript
import type { GraphStateType, UserIntent } from "@civil-agent/core";

const state: GraphStateType = {
  userId: "user-123",
  messages: [],
  waitingForUserInput: false,
  quickReplyOptions: [],
  ragResults: [],
  feishuTaskIds: [],
};

const intent: UserIntent = "create_task";
```

---

### 功能2: 日志工具

**功能描述**: 提供分级日志记录功能。

**支持级别**: DEBUG、INFO、WARN、ERROR

**API 示例**:
```typescript
import { logger, LogLevel } from "@civil-agent/core";

// 设置日志级别
logger.setLevel(LogLevel.DEBUG);

// 记录日志
logger.debug("调试信息", { data: "value" });
logger.info("普通信息");
logger.warn("警告信息");
logger.error("错误信息", new Error("something went wrong"));
```

**环境变量配置**:
```bash
LOG_LEVEL=DEBUG  # 设置日志级别
```

---

### 功能3: 错误处理工具

**功能描述**: 提供统一的错误类型和错误处理装饰器。

**错误类型**:
- `CivilAgentError`: 基础错误类
- `MCPToolError`: MCP 工具调用错误
- `RAGRetrievalError`: RAG 检索错误
- `AgentExecutionError`: Agent 执行错误

**使用示例**:
```typescript
import {
  MCPToolError,
  handleErrors
} from "@civil-agent/core";

class MyService {
  @handleErrors(MCPToolError, "调用 MCP 工具")
  async callMCPTool(toolName: string, params: any) {
    // 业务逻辑
    // 如果抛出错误，会被自动包装成 MCPToolError
  }
}
```

---

### 功能4: 提示词模板

**功能描述**: 提供系统提示词和用户提示词模板。

**包含模板**:
- 系统提示词：默认、早安问候、晚间复盘、情感支持、任务规划、意图识别
- 用户提示词：RAG 检索、任务确认
- LangGraph 提示词：各节点专用提示词

**使用示例**:
```typescript
import { SYSTEM_PROMPTS } from "@civil-agent/core";

const systemPrompt = SYSTEM_PROMPTS.MORNING_GREETING;
const response = await llm.invoke([
  new SystemMessage(systemPrompt),
  new HumanMessage("早上好")
]);
```

---

### 功能5: 配置常量

**功能描述**: 提供项目配置常量和枚举。

**包含常量**:
- 学习模块：资料分析、数量关系、言语理解等
- 题目难度：easy、medium、hard
- 情绪关键词：焦虑、挫败、积极
- 默认配置：RAG、任务、学习目标
- API 端点
- 环境变量名称

**使用示例**:
```typescript
import {
  LEARNING_MODULES,
  DEFAULT_CONFIG,
  ENV_VAR_NAMES
} from "@civil-agent/core";

// 获取所有学习模块
const modules = LEARNING_MODULES; // ["资料分析", "数量关系", ...]

// 获取默认配置
const topK = DEFAULT_CONFIG.rag.topK; // 3

// 获取环境变量名称
const apiKey = process.env[ENV_VAR_NAMES.ANTHROPIC_API_KEY];
```

---

## 🔧 技术实现

### 技术栈

- TypeScript 5.3: 类型系统
- Node.js 18+: 运行环境

### 代码结构

```
src/
├── types/              # 类型定义
│   ├── index.ts        # 通用类型
│   ├── agent.ts        # Agent 类型
│   ├── rag.ts          # RAG 类型
│   └── mcp.ts          # MCP 类型
├── utils/              # 工具函数
│   ├── logger.ts       # 日志工具
│   └── error.ts        # 错误处理
├── constants/          # 常量定义
│   ├── prompts.ts      # 提示词模板
│   └── config.ts       # 配置常量
└── index.ts            # 入口文件
```

---

## 🔌 接口定义

该模块不提供 HTTP/MCP 接口，仅作为库被其他模块引用。

### 导出内容

| 导出名称 | 类型 | 说明 |
|---------|------|------|
| 类型 | TypeScript Type | 所有类型定义 |
| logger | Class | 日志工具实例 |
| LogLevel | Enum | 日志级别枚举 |
| 错误类 | Class | 各种错误类型 |
| handleErrors | Decorator | 错误处理装饰器 |
| 提示词 | Constant | 各种提示词模板 |
| 配置常量 | Constant | 配置和枚举 |

---

## 📝 依赖关系

### 依赖的模块

无（核心包不依赖任何项目内模块）

### 外部依赖

- @types/node: Node.js 类型定义

### 被依赖的模块

- `@civil-agent/mcp-bailian-rag`: 使用类型定义
- `@civil-agent/mcp-feishu-tasks`: 使用类型定义
- `@civil-agent/agent-langgraph`: 使用类型、提示词、工具
- `@civil-agent/scheduler`: 使用类型、配置
- `@civil-agent/web`: 使用类型、常量

---

## 🚀 开发指南

### 本地开发

```bash
# 进入核心包目录
cd packages/core

# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm type-check

# 代码检查
pnpm lint
```

### 添加新类型

1. 在 `src/types/` 下的相应文件中添加类型定义
2. 在 `src/index.ts` 中导出
3. 运行 `pnpm type-check` 确保无错误

### 添加新提示词

1. 在 `src/constants/prompts.ts` 中添加常量
2. 在 `src/index.ts` 中导出
3. 确保提示词格式正确（使用模板字符串 `{variable}`）

---

## 📋 待办事项

- [x] 定义共享类型 (0.5天)
- [x] 实现日志工具 (0.5天)
- [x] 实现错误处理 (0.5天)
- [x] 定义提示词模板 (0.5天)

---

## 📚 使用示例

### 完整示例

```typescript
import {
  logger,
  MCPToolError,
  handleErrors,
  SYSTEM_PROMPTS,
  DEFAULT_CONFIG,
  type GraphStateType,
  type UserIntent
} from "@civil-agent/core";

class MyAgent {
  private state: GraphStateType;

  constructor() {
    this.state = {
      userId: "user-123",
      messages: [],
      waitingForUserInput: false,
      quickReplyOptions: [],
      ragResults: [],
      feishuTaskIds: [],
    };

    logger.info("Agent initialized");
  }

  @handleErrors(MCPToolError, "执行 MCP 工具")
  async executeTool(toolName: string, params: any) {
    logger.debug(`Executing tool: ${toolName}`, params);

    // 业务逻辑
    const result = await this.callMCP(toolName, params);

    logger.info(`Tool executed successfully: ${toolName}`);
    return result;
  }

  private async callMCP(toolName: string, params: any) {
    // MCP 调用实现
  }
}
```

---

## 🎓 最佳实践

1. **类型优先**: 始终使用 `@civil-agent/core` 导出的类型，确保类型一致性
2. **日志规范**: 使用合适的日志级别，避免生产环境输出过多 DEBUG 日志
3. **错误处理**: 使用 `@handleErrors` 装饰器统一处理错误
4. **提示词管理**: 所有提示词应在 `prompts.ts` 中定义，便于维护
5. **常量使用**: 优先使用 `DEFAULT_CONFIG` 中的默认值，而非硬编码

---

**文档版本**: v1.0
**最后更新**: 2025-01-23
**维护者**: sxh
