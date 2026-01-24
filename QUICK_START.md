# 🚀 考公 Agent 快速开始指南

欢迎来到考公 Agent 项目！这是一个基于 AI 的备考陪伴系统，使用 LangGraph、阿里云百炼、飞书任务等技术栈。

## 📋 前置要求

- Node.js 18+
- pnpm 8+
- Git
- Anthropic API Key（用于 Claude）
- 阿里云百炼 API Key
- 飞书开放平台账号

## 🛠️ 安装步骤

### 1. 安装依赖

```bash
# 克隆项目（如果从 Git 仓库）
git clone https://github.com/your-username/civil-service-agent.git
cd civil-service-agent

# 安装所有依赖
pnpm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 API Keys
```

**必需的环境变量**：

```bash
# Anthropic API（Claude）
ANTHROPIC_API_KEY=your_anthropic_api_key

# 阿里云百炼
BAILIAN_API_KEY=your_bailian_api_key
BAILIAN_KNOWLEDGE_BASE_ID=your_kb_id

# 飞书开放平台
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret

# LangSmith（可选，用于调试）
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
```

### 3. 初始化知识库

```bash
# 上传备考经验文档到百炼知识库
pnpm --filter @civil-agent/mcp-bailian-rag init-kb
```

### 4. 启动开发服务器

```bash
# 启动 Web 应用
pnpm dev

# 访问 http://localhost:3000
```

## 📚 项目结构

```
civil-service-agent/
├── packages/
│   ├── core/                    # 核心库（类型、工具、常量）
│   ├── mcp-bailian-rag/         # 百炼 RAG MCP 服务器
│   ├── mcp-feishu-tasks/        # 飞书任务 MCP 服务器
│   ├── agent-langgraph/         # LangGraph Agent 引擎
│   ├── scheduler/               # 定时任务调度器
│   └── web/                     # Next.js Web 应用
├── docs/                        # 文档
├── data/                        # 数据文件
└── scripts/                     # 脚本
```

## 🎯 核心功能

### 1. 对话系统
- 多轮对话管理（LangGraph）
- 意图识别
- 快捷回复
- 情感上下文记忆

### 2. 智能任务管理
- 飞书任务集成
- 自动任务分解
- 进度跟踪
- 完成打卡

### 3. RAG 知识检索
- 用户学习历史检索
- 备考经验检索
- 90%+ 召回准确率

### 4. 定时任务
- 早安问候（8:00）
- 晚间复盘（22:00）
- 异常检测（23:59）

### 5. 数据看板
- 学习进度统计
- 正确率趋势
- 薄弱模块分析

### 6. 专注模式
- 计时器
- 学习目标设定
- 进度可视化

## 🗺️ 开发路线图

### 第1周：基础设施
- [x] core 模块
- [x] mcp-bailian-rag 模块
- [x] mcp-feishu-tasks 模块

### 第2周：核心功能
- [x] agent-langgraph 模块
- [x] scheduler 模块

### 第3周：用户界面
- [x] web 模块（核心页面）
- [x] web 模块（辅助页面）

### 第4周：测试与部署
- [ ] 集成测试
- [ ] 性能优化
- [ ] 部署上线
- [ ] 文档完善

## 📖 文档

### 必读文档
1. **项目结构**: `PROJECT_STRUCTURE.md`
2. **模块文档**: 每个模块的 `SKILL.md`
3. **完成总结**: `PROJECT_COMPLETION_SUMMARY.md`

### SKILL.md 位置
每个模块都有详细的 SKILL.md 文档：

```bash
packages/core/SKILL.md
packages/mcp-bailian-rag/SKILL.md
packages/mcp-feishu-tasks/SKILL.md
packages/agent-langgraph/SKILL.md
packages/scheduler/SKILL.md
packages/web/SKILL.md
```

## 🛠️ 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（Web 应用）
pnpm dev

# 构建所有包
pnpm build

# 测试所有包
pnpm test

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 格式化代码
pnpm format

# 清理所有 node_modules
pnpm clean
```

### 单独开发某个模块

```bash
# 开发 core 包
pnpm --filter @civil-agent/core dev

# 开发 agent-langgraph 包
pnpm --filter @civil-agent/agent-langgraph dev

# 开发 web 包
pnpm --filter @civil-agent/web dev

# 构建单个包
pnpm --filter @civil-agent/core build
```

## 🔧 开发工具

### 推荐的 VS Code 扩展

1. **TypeScript**: TypeScript 语言支持
2. **ESLint**: 代码检查
3. **Prettier**: 代码格式化
4. **Tailwind CSS IntelliSense**: TailwindCSS 自动完成
5. **React Developer Tools**: React 调试工具

### 调试技巧

#### Agent 调试（LangSmith）

```bash
# 设置环境变量
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=your_key

# 运行 Agent
pnpm --filter @civil-agent/agent-langgraph dev

# 访问 LangSmith 查看状态机执行轨迹
# https://smith.langchain.com/
```

#### MCP 服务器调试

```bash
# 启动 MCP 服务器
pnpm --filter @civil-agent/mcp-bailian-rag dev

# 在 Claude Desktop 中配置
# ~/.config/Claude/claude_desktop_config.json
```

#### Web 应用调试

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
# 使用浏览器 DevTools 调试
```

## 🐛 常见问题

### Q1: pnpm install 失败

**A**: 尝试以下解决方案：

```bash
# 清理缓存
pnpm store prune

# 删除 node_modules
rm -rf node_modules
pnpm install

# 或者使用 npm
npm install
```

### Q2: TypeScript 类型错误

**A**: 运行类型检查查看详细错误：

```bash
pnpm type-check
```

### Q3: MCP 服务器无法连接

**A**: 检查以下项目：

1. 环境变量是否正确配置
2. API Key 是否有效
3. 网络连接是否正常

### Q4: Agent 响应很慢

**A**: 可能的原因：

1. LLM API 响应慢
2. RAG 检索耗时
3. 网络延迟

**解决方案**：

- 使用 LangSmith 分析慢节点
- 优化 RAG 检索参数（减少 topK）
- 启用缓存机制

## 📚 学习资源

### 官方文档
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [MCP 协议](https://modelcontextprotocol.io/)
- [阿里云百炼](https://help.aliyun.com/zh/dashscope/)
- [飞书开放平台](https://open.feishu.cn/)
- [Next.js 14](https://nextjs.org/docs)

### 参考项目
- [MODULAR-RAG-MCP-SERVER](https://github.com/jerry-ai-dev/MODULAR-RAG-MCP-SERVER)

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 编写单元测试
- 更新 SKILL.md 文档

## 📄 许可证

MIT License

## 👥 作者

sxh

---

**祝你开发顺利！** 🚀

如有问题，请查看 SKILL.md 文档或提交 Issue。
