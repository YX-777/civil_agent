---
name: web-application
description: Next.js 14 web application providing 6 core pages: chat interface, focus mode, dashboard, task management, learning calendar, and user profile. Implements responsive design with Ant Design, Ant Design X, and Framer Motion animations. Use when building user interface, visualizing data, or managing user interactions.
metadata:
  category: web-app
  version: 2.0.0
  priority: P0
  estimated-days: 3
  triggers: "web, UI, frontend, dashboard, chat, 网页, 前端, 界面"
  dependencies: ["core", "agent-langgraph"]
  dependents: []
allowed-tools: Read Write Edit Bash(pnpm:*:*) Bash(nextdev:*:*)
---

# Web 应用技能文档

**模块类型**: Web应用
**开发状态**: ✅ 已完成
**优先级**: P0
**预计周期**: 3 天

---

## 📖 模块概述

Web 应用是考公 Agent 的用户界面，提供6个核心页面：

1. **对话界面**: 与 AI 助手实时对话
2. **专注模式**: 计时器 + 学习目标设定
3. **数据看板**: 学习进度统计和分析
4. **任务管理**: 飞书任务同步和管理
5. **学习日历**: 学习打卡日历
6. **个人中心**: 考试倒计时和个人档案

**技术特点**:
- Next.js 14 App Router
- Ant Design + Ant Design X
- 响应式设计
- 动画效果（Framer Motion）

---

## 🎯 核心功能

### 页面1: 对话界面

**路径**: `/`

**功能描述**: 与 AI 助手实时对话，支持快捷回复和多轮对话。

**核心组件**:
- `ChatInterface`: 主聊天界面
- `MessageBubble`: 消息气泡
- `ChatInput`: 输入框
- `QuickReplies`: 快捷回复按钮
- `ChatHistory`: 对话历史

**交互流程**:
```
用户输入消息
    ↓
调用 Agent API
    ↓
显示 AI 回复
    ↓
显示快捷回复按钮（如有）
    ↓
等待用户点击快捷回复或输入新消息
```

---

### 页面2: 专注模式

**路径**: `/focus`

**功能描述**: 计时器 + 学习目标设定，帮助用户专注学习。

**3个阶段**:
1. **设置阶段**: 选择时长（1/2/3小时）+ 学习模块
2. **进行中阶段**: 倒计时 + 进度条 + 鼓励语
3. **完成阶段**: 显示成就 + 学习成果

**核心组件**:
- `FocusMode`: 主页面
- `SetupPhase`: 设置界面
- `ActivePhase`: 进行中界面
- `CompletePhase`: 完成界面

**鼓励语机制**:
- 0%-25%: "💪 加油！刚开始！"
- 25%-50%: "🔥 保持状态！"
- 50%-75%: "⭐⭐⭐ 太棒了！"
- 75%-100%: "🏆 坚持一下，即将完成！"
- 100%: "🎉 恭喜！完成今日专注"

---

### 页面3: 数据看板

**路径**: `/dashboard`

**功能描述**: 展示学习进度统计和分析。

**5个数据模块**:
1. **备考进度**: 进度条 + 天数统计
2. **关键指标卡片**: 学习时长、正确率、连续天数
3. **正确率趋势图**: 折线图展示
4. **模块分析**: 各模块正确率对比
5. **薄弱模块提示**: AI 建议

**交互功能**:
- 时间范围筛选（最近一周/一月/全部）
- 点击卡片查看详情
- 点击模块条显示详细分析
- 点击"创建专项训练"按钮

---

### 页面4: 任务管理

**路径**: `/tasks`

**功能描述**: 同步飞书任务，管理学习任务。

**功能模块**:
- 今日任务列表
- 进行中任务（带进度条）
- 任务日历视图
- 完成任务打卡
- 创建新任务

**任务状态**:
- `todo`: 待开始
- `in_progress`: 进行中
- `completed`: 已完成
- `overdue`: 已逾期

---

### 页面5: 学习日历

**路径**: `/calendar`

**功能描述**: 学习打卡日历，展示每日学习记录。

**功能模块**:
- 月历视图
- 每日学习时长
- 打卡记录
- 连续学习天数
- 点击日期查看详情

---

### 页面6: 个人中心

**路径**: `/profile`

**功能描述**: 个人档案和设置。

**功能模块**:
- 考试倒计时
- 目标分数设定
- 备考档案管理
- 学习数据总览
- 设置入口

