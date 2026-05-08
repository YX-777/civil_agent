---
name: task-scheduler
description: Scheduled task manager triggering morning greetings (8:00), evening reviews (22:00), and anomaly detection (23:59). Uses node-cron for scheduling and Bull queue for reliable task execution with retry mechanisms. Use when automating periodic tasks, sending push notifications, or monitoring user learning patterns.
metadata:
  category: scheduler
  version: 1.0.0
  priority: P0
  estimated-days: 2
  triggers: "schedule, cron,定时任务, 调度, 早安问候, 晚间复盘"
  dependencies: ["core", "agent-langgraph"]
  dependents: []
allowed-tools: Read Write Edit Bash(pnpm:*:*) Bash(node:*:*)
---

# 定时任务调度器技能文档

**模块类型**: 定时任务
**开发状态**: ✅ 已完成
**优先级**: P0
**预计周期**: 2 天

---

## 📖 模块概述

定时任务调度器负责在特定时间触发自动任务，实现主动陪伴功能。

**核心功能**:
- 早安问候（每天 8:00）
- 晚间复盘（每天 22:00）
- 异常检测（每天 23:59）

**技术特点**:
- node-cron: 定时任务调度
- Bull: 任务队列管理
- 失败重试: 确保任务可靠执行

---

## 🎯 核心功能

### 功能1: 早安问候任务

**功能描述**: 每天早上 8:00 向用户发送早安问候和学习建议。

**触发时间**: 每天早上 8:00

**任务流程**:
1. 查询所有活跃用户
2. 调用 Agent 生成个性化问候
3. 发送推送通知
4. 等待用户快捷回复

**消息内容**:
- 个性化问候（使用用户昵称）
- 今日学习建议（基于学习进度）
- 鼓励语
- 快捷回复选项

**快捷回复**:
- "开始今天的学习" → 进入任务生成
- "调整学习计划" → 进入计划调整
- "查看学习进度" → 进入进度查询

---

### 功能2: 晚间复盘任务

**功能描述**: 每天晚上 22:00 向用户发送今日学习总结。

**触发时间**: 每天晚上 22:00

**任务流程**:
1. 查询用户今日学习数据
2. 生成本日学习报告
3. 发送推送通知
4. 引导用户复盘

**报告内容**:
- 今日学习时长
- 完成题目数量
- 平均正确率
- 连续学习天数
- 今日成就（如有）
- 明日学习预告

**快捷回复**:
- "记录今天的学习心得" → 记录笔记
- "查看本周数据" → 跳转数据看板
- "准备休息" → 结束对话

---

### 功能3: 异常检测任务

**功能描述**: 每天深夜检测用户学习异常，及时干预。

**触发时间**: 每天晚上 23:59

**检测项**:
1. **连续未学习**: 连续3天未完成任何学习任务
2. **正确率下降**: 最近一周正确率下降超过 10%
3. **进度滞后**: 学习进度落后计划超过 20%
4. **任务逾期**: 有逾期未完成的任务

**干预策略**:
- 温和提醒（第一次异常）
- 关怀询问（连续异常）
- 建议调整（长期异常）

**消息示例**:
```
你好，注意到你已经3天没有学习了。😔

备考路上遇到困难很正常，要不要聊聊？
我可以帮你：
- 分析当前学习状况
- 调整学习计划
- 提供备考建议

[聊聊看] [我没事]
```

---

## 🔧 技术实现

### 技术栈

- node-cron: 定时任务调度
- bull: 任务队列（Redis）
- @tech-mate/core: 类型定义
- @tech-mate/agent-langgraph: Agent 客户端

### 代码结构

```
src/
├── jobs/
│   ├── morning-greeting.ts    # 早安问候任务
│   ├── evening-review.ts      # 晚间复盘任务
│   └── anomaly-check.ts       # 异常检测任务
├── queue/
│   ├── bull-queue.ts          # Bull 队列配置
│   └── processors.ts          # 任务处理器
├── config/
│   ├── cron.config.ts         # Cron 配置
│   └── scheduler.config.ts    # 调度器配置
├── notification/
│   └── push-notification.ts   # 推送通知
└── index.ts                   # 入口文件
```

---

## 🔌 接口定义

### 任务定义

| 任务名称 | Cron 表达式 | 描述 | 并发数 |
|---------|------------|------|--------|
| morning-greeting | 0 8 * * * | 早安问候 | 10 |
| evening-review | 0 22 * * * | 晚间复盘 | 10 |
| anomaly-check | 59 23 * * * | 异常检测 | 5 |

### 任务队列配置

