# 项目启动指南

> 状态说明（2026-03-26）：
> 本文档描述的是当前仓库推荐启动方式。若与更早的规划文档冲突，请以本文件和 `PROJECT_STATUS.md` 为准。
>
> 快速启动命令详见 [README.md](README.md)。本文档提供配置、手动启动、故障排查与 API 参考。

## 🔧 手动启动

如果需要单独启动某个服务：

### 启动 MCP HTTP 服务

```bash
cd packages/mcp-bailian-rag
npm run start:http
```

### 启动 Web 服务

```bash
pnpm --filter @civil-agent/web dev
```

---

## 📝 配置说明

### Web 服务配置

配置文件：`packages/web/.env`

```bash
# 阿里云千问 API Key
DASHSCOPE_API_KEY=your_dashscope_api_key

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
BAILIAN_API_KEY=your_bailian_api_key
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

当前推荐直接查看脚本输出的日志文件：

```bash
# 查看特定服务的日志
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

### 前端页面能打开但静态资源 404

如果出现 `/_next/static/*` 404 或 `vendor-chunks` 资源报错：

```bash
./stop-all.sh
rm -rf packages/web/.next
./start-all.sh
```

这通常是 Next 开发态缓存错乱，不一定是业务代码问题。

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

当前主链路以流式响应为主，实际前端通过 SSE 消费回复，不应再按旧版一次性 JSON 返回结构理解。

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

如需查看当前真实开发进展，请同步参考 `PROJECT_STATUS.md`。
