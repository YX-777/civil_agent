/**
 * OpenTelemetry 可观测模块
 *
 * 功能：
 * 1. Trace ID 生成 + Span 管理
 * 2. 操作耗时记录 + 状态追踪
 * 3. 结构化日志输出（面试展示）
 *
 * 使用方法：
 * ```typescript
 * // 创建 Trace
 * const trace = createTraceContext(userId, conversationId);
 * getLogger().logTraceStart(trace);
 *
 * // 创建 Span
 * const span = trace.startSpan("intent_recognition");
 * // ... 执行操作 ...
 * span.setAttributes({ intent: "generalQA" });
 * trace.endSpan(span, "success");
 *
 * // 结束 Trace
 * trace.endTrace();
 * getLogger().logTraceEnd(trace);
 * ```
 */

import { TraceContext, createTraceContext, getTraceContext, setTraceContext, deleteTraceContext } from "./context";
import { Span, SpanOptions, createSpan } from "./span";
import { StructuredLogger, LogLevel, getLogger, setLogger } from "./logger";
import { formatTraceReport, formatTraceJson, formatSpanBrief } from "./formatter";

// 重导出
export { TraceContext, createTraceContext, getTraceContext, setTraceContext, deleteTraceContext };
export { Span, SpanOptions, createSpan };
export { StructuredLogger, LogLevel, getLogger, setLogger };
export { formatTraceReport, formatTraceJson, formatSpanBrief };

/**
 * 快捷创建 Trace 并自动输出日志
 */
export function startTrace(userId?: string, conversationId?: string): TraceContext {
  const trace = createTraceContext(userId, conversationId);
  getLogger().logTraceStart(trace);
  return trace;
}

/**
 * 快捷结束 Trace 并输出汇总日志
 */
export function endTrace(trace: TraceContext): void {
  trace.endTrace();
  getLogger().logTraceEnd(trace);
  deleteTraceContext(trace.traceId);
}