```typescript
interface QueueConfig {
  connection: {
    host: string;
    port: number;
    db: number;
  };
  defaultJobOptions: {
    attempts: number;      // 重试次数
    backoff: {
      type: 'exponential';
      delay: number;       // 重试延迟
    };
    removeOnComplete: boolean;
    removeOnFail: boolean;
  };
}
```

---

## 📝 依赖关系

### 依赖的模块

- `@tech-mate/core`: 类型定义
- `@tech-mate/agent-langgraph`: Agent 调用

### 外部依赖

- Redis: 任务队列存储
- 推送服务: 发送通知

---

## 🚀 开发指南

### 本地开发

```bash
# 进入目录
cd packages/scheduler

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 启动调度器
pnpm start
```

### 环境变量配置

```bash
# .env 文件
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 推送服务配置
PUSH_SERVICE_KEY=your_push_service_key
PUSH_SERVICE_URL=https://push.service.com

# 调度器配置
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Shanghai
```

### Redis 配置

```bash
# 启动 Redis
docker run -d -p 6379:6379 redis:alpine

# 或使用本地 Redis
redis-server
```

---

## 📋 待办事项

- [x] 实现早安问候任务 (0.5天)
- [x] 实现晚间复盘任务 (0.5天)
- [x] 实现异常检测任务 (0.5天)
- [x] 集成 Bull 队列 (0.5天)

---

## 📚 使用示例

### 启动调度器

```typescript
import { Scheduler } from "@tech-mate/scheduler";

const scheduler = new Scheduler();

// 启动所有定时任务
scheduler.start();

console.log("调度器已启动");
console.log("- 早安问候: 每天 8:00");
console.log("- 晚间复盘: 每天 22:00");
console.log("- 异常检测: 每天 23:59");
```

### 手动触发任务（测试用）

```typescript
import { morningGreetingJob } from "@tech-mate/scheduler";

// 手动触发早安问候
await morningGreetingJob({
  userId: "user-123"
});
```

### 监控任务队列

```typescript
import { Queue } from "bull";

const queue = new Queue("civil-service-tasks");

// 查看队列状态
const waiting = await queue.getWaiting();
const active = await queue.getActive();
const completed = await queue.getCompleted();
const failed = await queue.getFailed();

console.log("等待中:", waiting.length);
console.log("执行中:", active.length);
console.log("已完成:", completed.length);
console.log("失败:", failed.length);
```

---

## 🎓 最佳实践

1. **任务幂等性**: 确保任务重复执行不会产生副作用
2. **失败重试**: 合理设置重试次数和延迟
3. **监控告警**: 监控任务执行失败率，及时告警
4. **性能优化**: 避免在高峰时段执行大量任务
5. **日志记录**: 详细记录任务执行日志，便于排查问题

---

## 🔍 调试技巧

### 查看任务日志

```bash
# 设置日志级别
LOG_LEVEL=DEBUG pnpm start

# 查看任务执行日志
tail -f logs/scheduler.log
```

### 查看 Bull 队列状态

```bash
# 使用 Bull Board 监控队列
pnpm add bull-board

# 访问 http://localhost:3000/bull
```

### 手动触发任务测试

```typescript
// 测试早安问候
await testJob("morning-greeting", {
  userId: "test-user-123"
});

// 查看执行结果
console.log("任务执行完成");
```

---

## 📊 任务执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron 触发器                              │
│                  (每分钟检查一次)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌──────────────────────┐
              │   检查是否到点       │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
           未到点                 到点
              │                     │
              └─────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   添加到 Bull 队列   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Worker 处理       │
                         │  (并发执行)          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   调用 Agent         │
                         │   生成消息           │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   发送推送通知       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   记录执行日志       │
                         └──────────────────────┘
```

---

## 🚨 错误处理

### 任务失败重试策略

```typescript
{
  attempts: 3,              // 最多重试 3 次
  backoff: {
    type: 'exponential',
    delay: 5000            // 基础延迟 5 秒
  }
}

// 重试延迟计算
// 第1次重试: 5 秒
// 第2次重试: 10 秒
// 第3次重试: 20 秒
```

### 死信队列处理

```typescript
// 超过重试次数后进入死信队列
queue.on('failed', (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    // 记录到死信队列
    deadLetterQueue.add(job.data);
    // 发送告警
    sendAlert(`任务失败: ${job.name}`, err);
  }
});
```

---

## 📈 性能优化

### 批量处理优化

```typescript
// 批量查询用户（减少数据库查询）
const users = await batchGetUsers(userIds, 100);

// 批量调用 Agent（减少 HTTP 请求）
const results = await batchCallAgent(users, 10);
```

### Redis 连接池

```typescript
{
  connection: {
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxRetriesPerRequest: null
  }
}
```

---

**文档版本**: v1.0
**最后更新**: 2025-01-23
**维护者**: sxh
