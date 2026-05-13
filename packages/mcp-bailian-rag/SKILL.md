---
name: bailian-rag-mcp
description: Alibaba Cloud Bailian RAG MCP server providing knowledge base retrieval for user learning history and exam experience. Implements MCP protocol with hybrid BM25+vector search achieving 90%+ recall accuracy. Use when searching knowledge base, retrieving exam prep experience, or uploading documents.
metadata:
  category: mcp-server
  version: 1.0.0
  priority: P0
  estimated-days: 2
  triggers: "search knowledge, retrieve experience, RAG, 百炼检索, 知识库搜索"
  dependencies: ["core"]
  dependents: ["agent-langgraph"]
allowed-tools: Read Write Edit Bash(pnpm:*:)
---

# 百炼 RAG MCP 服务器技能文档

**模块类型**: MCP服务器
**开发状态**: ✅ 已完成
**优先级**: P0
**预计周期**: 2 天

---

## 📖 模块概述

百炼 RAG MCP 服务器提供知识库检索功能，基于阿里云百炼知识库实现 RAG（检索增强生成）。

**核心功能**:
- 搜索用户学习历史
- 检索学习经验
- 上传文档到知识库

**技术特点**:
- MCP 协议：标准化工具接口
- 阿里云百炼：90%+ 召回准确率
- 混合检索：BM25 + 向量搜索

---

## 🎯 核心功能

### 功能1: 搜索知识库

**功能描述**: 搜索用户学习历史和学习经验。

**MCP 工具名称**: `search_knowledge`

**参数**:
```json
{
  "query": "学习数量关系怎么提高",
  "category": "all",  // "user_history" | "exam_experience" | "all"
  "topK": 3
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "content": "数量关系是学习的重点模块...",
        "metadata": {
          "source": "知乎",
          "category": "exam_experience",
          "score": 0.95
        }
      }
    ],
    "count": 3
  }
}
```

---

### 功能2: 上传文档

**功能描述**: 上传文档到百炼知识库。

**MCP 工具名称**: `upload_document`

**参数**:
```json
{
  "filePath": "/path/to/document.pdf",
  "category": "exam_experience",
  "metadata": {
    "tags": ["学习", "数量关系"],
    "author": "知乎用户"
  }
}
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "message": "文档上传成功",
    "documentId": "doc-123"
  }
}
```

---

## 🔧 技术实现

### 技术栈

- @modelcontextprotocol/sdk: MCP SDK
- axios: HTTP 客户端
- @tech-mate/core: 核心类型和工具

### 代码结构

```
src/
├── config/
│   └── bailian.config.ts    # 百炼配置
├── retrievers/
│   ├── base-retriever.ts    # 检索器基类
│   ├── user-history-retriever.ts     # 用户历史检索器
│   └── exam-experience-retriever.ts  # 学习经验检索器
├── tools/
│   ├── search-knowledge.ts  # 搜索工具
│   └── upload-document.ts   # 上传工具
├── server.ts                # MCP 服务器
└── index.ts                 # 入口文件
```

### 检索器设计

**BaseRetriever**:
- `retrieve()`: 抽象检索方法
- `filterByScore()`: 过滤低分结果
- `deduplicate()`: 去重

**UserHistoryRetriever**:
- 检索用户学习历史记录
- 支持按时间、模块过滤

**ExamExperienceRetriever**:
- 检索学习经验文档
- 支持按类别（前端/进阶/工程化）过滤

---

## 🔌 MCP 接口定义

### 工具列表

| 工具名称 | 描述 | 参数 | 返回值 |
|---------|------|------|--------|
| search_knowledge | 搜索知识库 | query, category, topK | 检索结果数组 |
| upload_document | 上传文档 | filePath, category, metadata | 上传结果 |

### 服务器信息

```json
{
  "name": "@tech-mate/mcp-bailian-rag",
  "version": "1.0.0",
  "description": "阿里云百炼 RAG MCP 服务器"
}
```

---

## 📝 依赖关系

### 依赖的模块

- `@tech-mate/core`: 类型定义、日志工具

### 被依赖的模块

- `@tech-mate/agent-langgraph`: Agent 调用搜索工具

---

## 🚀 开发指南

### 本地开发

```bash
# 进入目录
cd packages/mcp-bailian-rag

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 启动服务器
pnpm start

# 初始化知识库
pnpm init-kb
```

### 环境变量配置

```bash
# .env 文件
BAILIAN_API_KEY=your_api_key
BAILIAN_KNOWLEDGE_BASE_ID=your_kb_id
BAILIAN_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1
BAILIAN_DEFAULT_TOP_K=3
BAILIAN_MIN_SCORE=0.6
```

### Claude Desktop 配置

在 `~/.config/Claude/claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "bailian-rag": {
      "command": "node",
      "args": ["/path/to/civil-service-agent/packages/mcp-bailian-rag/dist/index.js"],
      "env": {
        "BAILIAN_API_KEY": "your_api_key",
        "BAILIAN_KNOWLEDGE_BASE_ID": "your_kb_id"
      }
    }
  }
}
```

---

## 📋 待办事项

- [x] 搭建 MCP 服务器框架 (0.5天)
- [x] 实现百炼搜索工具 (0.5天)
- [x] 实现用户历史检索器 (0.5天)
- [x] 实现学习经验检索器 (0.5天)

---

## 📚 使用示例

### Agent 调用示例

```typescript
import { SearchKnowledgeTool } from "@tech-mate/mcp-bailian-rag";

const tool = new SearchKnowledgeTool();

// 搜索学习经验
const result = await tool.execute({
  query: "学习数量关系怎么提高",
  category: "exam_experience",
  topK: 3
});

if (result.success) {
  console.log("检索到", result.data.count, "条结果");
  result.data.results.forEach((r, i) => {
    console.log(`\n结果 ${i + 1}:`);
    console.log("内容:", r.content);
    console.log("分数:", r.metadata.score);
  });
}
```

### LangGraph 集成示例

```typescript
import { DynamicTool } from "@langchain/core/tools";
import axios from "axios";

const bailianRAGTool = new DynamicTool({
  name: "bailian_rag_search",
  description: "检索技术学习经验和用户学习历史",
  func: async (input: string) => {
    const params = JSON.parse(input);
    const response = await axios.post(
      "http://localhost:3000/api/mcp/bailian/search",
      params
    );
    return JSON.stringify(response.data);
  }
});
```

---

## 🎓 最佳实践

1. **查询优化**: 使用具体的查询词，避免过于宽泛
2. **结果过滤**: 根据分数过滤低质量结果
3. **去重**: 相同内容只保留最高分的结果
4. **错误处理**: 捕获检索失败，提供友好的错误信息
5. **缓存策略**: 对相同查询缓存结果，减少 API 调用

---

## 🔍 调试技巧

### 查看日志

```bash
# 设置日志级别
LOG_LEVEL=DEBUG pnpm start
```

### 测试检索

```bash
# 使用 curl 测试
curl -X POST http://localhost:3000/api/mcp/bailian/search \
  -H "Content-Type: application/json" \
  -d '{"query":"学习学习","topK":3}'
```

### LangSmith 跟踪

```bash
# 设置环境变量
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_key
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-23
**维护者**: sxh