---

## 🔧 技术实现

### 技术栈

- Next.js 14: React 框架（App Router）
- TypeScript: 类型系统
- Ant Design: UI 组件库
- Ant Design X: AI 对话组件库
- Framer Motion: 动画库
- Recharts: 图表库
- @civil-agent/core: 核心类型

### 代码结构

```
src/
├── app/                        # App Router
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 首页（对话界面）
│   ├── dashboard/              # 数据看板
│   ├── focus/                  # 专注模式
│   ├── tasks/                  # 任务管理
│   ├── calendar/               # 学习日历
│   └── profile/                # 个人中心
├── components/                 # UI 组件
│   ├── chat/                   # 对话组件
│   │   ├── MessageBubble.tsx   # 消息气泡（Card + Avatar）
│   │   ├── ChatInput.tsx       # 输入框（Input + Button）
│   │   └── QuickReplies.tsx    # 快捷回复（Space + Button）
│   ├── dashboard/              # 看板组件
│   │   ├── StatCard.tsx        # 统计卡片（Card + Statistic）
│   │   ├── AccuracyChart.tsx   # 正确率图表（Card + LineChart）
│   │   └── ModuleBar.tsx       # 模块分析（Card + BarChart）
│   ├── focus/                  # 专注模式组件
│   │   └── FocusMode.tsx       # 专注模式主组件
│   └── shared/                 # 共享组件
│       ├── Navbar.tsx          # 顶部导航（Layout.Header + Menu）
│       └── BottomNav.tsx       # 底部导航（Layout.Footer + Menu）
├── config/                     # 配置文件
│   └── theme.ts                # Ant Design 主题配置
├── lib/                        # 工具库
│   ├── agent-client.ts         # Agent 客户端
│   ├── api-client.ts           # API 客户端
│   └── utils.ts                # 工具函数
├── hooks/                      # React Hooks
│   ├── use-agent.ts            # Agent Hook
│   ├── use-stats.ts            # 统计数据 Hook
│   └── use-focus.ts            # 专注模式 Hook
├── styles/                     # 样式文件
│   └── globals.css
└── types/                      # 类型定义
    └── index.ts
```

---

## 🔌 API 接口定义

### 1. 对话接口

**路径**: `/api/agent/chat`  
**方法**: POST  
**调用场景**: 用户在对话界面发送消息给 AI 助手

**入参类型**:
```typescript
interface ChatRequest {
  message: string;  // 用户输入的消息内容
}
```

**出参类型**:
```typescript
interface ChatResponse {
  content: string;  // AI 回复内容
  quickReplies?: QuickReply[];  // 快捷回复选项（可选）
}

interface QuickReply {
  id: string;  // 快捷回复 ID
  text: string;  // 显示文本
  action: string;  // 动作类型
}
```

**示例**:
```typescript
// 请求
POST /api/agent/chat
{
  "message": "今天应该学习什么？"
}

// 响应
{
  "content": "根据你的学习进度，建议今天重点复习资料分析模块...",
  "quickReplies": [
    {
      "id": "1",
      "text": "开始今天的学习",
      "action": "create_task"
    },
    {
      "id": "2",
      "text": "查看学习进度",
      "action": "query_progress"
    }
  ]
}
```

---

### 2. 获取统计数据接口

**路径**: `/api/stats`  
**方法**: GET  
**调用场景**: 数据看板页面加载、切换时间范围时获取学习统计数据

**入参类型**:
```typescript
interface StatsQuery {
  range?: "week" | "month" | "all";  // 时间范围，默认 "month"
}
```

**出参类型**:
```typescript
interface Stats {
  totalHours: number;  // 总学习时长（小时）
  avgAccuracy: number;  // 平均正确率（0-1）
  consecutiveDays: number;  // 连续学习天数
  completedTasks: number;  // 完成任务数
  progressPercentage: number;  // 备考进度百分比（0-100）
}
```

**示例**:
```typescript
// 请求
GET /api/stats?range=month

// 响应
{
  "totalHours": 120,
  "avgAccuracy": 0.78,
  "consecutiveDays": 7,
  "completedTasks": 45,
  "progressPercentage": 65
}
```

---

### 3. 开始专注接口

**路径**: `/api/focus/start`  
**方法**: POST  
**调用场景**: 用户在专注模式页面开始学习计时

