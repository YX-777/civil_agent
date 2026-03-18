# 小红书内容抓取 - 快速开始指南

## 概述

本项目已经成功集成了小红书 MCP 服务，使用 LangChain MCP 适配器实现内容抓取功能。

## 前置条件

1. **启动 xiaohongshu-mcp 服务**
   ```bash
   # 在 xiaohongshu-mcp-bin 目录下
   ./xiaohongshu-mcp-darwin-arm64
   ```

2. **确认服务正常运行**
   - 默认端口：18060
   - MCP 端点：`http://localhost:18060/mcp`

## 项目结构

```
packages/
├── mcp-xiaohongshu/          # 小红书 MCP 客户端包
│   ├── src/
│   │   ├── config/
│   │   │   └── xiaohongshu.config.ts
│   │   ├── client/
│   │   │   └── xiaohongshu-client.ts
│   │   ├── tools/
│   │   │   └── xiaohongshu-tools.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── SKILL.md
└── agent-langgraph/
    ├── src/
    │   ├── tools/
    │   │   └── xiaohongshu-tools.ts    # 小红书工具集成
    │   └── config/
    │       └── agent.config.ts             # 已添加小红书配置
    └── package.json                       # 已添加依赖
```

## 可用功能

### 1. 搜索小红书内容
```typescript
import { getXiaohongshuMCPClient } from '@civil-agent/mcp-xiaohongshu';

const client = getXiaohongshuMCPClient();
const result = await client.searchFeeds('考公经验', {
  sort_by: '最多点赞',
  note_type: '图文',
  publish_time: '一周内'
});
```

### 2. 获取推荐列表
```typescript
const client = getXiaohongshuMCPClient();
const result = await client.listFeeds(1);
```

### 3. 获取帖子详情
```typescript
const client = getXiaohongshuMCPClient();
const result = await client.getFeedDetail(
  'feed_id',
  'xsec_token',
  {
    load_all_comments: true,
    limit: 20
  }
);
```

### 4. 获取用户主页
```typescript
const client = getXiaohongshuMCPClient();
const result = await client.getUserProfile('user_id', 'xsec_token');
```

### 5. 检查登录状态
```typescript
const client = getXiaohongshuMCPClient();
const result = await client.checkLoginStatus();
```

## 与 LangChain 集成

### 基本使用

```typescript
import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  },
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "xiaohongshu-mcp": {
      "url": "http://localhost:18060/mcp",
      "description": "小红书内容发布服务 - MCP Streamable HTTP"
    }
  }
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage("你是一个智能助手，可以帮助用户搜索和获取小红书的内容。"),
    new HumanMessage(query)
  ];

  for (let i = 0; i < maxIterations; i++) {
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
      return response.content;
    }

    console.log(`🔍 检测到 ${response.tool_calls.length} 个工具调用`);

    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find(t => t.name === toolCall.name);
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args);
        messages.push(new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id,
        }));
      }
    }
  }

  return messages[messages.length - 1].content;
}

await runAgentWithTools("搜索小红书上关于考公经验的内容");
await mcpClient.close();
```

## 配置说明

### 环境变量

在 `packages/agent-langgraph/.env` 文件中配置：

```bash
# 小红书 MCP 服务地址
XIAOHONGSHU_MCP_URL=http://localhost:18060/mcp

# 小红书 MCP 服务超时时间（毫秒）
XIAOHONGSHU_MCP_TIMEOUT=30000

# 是否启用小红书功能（可选）
XIAOHONGSHU_ENABLED=true
```

### 配置文件

在 `packages/agent-langgraph/src/config/agent.config.ts` 中：

```typescript
export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  mcp: {
    bailianRagUrl: process.env.MCP_BAILIAN_RAG_URL || "http://localhost:3002",
    feishuTasksUrl: process.env.MCP_FEISHU_TASKS_URL,
    xiaohongshuUrl: process.env.XIAOHONGSHU_MCP_URL || "http://localhost:18060/mcp",
  },
  features: {
    ragEnabled: true,
    emotionDetectionEnabled: true,
    contextEnhancementEnabled: true,
    quickRepliesEnabled: true,
    xiaohongshuEnabled: true,
  },
  // ... 其他配置
};
```

## 测试

### 运行测试脚本

```bash
# 在 mcp-xiaohongshu 目录下
node test.mjs
```

### 测试内容

测试脚本会依次执行以下测试：

1. ✅ 检查登录状态
2. ✅ 获取推荐列表
3. ✅ 搜索内容

## 注意事项

1. **登录状态**
   - 必须先使用 `xiaohongshu-login` 工具完成登录
   - 登录状态会保存在 MCP 服务中

2. **Token 获取**
   - `feed_id` 和 `xsec_token` 可以从搜索结果或推荐列表中获取
   - `user_id` 和 `xsec_token` 可以从帖子详情或搜索结果中获取

3. **性能考虑**
   - 获取帖子详情时，如果不需要全部评论，建议使用默认设置
   - 大量评论加载可能需要较长时间

4. **服务可用性**
   - 确保 xiaohongshu-mcp 服务正在运行
   - 检查网络连接和防火墙设置

## 故障排除

### 连接失败

如果无法连接到 MCP 服务：

1. 检查 xiaohongshu-mcp 服务是否正在运行
2. 确认服务地址配置正确（`XIAOHONGSHU_MCP_URL`）
3. 检查端口是否被占用或被防火墙阻止

### 工具调用失败

如果工具调用失败：

1. 确认已正确登录
2. 检查参数是否正确（特别是 `xsec_token`）
3. 查看服务日志获取详细错误信息

### 依赖安装问题

如果遇到依赖安装问题：

```bash
# 在项目根目录下
npm install

# 或单独安装小红书 MCP 包
npm install @langchain/mcp-adapters
```

## 参考文档

- [小红书 MCP 服务文档](https://github.com/xpzouying/xiaohongshu-mcp)
- [LangChain MCP 适配器文档](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain_mcp_adapters)
- [小红书 API 文档](https://open.xiaohongshu.com/)
