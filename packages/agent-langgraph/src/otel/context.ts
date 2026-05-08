/**
 * Trace Context - 追踪上下文管理
 *
 * 功能：
 * 1. 生成唯一 Trace ID
 * 2. 管理 Span 链路（创建、嵌套、结束）
 * 3. Context 传递机制
 */

import { Span, SpanOptions } from "./span";

// 生成唯一 ID
function generateId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateSpanId(): string {
  return `span_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Trace Context - 一个请求的完整追踪上下文
 */
export class TraceContext {
  traceId: string;
  rootSpan: Span;
  currentSpan: Span | null = null;
  allSpans: Span[] = [];
  startTime: number;
  userId?: string;
  conversationId?: string;

  constructor(userId?: string, conversationId?: string) {
    this.traceId = generateId();
    this.startTime = Date.now();
    this.userId = userId;
    this.conversationId = conversationId;

    // 创建根 Span
    this.rootSpan = new Span({
      id: generateSpanId(),
      name: "api_request",
      traceId: this.traceId,
      parentId: null,
      startTime: this.startTime,
    });
    this.allSpans.push(this.rootSpan);
    this.currentSpan = this.rootSpan;
  }

  /**
   * 创建子 Span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    const parentId = this.currentSpan?.id || null;
    const span = new Span({
      id: generateSpanId(),
      name,
      traceId: this.traceId,
      parentId,
      startTime: Date.now(),
      ...options,
    });

    // 添加为当前 Span 的子节点
    if (this.currentSpan) {
      this.currentSpan.children.push(span);
    }

    this.allSpans.push(span);
    this.currentSpan = span;

    return span;
  }

  /**
   * 结束当前 Span，返回父级
   */
  endSpan(span: Span, status: "success" | "error" = "success", error?: string): void {
    span.endTime = Date.now();
    span.status = status;
    if (error) {
      span.error = error;
    }

    // 返回父级 Span
    if (span.parentId) {
      const parent = this.allSpans.find(s => s.id === span.parentId);
      this.currentSpan = parent || this.rootSpan;
    } else {
      this.currentSpan = this.rootSpan;
    }
  }

  /**
   * 结束整个 Trace
   */
  endTrace(): void {
    this.rootSpan.endTime = Date.now();
    this.rootSpan.status = "success";
  }

  /**
   * 获取总耗时
   */
  getTotalDuration(): number {
    return this.rootSpan.endTime ? this.rootSpan.endTime - this.startTime : 0;
  }

  /**
   * 获取 Span 树结构（用于日志输出）
   */
  getSpanTree(): Span[] {
    return this.rootSpan.children;
  }
}

// 全局 Trace Context 存储（用于跨模块传递）
const globalTraceContexts = new Map<string, TraceContext>();

/**
 * 获取或创建 Trace Context
 */
export function getTraceContext(traceId: string): TraceContext | undefined {
  return globalTraceContexts.get(traceId);
}

export function setTraceContext(traceId: string, context: TraceContext): void {
  globalTraceContexts.set(traceId, context);
}

export function deleteTraceContext(traceId: string): void {
  globalTraceContexts.delete(traceId);
}

/**
 * 创建新的 Trace Context
 */
export function createTraceContext(userId?: string, conversationId?: string): TraceContext {
  const context = new TraceContext(userId, conversationId);
  setTraceContext(context.traceId, context);
  return context;
}