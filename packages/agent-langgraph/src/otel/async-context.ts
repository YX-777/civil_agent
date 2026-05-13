/**
 * AsyncLocalStorage 隐式上下文传递
 *
 * 用途：让节点 / 工具 / LLM 调用不必显式接收 TraceContext 参数，
 *      自动从 async 调用栈里拿。这样 withSpan() 可以零侵入式包装任意 async 函数。
 *
 *   "OpenTelemetry 标准的 context propagation 在 Node 里靠 AsyncLocalStorage 实现，
 *    它能让一个 trace 贯穿整条异步调用链，不需要手动透传上下文。"
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { TraceContext } from "./context";

const traceStorage = new AsyncLocalStorage<TraceContext>();

/** 在 trace 上下文里运行函数 */
export function runInTrace<T>(trace: TraceContext, fn: () => T): T {
  return traceStorage.run(trace, fn);
}

/** 获取当前 async 链上的 trace（可能为 undefined） */
export function getCurrentTrace(): TraceContext | undefined {
  return traceStorage.getStore();
}
