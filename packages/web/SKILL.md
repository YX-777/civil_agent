---
name: web-application
description: Next.js 14 web application providing 6 core pages: chat interface, focus mode, dashboard, task management, learning calendar, and user profile. Implements responsive design with TailwindCSS, shadcn/ui components, and Framer Motion animations. Use when building user interface, visualizing data, or managing user interactions.
metadata:
  category: web-app
  version: 1.0.0
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
- TailwindCSS + shadcn/ui
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
- TailwindCSS: 样式框架
- shadcn/ui: UI 组件库
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
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── QuickReplies.tsx
│   ├── dashboard/              # 看板组件
│   │   ├── StatCard.tsx
│   │   ├── AccuracyChart.tsx
│   │   └── ModuleBar.tsx
│   ├── focus/                  # 专注模式组件
│   │   └── FocusMode.tsx
│   └── shared/                 # 共享组件
│       ├── Navbar.tsx
│       ├── BottomNav.tsx
│       └── Loading.tsx
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

## 🔌 接口定义

### API 路由

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/agent/chat | POST | 对话接口 |
| /api/agent/state | GET | 获取状态 |
| /api/stats | GET | 获取统计数据 |
| /api/focus/start | POST | 开始专注 |
| /api/focus/complete | POST | 完成专注 |
| /api/tasks | GET | 获取任务列表 |
| /api/calendar | GET | 获取日历数据 |

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

---

## 📚 使用示例

### 使用 Agent Hook

```typescript
import { useAgent } from "@/hooks/use-agent";

export default function ChatPage() {
  const { sendMessage, messages, isLoading, quickReplies } = useAgent();

  const handleSendMessage = (text: string) => {
    sendMessage(text);
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  return (
    <div>
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
    </div>
  );
}
```

### 使用统计数据 Hook

```typescript
import { useStats } from "@/hooks/use-stats";

export default function Dashboard() {
  const { stats, isLoading, error, refresh } = useStats("month");

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <StatCard title="学习时长" value={`${stats.totalHours}小时`} />
      <StatCard title="平均正确率" value={`${stats.avgAccuracy}%`} />
      <StatCard title="连续天数" value={`${stats.consecutiveDays}天`} />
    </div>
  );
}
```

---

## 🎓 最佳实践

1. **组件拆分**: 保持组件小而专注，单一职责
2. **状态管理**: 使用 React Hooks 管理组件状态
3. **性能优化**:
   - 使用 `useMemo` 缓存计算结果
   - 使用 `useCallback` 缓存回调函数
   - 虚拟滚动处理长列表
4. **错误边界**: 使用 Error Boundary 捕获组件错误
5. **加载状态**: 提供友好的加载和错误提示

---

## 🎨 UI/UX 设计

### 响应式断点

```css
/* Mobile */
@media (max-width: 768px) {
  /* 移动端样式 */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  /* 平板样式 */
}

/* Desktop */
@media (min-width: 1024px) {
  /* 桌面端样式 */
}
```

### 导航设计

**移动端**:
- 底部导航栏（固定）
- 5个主要入口

**桌面端**:
- 顶部导航栏
- 下拉菜单

### 主题色

```css
/* 主色调 */
--primary: #3b82f6;      /* 蓝色 */
--secondary: #8b5cf6;    /* 紫色 */
--success: #10b981;      /* 绿色 */
--warning: #f59e0b;      /* 橙色 */
--error: #ef4444;        /* 红色 */
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

**文档版本**: v1.0
**最后更新**: 2025-01-23
**维护者**: sxh
