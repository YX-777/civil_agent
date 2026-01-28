# 项目启动指南

## 🚀 快速启动

### 一键启动所有服务

```bash
./start-all.sh
```

这将自动启动：
- **MCP HTTP 服务** (端口 3002) - 提供知识库检索功能
- **Web 服务** (端口 3000) - 提供前端界面和 Agent API

### 停止所有服务

```bash
./stop-all.sh
```

---

## 🧪 测试服务

运行完整的联调测试：

```bash
./test-all.sh
```

测试内容包括：
1. MCP 服务健康检查
2. MCP 搜索 API
3. Web 服务
4. Agent API

---

## 📋 服务列表

| 服务 | 端口 | URL | 说明 |
|------|------|-----|------|
| Web 服务 | 3000 | http://localhost:3000 | 前端界面和 Agent API |
| MCP 服务 | 3002 | http://localhost:3002 | 知识库检索服务 |
| 健康检查 | 3002 | http://localhost:3002/health | MCP 服务健康检查 |

---

## 🔧 手动启动

如果需要单独启动某个服务：

### 启动 MCP HTTP 服务

```bash
cd packages/mcp-bailian-rag
npm run start:http
```

### 启动 Web 服务

```bash
pnpm dev
```

---

## 📝 配置说明

### Web 服务配置

配置文件：`packages/web/.env`

```bash
# 阿里云千问 API Key
DASHSCOPE_API_KEY=sk-2b9b8a96b1af4c7196a713d768b4d468

# LangSmith Tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
LANGCHAIN_PROJECT=civil-service-agent

# MCP 服务配置
MCP_BAILIAN_RAG_URL=http://localhost:3002
```

### MCP 服务配置

配置文件：`packages/mcp-bailian-rag/.env`

```bash
# 阿里云百炼 API
BAILIAN_API_KEY=sk-2b9b8a96b1af4c7196a713d768b4d468
BAILIAN_KNOWLEDGE_BASE_ID=fgweq786jm
BAILIAN_API_ENDPOINT=https://dashscope.aliyuncs.com/api/v1

# 检索配置
BAILIAN_DEFAULT_TOP_K=3
BAILIAN_MIN_SCORE=0.6
```

---

## 🎯 使用指南

### 1. 访问前端界面

在浏览器中打开：http://localhost:3000

### 2. 测试对话功能

在聊天界面输入消息，系统会：
1. 识别用户意图
2. 根据意图选择合适的处理节点
3. 调用相应的工具（如知识库检索）
4. 生成回复

### 3. 查看日志

服务运行时，日志会直接输出到终端。如果需要查看详细日志：

```bash
# 查看实时日志
./start-all.sh

# 查看特定服务的日志（需要修改脚本输出到文件）
tail -f /tmp/mcp-service.log
tail -f /tmp/web-service.log
```

---

## 🐛 故障排查

### 端口被占用

如果启动时提示端口被占用：

```bash
# 查看占用端口的进程
lsof -i:3000
lsof -i:3002

# 停止占用端口的进程
lsof -ti:3000 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### 服务启动失败

1. 检查依赖是否安装：

```bash
pnpm install
```

2. 检查配置文件是否正确：

```bash
cat packages/web/.env
cat packages/mcp-bailian-rag/.env
```

3. 查看错误日志：

```bash
# 重新启动并查看详细日志
./start-all.sh
```

### MCP 服务返回 404

这是正常的，因为知识库可能还没有配置数据。系统会自动降级，不使用 RAG 功能，直接使用 LLM 生成回复。

---

## 📚 API 文档

### Agent API

**端点：** `POST /api/agent/chat`

**请求体：**

```json
{
  "userId": "user-123",
  "message": "你好"
}
```

**响应：**

```json
{
  "content": "AI 回复内容",
  "quickReplies": [
    {
      "text": "快速回复选项",
      "intent": "general_qa"
    }
  ]
}
```

### MCP API

**健康检查：** `GET /health`

**搜索知识库：** `POST /api/tools/search_knowledge`

```json
{
  "query": "搜索关键词",
  "category": "user_history",
  "topK": 3
}
```

---

## 🎉 完成

现在你可以：

1. ✅ 在浏览器中访问 http://localhost:3000
2. ✅ 测试 AI 助手对话功能
3. ✅ 查看各种功能模块（任务管理、学习日历等）
4. ✅ 体验完整的公务员考试备考助手

祝你使用愉快！🚀