**入参类型**:
```typescript
interface FocusStartRequest {
  duration: number;  // 专注时长（分钟）：60/120/180
  module: string;  // 学习模块：资料分析/数量关系/判断推理/言语理解/常识判断
}
```

**出参类型**:
```typescript
interface FocusStartResponse {
  success: boolean;
  message: string;
  sessionId?: string;  // 专注会话 ID
}
```

**示例**:
```typescript
// 请求
POST /api/focus/start
{
  "duration": 120,
  "module": "资料分析"
}

// 响应
{
  "success": true,
  "message": "Focus session started",
  "sessionId": "session-123456"
}
```

---

### 4. 完成专注接口

**路径**: `/api/focus/complete`  
**方法**: POST  
**调用场景**: 用户完成专注学习或手动结束专注

**入参类型**:
```typescript
interface FocusCompleteRequest {
  sessionId: string;  // 专注会话 ID
  actualDuration: number;  // 实际专注时长（分钟）
  questionsCompleted?: number;  // 完成题目数（可选）
  accuracy?: number;  // 正确率（可选）
}
```

**出参类型**:
```typescript
interface FocusCompleteResponse {
  success: boolean;
  message: string;
  achievement?: {  // 成就（可选）
    type: string;
    title: string;
    description: string;
  };
}
```

**示例**:
```typescript
// 请求
POST /api/focus/complete
{
  "sessionId": "session-123456",
  "actualDuration": 115,
  "questionsCompleted": 50,
  "accuracy": 0.85
}

// 响应
{
  "success": true,
  "message": "Focus session completed",
  "achievement": {
    "type": "streak",
    "title": "连续专注7天",
    "description": "太棒了！你已经连续专注学习7天！"
  }
}
```

---

### 5. 获取任务列表接口

**路径**: `/api/tasks`  
**方法**: GET  
**调用场景**: 任务管理页面加载、刷新任务列表

**入参类型**:
```typescript
interface TasksQuery {
  status?: "all" | "todo" | "in_progress" | "completed" | "overdue";  // 任务状态过滤
  dateRange?: "today" | "week" | "month";  // 时间范围过滤
}
```

**出参类型**:
```typescript
interface TasksResponse {
  tasks: Task[];
}

interface Task {
  id: string;  // 任务 ID
  title: string;  // 任务标题
  status: "todo" | "in_progress" | "completed" | "overdue";  // 任务状态
  progress: number;  // 进度百分比（0-100）
  dueDate: string;  // 截止日期（YYYY-MM-DD）
}
```

**示例**:
```typescript
// 请求
GET /api/tasks?status=all&dateRange=week

// 响应
{
  "tasks": [
    {
      "id": "1",
      "title": "资料分析50题",
      "status": "in_progress",
      "progress": 60,
      "dueDate": "2025-01-30"
    },
    {
      "id": "2",
      "title": "数量关系30题",
      "status": "todo",
      "progress": 0,
      "dueDate": "2025-01-25"
    },
    {
      "id": "3",
      "title": "判断推理40题",
      "status": "completed",
      "progress": 100,
      "dueDate": "2025-01-20"
    }
  ]
}
```

---

### 6. 获取日历数据接口

**路径**: `/api/calendar`  
**方法**: GET  
**调用场景**: 学习日历页面加载、切换月份时获取学习记录

**入参类型**:
```typescript
interface CalendarQuery {
  month: number;  // 月份（0-11）
  year?: number;  // 年份（可选，默认当前年）
}
```

**出参类型**:
```typescript
interface CalendarResponse {
  days: CalendarDay[];
}

interface CalendarDay {
  date: string;  // 日期（YYYY-MM-DD）
  learningHours: number;  // 学习时长（小时）
  completed: boolean;  // 是否完成学习目标
}
```

**示例**:
```typescript
// 请求
GET /api/calendar?month=0&year=2025

// 响应
{
  "days": [
    {
      "date": "2025-01-01",
      "learningHours": 3,
      "completed": true
    },
    {
      "date": "2025-01-02",
      "learningHours": 0,
      "completed": false
    },
    {
      "date": "2025-01-03",
      "learningHours": 4,
      "completed": true
    }
  ]
}
```

---

### 7. 创建任务接口（待实现）

**路径**: `/api/tasks`  
**方法**: POST  
**调用场景**: 用户在任务管理页面创建新学习任务

