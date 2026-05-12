/**
 * OpenTelemetry 可观测模块
 *
 * 功能：
 * 1. Trace ID 生成 + Span 管理
 * 2. 操作耗时记录 + 状态追踪
 * 3. 结构化日志输出（面试展示）
 * 4. AsyncLocalStorage 上下文传递 + JSONL 持久化（GuardRail 联动）
 *
 * 使用方法：
 * ```typescript
 * // 创建 Trace
 * const trace = startTrace(userId, conversationId);
 * runInTrace(trace, async () => {
 *   await withSpan("intent_recognition", async (span) => {
 *     span.setAttribute("intent", "generalQA");
 *     // ... 执行操作 ...
 *   });
 * });
 * endTrace(trace); // 自动 flush 到 JSONL
 * ```
 */

import { TraceContext, createTraceContext, getTraceContext, setTraceContext, deleteTraceContext } from "./context";
import { Span, SpanOptions, createSpan } from "./span";
import { StructuredLogger, LogLevel, getLogger, setLogger } from "./logger";
import { formatTraceReport, formatTraceJson, formatSpanBrief } from "./formatter";
import { runInTrace, getCurrentTrace } from "./async-context";
import { withSpan, withSpanGen } from "./instrumentation";
import { exportTraceToJsonl, readTraceForConversation, listTracedConversations } from "./exporters/jsonl-exporter";

// 重导出
export { TraceContext, createTraceContext, getTraceContext, setTraceContext, deleteTraceContext };
export { Span, SpanOptions, createSpan };
export { StructuredLogger, LogLevel, getLogger, setLogger };
export { formatTraceReport, formatTraceJson, formatSpanBrief };
export { runInTrace, getCurrentTrace };
export { withSpan, withSpanGen };
export { exportTraceToJsonl, readTraceForConversation, listTracedConversations };

/**
 * 快捷创建 Trace 并自动输出日志
 */
export function startTrace(userId?: string, conversationId?: string): TraceContext {
  const trace = createTraceContext(userId, conversationId);
  getLogger().logTraceStart(trace);
  return trace;
}

/**
 * 快捷结束 Trace 并输出汇总日志 + 落盘 JSONL
 */
export function endTrace(trace: TraceContext): void {
  trace.endTrace();
  getLogger().logTraceEnd(trace);
  // 持久化到 JSONL，方便 Dashboard 回放 + grep 排查
  try {
    exportTraceToJsonl(trace);
  } catch {
    /* swallow，trace 导出失败不影响主流程 */
  }
  deleteTraceContext(trace.traceId);
}
