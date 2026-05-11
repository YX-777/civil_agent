/**
 * Agent 事件日志记录器
 *
 * 把 Agent 内部的关键事件（意图识别 / 节点调用 / RAG 检索 / GuardRail）落到 SQLite。
 * 用于 Dashboard 看板。
 *
 * 设计要点：
 *  - fire-and-forget：异步落盘，不阻塞主流程
 *  - 优雅降级：表未 migrate 时不抛错（dev 期间安全）
 *  - 不抛任何错误：记录失败不影响业务
 */

import { getPrismaClient } from "@tech-mate/database";

export type AgentEventType = "intent" | "node" | "rag" | "guardrail";

export interface AgentEventInput {
  userId: string;
  conversationId?: string;
  eventType: AgentEventType;
  eventName: string;             // e.g. "general_qa", "vector_retrieval"
  payload?: Record<string, any>; // 自动序列化为 JSON
  durationMs?: number;
}

let tableMissing = false;        // 第一次发现表不存在后置 true，跳过后续尝试

export function logAgentEvent(input: AgentEventInput): void {
  if (tableMissing) return;

  // fire-and-forget
  void (async () => {
    try {
      const prisma: any = getPrismaClient();
      if (!prisma.agentEventLog) {
        tableMissing = true;
        return;
      }
      await prisma.agentEventLog.create({
        data: {
          userId: input.userId,
          conversationId: input.conversationId ?? null,
          eventType: input.eventType,
          eventName: input.eventName,
          payloadJson: input.payload ? JSON.stringify(input.payload) : null,
          durationMs: input.durationMs ?? null,
        },
      });
    } catch (err: any) {
      // P2021 = table does not exist；其他错误一并静默
      if (err?.code === "P2021" || /no such table/i.test(err?.message || "")) {
        tableMissing = true;
        return;
      }
      console.warn("[AgentEventLogger] write failed:", err?.message || err);
    }
  })();
}
