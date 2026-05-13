/**
 * Trace Formatter - 追踪格式化输出
 *
 * 功能：
 * 1. 格式化 Trace 报告
 * 2. 可读性更好输出
 */

import { TraceContext } from "./context";
import { Span } from "./span";

/**
 * 格式化 Trace 报告
 */
export function formatTraceReport(context: TraceContext): string {
  const lines: string[] = [];
  const separator = "=".repeat(60);

  lines.push(separator);
  lines.push(`📊 [Trace] ${context.traceId}`);
  lines.push(`   用户: ${context.userId || "未知"}`);
  lines.push(`   会话: ${context.conversationId || "未知"}`);
  lines.push(separator);
  lines.push("");

  // 输出 Span 树
  context.allSpans.forEach(span => {
    if (span.parentId === null) return; // 跳过根 Span
    lines.push(formatSpanLine(span, 0));
    span.children.forEach(child => {
      lines.push(formatSpanLine(child, 1));
    });
  });

  lines.push("");
  lines.push(separator);
  lines.push(`📊 [Trace] ${context.traceId} 完成`);
  lines.push(`   总耗时: ${context.getTotalDuration()}ms`);
  lines.push(separator);

  return lines.join("\n");
}

/**
 * 格式化单行 Span
 */
function formatSpanLine(span: Span, indent: number): string {
  const prefix = indent === 0 ? "" : "  ".repeat(indent) + "└── ";
  const duration = span.endTime ? span.endTime - span.startTime : 0;
  const statusIcon = span.status === "success" ? "✅" : span.status === "error" ? "❌" : "⏳";

  const attrStr = indent === 0 && Object.keys(span.attributes).length > 0
    ? ` | ${Object.entries(span.attributes).map(([k, v]) => `${k}=${v}`).join(", ")}`
    : "";

  const nameWidth = indent === 0 ? 20 : 18;
  const paddedName = span.name.padEnd(nameWidth);

  return `${prefix}[Span] ${paddedName} | ${duration}ms | ${statusIcon} ${span.status}${attrStr}`;
}

/**
 * 格式化 JSON 日志（用于调试）
 */
export function formatTraceJson(context: TraceContext): object {
  return {
    traceId: context.traceId,
    userId: context.userId,
    conversationId: context.conversationId,
    startTime: new Date(context.startTime).toISOString(),
    totalDurationMs: context.getTotalDuration(),
    spans: context.allSpans.map(span => ({
      id: span.id,
      name: span.name,
      parentId: span.parentId,
      durationMs: span.endTime ? span.endTime - span.startTime : 0,
      status: span.status,
      attributes: span.attributes,
    })),
  };
}

/**
 * 简短格式（用于实时日志）
 */
export function formatSpanBrief(span: Span): string {
  const duration = span.endTime ? span.endTime - span.startTime : 0;
  const statusIcon = span.status === "success" ? "✅" : span.status === "error" ? "❌" : "⏳";
  return `[Span] ${span.name} | ${duration}ms | ${statusIcon}`;
}