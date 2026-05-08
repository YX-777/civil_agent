/**
 * Structured Logger - 结构化日志输出
 *
 * 功能：
 * 1. 结构化日志格式（JSON）
 * 2. 彩色输出（面试展示美观）
 * 3. Trace 汇总报告
 */

import { TraceContext } from "./context";
import { Span } from "./span";

// ANSI 颜色码
const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

/**
 * 日志级别
 */
export type LogLevel = "trace" | "span" | "info" | "warn" | "error";

/**
 * 结构化日志记录器
 */
export class StructuredLogger {
  private enabled: boolean = true;
  private colorEnabled: boolean = true;

  constructor(options?: { enabled?: boolean; colorEnabled?: boolean }) {
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.colorEnabled !== undefined) this.colorEnabled = options.colorEnabled;
  }

  /**
   * 输出 Trace 开始
   */
  logTraceStart(context: TraceContext): void {
    if (!this.enabled) return;

    const separator = "=".repeat(60);
    const header = this.colorize(`${COLORS.bold}${COLORS.cyan}📊 [Trace] ${context.traceId} 开始`, COLORS.reset);

    console.log(separator);
    console.log(header);
    console.log(separator);
  }

  /**
   * 输出 Span 记录
   */
  logSpan(spanName: string, duration: number, status: string, attributes?: Record<string, any>): void {
    if (!this.enabled) return;

    const statusIcon = status === "success" ? "✅" : status === "error" ? "❌" : "⏳";
    const statusColor = status === "success" ? COLORS.green : status === "error" ? COLORS.red : COLORS.yellow;

    const attrStr = attributes
      ? Object.entries(attributes).map(([k, v]) => `${k}=${v}`).join(" | ")
      : "";

    const main = this.colorize(`${statusColor}[Span]`, COLORS.reset);
    const paddedName = spanName.padEnd(20);

    const output = `${main} ${paddedName} | ${duration}ms | ${statusIcon} ${status}${attrStr ? ` | ${attrStr}` : ""}`;

    console.log(output);
  }

  /**
   * 输出子 Span（带缩进）
   */
  logChildSpan(indent: number, spanName: string, duration: number, status: string): void {
    if (!this.enabled) return;

    const prefix = "  ".repeat(indent) + "└── ";
    const statusIcon = status === "success" ? "✅" : status === "error" ? "❌" : "⏳";

    console.log(`${prefix}[Span] ${spanName.padEnd(18)} | ${duration}ms | ${statusIcon} ${status}`);
  }

  /**
   * 输出 Trace 完成（汇总报告）
   */
  logTraceEnd(context: TraceContext): void {
    if (!this.enabled) return;

    const separator = "=".repeat(60);
    const totalDuration = context.getTotalDuration();

    // 输出所有 Span
    context.getSpanTree().forEach(span => {
      this.logSpanRecursive(span, 0);
    });

    // 输出汇总
    const footer = this.colorize(
      `${COLORS.bold}${COLORS.cyan}📊 [Trace] ${context.traceId} 完成 | 总耗时 ${totalDuration}ms`,
      COLORS.reset
    );

    console.log(separator);
    console.log(footer);
    console.log(separator);
  }

  /**
   * 递归输出 Span 树
   */
  private logSpanRecursive(span: Span, indent: number): void {
    const duration = span.endTime ? span.endTime - span.startTime : span.getDuration();
    const attrStr = Object.entries(span.attributes || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(" | ");

    const statusIcon = span.status === "success" ? "✅" : span.status === "error" ? "❌" : "⏳";
    const statusColor = span.status === "success" ? COLORS.green : span.status === "error" ? COLORS.red : COLORS.yellow;

    if (indent === 0) {
      const main = this.colorize(`${statusColor}[Span]`, COLORS.reset);
      console.log(`${main} ${span.name.padEnd(20)} | ${duration}ms | ${statusIcon} ${span.status}${attrStr ? ` | ${attrStr}` : ""}`);
    } else {
      const prefix = "  ".repeat(indent - 1) + "  └── ";
      console.log(`${prefix}[Span] ${span.name.padEnd(18)} | ${duration}ms | ${statusIcon} ${span.status}`);
    }

    // 输出子节点
    (span.children || []).forEach(child => {
      this.logSpanRecursive(child, indent + 1);
    });
  }

  /**
   * 输出 JSON 格式日志
   */
  logJson(data: any): void {
    if (!this.enabled) return;
    console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 输出普通日志
   */
  log(level: LogLevel, message: string, data?: any): void {
    if (!this.enabled) return;

    const colorMap = {
      trace: COLORS.cyan,
      span: COLORS.blue,
      info: COLORS.green,
      warn: COLORS.yellow,
      error: COLORS.red,
    };

    const color = colorMap[level];
    const levelStr = this.colorize(`${color}[${level.toUpperCase()}]`, COLORS.reset);

    if (data) {
      console.log(`${levelStr} ${message}`, data);
    } else {
      console.log(`${levelStr} ${message}`);
    }
  }

  /**
   * 颜色化输出
   */
  private colorize(text: string, reset: string): string {
    if (!this.colorEnabled) return text.replace(/\x1b\[[0-9;]*m/g, "");
    return text + reset;
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 启用/禁用颜色
   */
  setColorEnabled(enabled: boolean): void {
    this.colorEnabled = enabled;
  }
}

// 全局 Logger 实例
let globalLogger: StructuredLogger | null = null;

export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = new StructuredLogger();
  }
  return globalLogger;
}

export function setLogger(logger: StructuredLogger): void {
  globalLogger = logger;
}