**入参类型**:
```typescript
interface CreateTaskRequest {
  title: string;  // 任务标题
  module: string;  // 学习模块
  type: string;  // 任务类型：练习/复习/测试
  quantity: number;  // 题目数量
  difficulty: "easy" | "medium" | "hard";  // 难度
  dueDays: number;  // 截止天数
  priority: "low" | "medium" | "high";  // 优先级
  autoBreakdown?: boolean;  // 是否自动分解子任务
}
```

**出参类型**:
```typescript
interface CreateTaskResponse {
  success: boolean;
  taskId: string;
  taskUrl?: string;  // 飞书任务链接
  summary?: {
    totalTasks: number;
    subtasks: Array<{
      title: string;
      dueDate: string;
    }>;
  };
}
```

**示例**:
```typescript
// 请求
POST /api/tasks
{
  "title": "资料分析50题",
  "module": "资料分析",
  "type": "练习",
  "quantity": 50,
  "difficulty": "medium",
  "dueDays": 7,
  "priority": "high",
  "autoBreakdown": true
}

// 响应
{
  "success": true,
  "taskId": "task-123456",
  "taskUrl": "https://xxx.feishu.cn/task/task-123456",
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
```

---

### 8. 更新任务状态接口（待实现）

**路径**: `/api/tasks/[taskId]`  
**方法**: PATCH  
**调用场景**: 用户更新任务进度或状态

**入参类型**:
```typescript
interface UpdateTaskRequest {
  status?: "todo" | "in_progress" | "completed";  // 任务状态
  progress?: number;  // 进度百分比（0-100）
  note?: string;  // 备注
}
```

**出参类型**:
```typescript
interface UpdateTaskResponse {
  success: boolean;
  message: string;
  taskId: string;
}
```

**示例**:
```typescript
// 请求
PATCH /api/tasks/task-123456
{
  "status": "in_progress",
  "progress": 50,
  "note": "已完成基础题型，正在攻克进阶题型"
}

// 响应
{
  "success": true,
  "message": "任务更新成功",
  "taskId": "task-123456"
}
```

---

### 9. 完成任务接口（待实现）

**路径**: `/api/tasks/[taskId]/complete`  
**方法**: POST  
**调用场景**: 用户完成任务并打卡

**入参类型**:
```typescript
interface CompleteTaskRequest {
  actualHours: number;  // 实际用时（小时）
  questionsCompleted: number;  // 完成题目数
  accuracy: number;  // 正确率（0-1）
  reflection?: string;  // 学习心得
}
```

**出参类型**:
```typescript
interface CompleteTaskResponse {
  success: boolean;
  message: string;
  taskId: string;
  completionRecord?: {
    date: string;
    duration: string;
    accuracy: string;
  };
}
```

**示例**:
```typescript
// 请求
POST /api/tasks/task-123456/complete
{
  "actualHours": 2.5,
  "questionsCompleted": 50,
  "accuracy": 0.82,
  "reflection": "今天学习效果很好，重点掌握了混合增长率问题"
}

// 响应
{
  "success": true,
  "message": "恭喜！任务已完成",
  "taskId": "task-123456",
  "completionRecord": {
    "date": "2025-01-23",
    "duration": "2.5小时",
    "accuracy": "82%"
  }
}
```

---

### 10. 搜索知识库接口（待实现）

**路径**: `/api/mcp/bailian/search`  
**方法**: POST  
**调用场景**: Agent 需要检索知识库时调用

**入参类型**:
```typescript
interface SearchKnowledgeRequest {
  query: string;  // 搜索查询
  category?: "user_history" | "exam_experience" | "all";  // 分类
  topK?: number;  // 返回结果数，默认 3
}
```

**出参类型**:
```typescript
interface SearchKnowledgeResponse {
  success: boolean;
  data: {
    results: Array<{
      content: string;
      metadata: {
        source: string;
        category: string;
        score: number;
      };
    }>;
    count: number;
  };
}
```

