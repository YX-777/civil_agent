/**
 * L2 ToolGuard —— 工具参数校验 + 危险参数拦截
 *
 * 设计：
 *   1. Zod schema 强类型校验（每个 tool 一个 schema，调用前先 parse）
 *   2. 黑名单 pattern 拦截危险参数（SQL/Shell/SSRF）
 *   3. 长度限制 + URL 协议白名单
 *
 * 用法：
 *   const result = checkToolInvocation("web_search", { query: "..." });
 *   if (!result.passed) {
 *     // 阻断 + 返回兜底数据
 *   }
 */

import { z, ZodError } from "zod";
import { DEFAULT_POLICIES } from "./policies";
import type { GuardHit, GuardResult } from "./types";
import { getCurrentTrace } from "../otel/async-context";
import { logAgentEvent } from "../utils/event-logger";

// ============ 工具 schema 注册表 ============

const webSearchSchema = z.object({
  query: z.string().min(1).max(500),
});

const ragRetrieveSchema = z.object({
  query: z.string().min(1).max(1000),
  topK: z.number().int().min(1).max(20).optional(),
  category: z.string().max(50).optional(),
});

const memoryFusionSchema = z.object({
  userId: z.string().min(1).max(100),
  query: z.string().min(1).max(1000),
});

const TOOL_SCHEMAS: Record<string, z.ZodSchema> = {
  web_search: webSearchSchema,
  rag_retrieve: ragRetrieveSchema,
  memory_fusion: memoryFusionSchema,
};

export interface ToolGuardOptions {
  userId?: string;
  conversationId?: string;
}

/**
 * 校验工具调用参数
 */
export function checkToolInvocation(
  toolName: string,
  args: Record<string, any>,
  options: ToolGuardOptions = {},
): GuardResult {
  const t0 = Date.now();
  const policies = DEFAULT_POLICIES;
  const hits: GuardHit[] = [];

  // ---- 1) Schema 校验 ----
  const schema = TOOL_SCHEMAS[toolName];
  if (schema) {
    try {
      schema.parse(args);
    } catch (err) {
      const issues = err instanceof ZodError ? err.issues : [{ message: String(err), path: [] as (string | number)[] }];
      for (const issue of issues) {
        hits.push({
          ruleId: `tool-schema-${toolName}-${issue.path.join(".") || "_"}`,
          ruleName: `schema:${toolName}`,
          layer: "tool",
          risk: "high",
          reason: `参数校验失败: ${issue.message} (path=${issue.path.join(".") || "root"})`,
        });
      }
    }
  }

  // ---- 2) 黑名单扫描 ----
  for (const [key, val] of Object.entries(args)) {
    if (typeof val !== "string") continue;
    if (val.length > policies.maxToolQueryLength) {
      hits.push({
        ruleId: `tool-len-${key}`,
        ruleName: "tool-arg-too-long",
        layer: "tool",
        risk: "medium",
        reason: `参数 ${key} 长度超过 ${policies.maxToolQueryLength}`,
      });
    }
    for (const bl of policies.toolBlacklist) {
      const m = val.match(bl.pattern);
      if (m) {
        hits.push({
          ruleId: `tool-blacklist-${key}`,
          ruleName: "tool-blacklist-hit",
          layer: "tool",
          risk: "high",
          reason: bl.reason,
          matchedText: m[0],
        });
      }
    }
  }

  const action: "allow" | "block" = hits.some(h => h.risk === "high" || h.risk === "critical") ? "block" : "allow";
  const result: GuardResult = {
    layer: "tool",
    passed: action === "allow",
    hits,
    maxRisk: hits.length === 0 ? "low" : hits.reduce((acc, h) => {
      const rank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
      return rank[h.risk] > rank[acc as keyof typeof rank] ? h.risk : acc;
    }, "low" as "low" | "medium" | "high" | "critical"),
    action,
    metadata: { toolName, argKeys: Object.keys(args) },
    durationMs: Date.now() - t0,
  };

  const trace = getCurrentTrace();
  if (trace) {
    const span = trace.startSpan("guardrail.tool");
    span.setAttributes({
      tool: toolName,
      hits: hits.length,
      action,
      maxRisk: result.maxRisk,
      // 把命中详情写到 span 上，方便 chat done 事件聚合给前端徽章展示
      hitsDetail: hits.slice(0, 5).map(h => ({ ruleId: h.ruleId, reason: h.reason, risk: h.risk, matchedText: h.matchedText })),
    });
    trace.endSpan(span, action === "block" ? "error" : "success");
  }

  if (options.userId) {
    logAgentEvent({
      userId: options.userId,
      conversationId: options.conversationId,
      eventType: "guardrail",
      eventName: "tool_check",
      payload: {
        layer: "tool",
        tool: toolName,
        action,
        maxRisk: result.maxRisk,
        hits: hits.map(h => ({ id: h.ruleId, risk: h.risk, reason: h.reason })),
      },
      durationMs: result.durationMs,
    });
  }

  return result;
}

/** 列出已注册 schema 的工具 */
export function listGuardedTools(): string[] {
  return Object.keys(TOOL_SCHEMAS);
}
