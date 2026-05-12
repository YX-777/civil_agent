/**
 * JSONL Span Exporter —— Trace 落盘到 logs/traces/{conversationId}.jsonl
 *
 * 设计：
 *   - 一个会话一个 .jsonl 文件，按 conversationId 切分，方便回放
 *   - 每行一个 span（含 traceId / spanId / parentId / 属性 / 耗时 / 状态）
 *   - 写入失败 silently 降级，不影响主流程
 *
 * 面试讲法：
 *   "用 JSONL 是因为它能 grep / 流式追加 / 兼容 OTLP-JSON 格式，
 *    比直接接 Jaeger / Tempo 部署成本低，但格式上一致，可平滑迁移。"
 */

import fs from "node:fs";
import path from "node:path";
import type { TraceContext } from "../context";
import type { Span } from "../span";

const TRACE_DIR = process.env.OTEL_TRACE_DIR || path.join(process.cwd(), "logs", "traces");

function ensureDir(): void {
  try {
    if (!fs.existsSync(TRACE_DIR)) {
      fs.mkdirSync(TRACE_DIR, { recursive: true });
    }
  } catch {
    /* swallow */
  }
}

function serializeSpan(span: Span, trace: TraceContext): Record<string, any> {
  return {
    traceId: trace.traceId,
    spanId: span.id,
    parentSpanId: span.parentId,
    name: span.name,
    startTime: span.startTime,
    endTime: span.endTime,
    durationMs: span.duration ?? (span.endTime ? span.endTime - span.startTime : null),
    status: span.status,
    error: span.error,
    attributes: span.attributes,
    userId: trace.userId,
    conversationId: trace.conversationId,
  };
}

/** 导出整个 trace（所有 span 一次性写入） */
export function exportTraceToJsonl(trace: TraceContext): void {
  try {
    ensureDir();
    const fileKey = trace.conversationId || "no-session";
    const safeKey = fileKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(TRACE_DIR, `${safeKey}.jsonl`);

    const lines = trace.allSpans.map(span => JSON.stringify(serializeSpan(span, trace))).join("\n") + "\n";
    fs.appendFileSync(filePath, lines, "utf-8");
  } catch (err: any) {
    console.warn("[JsonlExporter] write failed:", err?.message || err);
  }
}

/** 读取某个会话的 trace 行 —— 给 Dashboard Trace Viewer 用 */
export function readTraceForConversation(conversationId: string, limit: number = 200): any[] {
  try {
    const safeKey = conversationId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = path.join(TRACE_DIR, `${safeKey}.jsonl`);
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split("\n").filter(Boolean);
    const parsed: any[] = [];
    for (const ln of lines) {
      try {
        parsed.push(JSON.parse(ln));
      } catch {
        // skip malformed
      }
    }
    return parsed.slice(-limit);
  } catch {
    return [];
  }
}

/** 列出所有有 trace 的会话 ID */
export function listTracedConversations(): string[] {
  try {
    ensureDir();
    const files = fs.readdirSync(TRACE_DIR);
    return files
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(/\.jsonl$/, ""));
  } catch {
    return [];
  }
}