**示例**:
```typescript
// 请求
POST /api/mcp/bailian/search
{
  "query": "行测数量关系怎么提高",
  "category": "exam_experience",
  "topK": 3
}

// 响应
{
  "success": true,
  "data": {
    "results": [
      {
        "content": "数量关系是行测的重点模块，建议从基础题型开始...",
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

### 11. 上传文档接口（待实现）

**路径**: `/api/mcp/bailian/upload`  
**方法**: POST  
**调用场景**: 用户上传学习资料到知识库

**入参类型**:
```typescript
interface UploadDocumentRequest {
  file: File;  // 文件对象
  category: "user_history" | "exam_experience";  // 分类
  metadata?: {
    tags?: string[];  // 标签
    author?: string;  // 作者
  };
}
```

**出参类型**:
```typescript
interface UploadDocumentResponse {
  success: boolean;
  data: {
    message: string;
    documentId: string;
  };
}
```

**示例**:
```typescript
// 请求
POST /api/mcp/bailian/upload
FormData: {
  file: File,
  category: "exam_experience",
  metadata: JSON.stringify({
    tags: ["行测", "数量关系"],
    author: "知乎用户"
  })
}

// 响应
{
  "success": true,
  "data": {
    "message": "文档上传成功",
    "documentId": "doc-123456"
  }
}
```

---

## 📊 API 调用流程图

```
┌─────────────┐
│   Web 前端   │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┬──────────────────┐
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Agent API   │  │ Stats API   │  │ Focus API   │  │ Tasks API   │
│ /api/agent  │  │ /api/stats  │  │ /api/focus  │  │ /api/tasks  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ LangGraph   │  │ Scheduler   │  │ Scheduler   │  │ Feishu MCP  │
│ Agent       │  │ DB          │  │ DB          │  │ Server      │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│ Bailian MCP  │
│ Server      │
└─────────────┘
```

---

## 📝 依赖关系

### 依赖的模块

- `@civil-agent/core`: 类型定义、常量
- `@civil-agent/agent-langgraph`: Agent 调用

### 被依赖的模块

无（Web 应用是最顶层模块）

---

## 🚀 开发指南

### 本地开发

```bash
# 进入目录
cd packages/web

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm type-check
```

### 依赖安装

```bash
# 使用 pnpm 安装 Ant Design 相关依赖
pnpm add antd @ant-design/x @ant-design/x-markdown @ant-design/icons
```

### 环境变量配置

```bash
# .env.local 文件
NEXT_PUBLIC_API_URL=http://localhost:3000
AGENT_API_URL=http://localhost:3000/api/agent
```

---

## 📋 待办事项

### 核心页面（2天）

- [x] 搭建 Next.js 项目 (0.5天)
- [x] 实现对话界面 (1天)
- [x] 实现专注模式 (0.5天)
- [x] 实现数据看板 (1天)

### 辅助页面（1天）

- [x] 实现任务管理页面 (0.5天)
- [x] 实现学习日历页面 (0.5天)
- [x] 实现个人中心页面 (0.5天)
- [x] 响应式设计 (0.5天)

### UI 重构（已完成）

- [x] 安装 Ant Design 和 Ant Design X 依赖
- [x] 配置 Ant Design 主题和样式
- [x] 重构共享组件（Navbar、BottomNav）
- [x] 重构聊天组件（MessageBubble、ChatInput、QuickReplies）
- [x] 重构数据看板组件（StatCard、AccuracyChart、ModuleBar）
- [x] 重构对话界面页面
- [x] 重构专注模式页面
- [x] 重构数据看板页面
- [x] 重构任务管理页面
- [x] 重构学习日历页面
- [x] 重构个人中心页面
- [x] 验证构建和运行效果

---

## 📚 使用示例

### 使用 Ant Design 组件

```typescript
import { Card, Button, Input, Space, Avatar } from "antd";
import { UserOutlined, RobotOutlined } from "@ant-design/icons";

export default function ChatPage() {
  return (
    <div>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Avatar icon={<UserOutlined />} />
          <Input placeholder="输入消息..." />
          <Button type="primary">发送</Button>
        </Space>
      </Card>
    </div>
  );
}
```

### 使用 Agent Hook

```typescript
import { useAgent } from "@/hooks/use-agent";
import { Card, Input, Button, Space } from "antd";

export default function ChatPage() {
  const { sendMessage, messages, isLoading, quickReplies } = useAgent();

  const handleSendMessage = (text: string) => {
    sendMessage(text);
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  return (
    <Card>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}

        {quickReplies && quickReplies.length > 0 && (
          <QuickReplies
            options={quickReplies}
            onSelect={handleQuickReply}
          />
        )}

        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </Space>
    </Card>
  );
}
```

### 使用统计数据 Hook

```typescript
import { useStats } from "@/hooks/use-stats";
import { Row, Col, Statistic, Card } from "antd";

