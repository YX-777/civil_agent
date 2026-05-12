/**
 * 高阶函数 withSpan —— 零侵入式 span 包装
 *
 * 设计目标：
 *   把"创建 span → 计时 → 记录属性 → 结束 span"这一坨样板代码封装掉，
 *   让节点 / 工具 / LLM 调用只关心业务逻辑。
 *
 * 用法（同步）：
 *   const result = await withSpan("llm.call", async (span) => {
 *     span.setAttribute("model", "qwen3.6-plus");
 *     return await fetch(...);
 *   });
 *
 * 用法（生成器）：
 *   yield* withSpanGen("llm.stream", async function* (span) {
 *     for await (const chunk of stream) {
 *       span.setAttribute("chunks", ++count);
 *       yield chunk;
 *     }
 *   });
 *
 * 自动从 AsyncLocalStorage 取当前 trace，没有 trace 时直接执行业务逻辑、不报错。
 */

import { getCurrentTrace } from "./async-context";
import type { Span } from "./span";

/** 包装 async 函数 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span | null) => Promise<T>,
  attributes?: Record<string, any>,
): Promise<T> {
  const trace = getCurrentTrace();
  if (!trace) {
    // 没有 trace 上下文（如非 chat 入口的调用），降级执行
    return fn(null);
  }

  const span = trace.startSpan(name);
  if (attributes) span.setAttributes(attributes);

  try {
    const result = await fn(span);
    span.end("success");
    trace.endSpan(span, "success");
    return result;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    span.end("error", msg);
    trace.endSpan(span, "error", msg);
    throw err;
  }
}

/** 包装 async generator —— 节点 stream 链路用 */
export async function* withSpanGen<T>(
  name: string,
  fn: (span: Span | null) => AsyncGenerator<T, unknown, unknown>,
  attributes?: Record<string, any>,
): AsyncGenerator<T, unknown, unknown> {
  const trace = getCurrentTrace();
  if (!trace) {
    yield* fn(null);
    return;
  }

  const span = trace.startSpan(name);
  if (attributes) span.setAttributes(attributes);

  try {
    const gen = fn(span);
    let result;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        result = value;
        break;
      }
      yield value;
    }
    span.end("success");
    trace.endSpan(span, "success");
    return result;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    span.end("error", msg);
    trace.endSpan(span, "error", msg);
    throw err;
  }
}
