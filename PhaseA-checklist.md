# Phase A Checklist - 会话状态源统一（2026-03-18）

## A1 接口契约冻结
- [x] `POST /api/agent/chat` 要求 `userId/conversationId/message` 必填
- [x] SSE 结束事件返回 `turnId`
- [x] 错误码统一为结构化字段（`code` + `message`）
- [x] 提供 `GET/DELETE /api/agent/state` 双键状态接口

## A2 Key 规则统一
- [x] 会话状态 key 统一为 `(userId, conversationId)`
- [x] 清理仅按 `userId` 读写状态的逻辑

## A3 AgentState Repository
- [x] 新增 `AgentStateRepository`
- [x] 提供 `findByUserConversation / upsertState / deleteByUserConversation`
- [x] 从 `@civil-agent/database` 导出访问方法

## A4 Chat 主流程切换 DB 状态源
- [x] 读取顺序：`cache -> agent_states -> createInitialState`
- [x] 状态最终落库到 `agent_states`
- [x] `Map` 仅作为可选缓存（`AGENT_STATE_CACHE_ENABLED`）

## A5 事务边界
- [x] 流式生成完成后单事务提交：
  - user message
  - assistant message
  - agent_state upsert
  - conversation title/updatedAt 更新
- [x] 失败时返回 SSE `error`

## A6 会话创建前置
- [x] Web 首次进入无会话时自动创建会话
- [x] 无会话 ID 时前端不发 chat 请求

## A7 验证
- [x] `@civil-agent/database build` 通过
- [x] `@civil-agent/web type-check` 通过
- [x] `@civil-agent/web build` 通过
- [x] `AgentStateRepository` CRUD smoke test 通过