export default function Dashboard() {
  const { stats, isLoading, error, refresh } = useStats("month");

  if (isLoading) return <Spin />;
  if (error) return <Alert message={error.message} type="error" />;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic title="学习时长" value={stats.totalHours} suffix="小时" />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic title="平均正确率" value={stats.avgAccuracy} suffix="%" />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic title="连续天数" value={stats.consecutiveDays} suffix="天" />
        </Card>
      </Col>
    </Row>
  );
}
```

---

## 🎓 最佳实践

1. **组件拆分**: 保持组件小而专注，单一职责
2. **状态管理**: 使用 React Hooks 管理组件状态
3. **Ant Design 使用**:
   - 使用 ConfigProvider 统一主题配置
   - 使用 Row/Col 实现响应式布局
   - 使用 Space 组件管理间距
   - 使用 Card 统一卡片样式
4. **性能优化**:
   - 使用 `useMemo` 缓存计算结果
   - 使用 `useCallback` 缓存回调函数
   - 使用虚拟滚动处理长列表（Ant Design Table 内置）
5. **错误处理**: 使用 Ant Design Alert 和 Result 组件显示错误
6. **加载状态**: 使用 Ant Design Spin 组件显示加载状态

---

## 🎨 UI/UX 设计

### Ant Design 主题配置

```typescript
// config/theme.ts
import { theme } from "antd";

const { defaultAlgorithm, darkAlgorithm } = theme;

export const antTheme = {
  algorithm: defaultAlgorithm,
  token: {
    colorPrimary: "#3b82f6",
    colorSuccess: "#10b981",
    colorWarning: "#f59e0b",
    colorError: "#ef4444",
    colorInfo: "#8b5cf6",
    borderRadius: 8,
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: "#fff",
      headerHeight: 64,
      footerBg: "#fff",
    },
    Menu: {
      itemBorderRadius: 8,
    },
    Card: {
      borderRadiusLG: 12,
    },
  },
};
```

### 响应式断点

```typescript
// 使用 Ant Design Grid 系统
import { Row, Col } from "antd";

<Row gutter={[16, 16]}>
  <Col xs={24} sm={12} md={8} lg={6}>
    {/* 移动端全宽，平板半宽，桌面1/3宽度 */}
  </Col>
</Row>
```

### 导航设计

**移动端**:
- 底部导航栏（固定）
- 6个主要入口（对话、专注、看板、任务、日历、个人）

**桌面端**:
- 顶部导航栏
- 横向菜单布局

### 主题色

```typescript
// Ant Design Token 配置
{
  colorPrimary: "#3b82f6",      // 蓝色 - 主色调
  colorSuccess: "#10b981",      // 绿色 - 成功
  colorWarning: "#f59e0b",      // 橙色 - 警告
  colorError: "#ef4444",        // 红色 - 错误
  colorInfo: "#8b5cf6",         // 紫色 - 信息
}
```

---

## 🔍 调试技巧

### 查看网络请求

```typescript
// 在 lib/api-client.ts 中添加日志
export async function fetchAPI(endpoint: string, options?: RequestInit) {
  console.log(`[API] ${endpoint}`, options);

  const response = await fetch(endpoint, options);

  console.log(`[API] ${endpoint} → ${response.status}`);

  return response;
}
```

### React DevTools

```bash
# 安装 React DevTools 浏览器扩展
# Chrome: https://chrome.google.com/webstore
# Firefox: https://addons.mozilla.org/firefox/
```

### 性能分析

```typescript
// 使用 React Profiler
import { Profiler } from "react";

<Profiler id="ChatInterface" onRender={onRenderCallback}>
  <ChatInterface />
</Profiler>
```

---

## 📊 页面导航流程

``┌─────────────┐
│  首页（对话） │ ◄─── 默认首页
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌─────────────┐
│  专注模式    │  │  数据看板    │
│  /focus     │  │ /dashboard  │
└─────────────┘  └──────┬──────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
       ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  任务管理    │  │  学习日历    │  │  个人中心    │
│  /tasks     │  │ /calendar   │  │ /profile    │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🎯 关键性能指标

- **FCP** (First Contentful Paint): < 1.5s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.5s
- **CLS** (Cumulative Layout Shift): < 0.1

---

**文档版本**: v2.0
**最后更新**: 2026-01-24
**维护者**: sxh
