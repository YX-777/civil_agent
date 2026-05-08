/**
 * Span Recorder - 操作跨度记录器
 *
 * 功能：
 * 1. 记录操作名称、耗时、状态
 * 2. 支持属性记录（userId、intent、query）
 * 3. 支持嵌套 Span
 */

export interface SpanOptions {
  id?: string;
  name: string;
  traceId?: string;
  parentId?: string | null;
  startTime?: number;
  attributes?: Record<string, any>;
}

export class Span {
  id: string;
  name: string;
  traceId: string;
  parentId: string | null;
  startTime: number;
  endTime: number | null = null;
  duration: number | null = null;
  status: "pending" | "success" | "error" = "pending";
  error?: string;
  attributes: Record<string, any> = {};
  children: Span[] = [];

  constructor(options: SpanOptions) {
    this.id = options.id || `span_${Math.random().toString(36).slice(2, 9)}`;
    this.name = options.name;
    this.traceId = options.traceId || "";
    this.parentId = options.parentId || null;
    this.startTime = options.startTime || Date.now();
    this.attributes = options.attributes || {};
  }

  /**
   * 设置属性
   */
  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }

  /**
   * 批量设置属性
   */
  setAttributes(attrs: Record<string, any>): void {
    Object.assign(this.attributes, attrs);
  }

  /**
   * 结束 Span，计算耗时
   */
  end(status: "success" | "error" = "success", error?: string): void {
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    this.status = status;
    if (error) {
      this.error = error;
    }
  }

  /**
   * 获取耗时（毫秒）
   */
  getDuration(): number {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return Date.now() - this.startTime;
  }

  /**
   * 获取状态图标
   */
  getStatusIcon(): string {
    switch (this.status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  }

  /**
   * 格式化输出（用于日志）
   */
  format(indent: number = 0): string {
    const prefix = "  ".repeat(indent);
    const indentNext = indent + 1;

    const mainLine = `${prefix}[Span] ${this.name.padEnd(20)} | ${this.getDuration()}ms | ${this.getStatusIcon()} ${this.status}`;

    // 属性输出
    const attrLines = Object.entries(this.attributes)
      .map(([key, value]) => `${prefix}  ${key}=${value}`)
      .join("\n");

    // 子 Span 输出
    const childLines = this.children
      .map(child => child.format(indentNext))
      .join("\n");

    let output = mainLine;
    if (attrLines) output += ` | ${Object.entries(this.attributes).map(([k, v]) => `${k}=${v}`).join(", ")}`;
    if (childLines) output += `\n${childLines}`;

    return output;
  }
}

/**
 * 快捷创建 Span
 */
export function createSpan(name: string, attributes?: Record<string, any>): Span {
  return new Span({ name, attributes });
}