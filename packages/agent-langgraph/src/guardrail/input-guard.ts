/**
 * L1 InputGuard —— 输入端 Prompt 注入检测
 *
 * 设计：
 *   - 纯规则 + 启发式，0 token 0 LLM 调用
 *   - 多条规则命中合并，maxRisk = 最高风险
 *   - HIGH/CRITICAL → action=block；MEDIUM → action=sanitize（删伪角色头）；LOW → 仅 log
 *
 * 面试讲法：
 *   "L1 是 cheapest first：先用正则挡掉 80% 的常见注入（DAN/忽略以上/伪角色），
 *    剩下 20% 的边角情况让 L3 输出层兜底。如果上 LLM 二次判断每次至少 +500ms，
 *    在流式场景里是不可接受的成本。"
 */

import { DEFAULT_POLICIES } from "./policies";
import type { GuardHit, GuardResult, RiskLevel } from "./types";
import { getCurrentTrace } from "../otel/async-context";
import { logAgentEvent } from "../utils/event-logger";

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function maxRisk(hits: GuardHit[]): RiskLevel {
  if (hits.length === 0) return "low";
  return hits.reduce<RiskLevel>((acc, h) => (RISK_RANK[h.risk] > RISK_RANK[acc] ? h.risk : acc), "low");
}

function sanitize(input: string, hits: GuardHit[]): string {
  let cleaned = input;
  for (const h of hits) {
    if (h.matchedText) {
      cleaned = cleaned.split(h.matchedText).join("[REDACTED]");
    }
  }
  return cleaned;
}

export interface InputGuardOptions {
  userId?: string;
  conversationId?: string;
  policies?: typeof DEFAULT_POLICIES;
}

/**
 * 检查用户输入是否含注入风险
 */
export function checkInput(input: string, options: InputGuardOptions = {}): GuardResult {
  const t0 = Date.now();
  const policies = options.policies ?? DEFAULT_POLICIES;
  const hits: GuardHit[] = [];

  // 超长输入直接 block（防 prompt-overflow / 拒绝服务）
  if (input.length > policies.maxInputLength) {
    hits.push({
      ruleId: "inj-too-long",
      ruleName: "input-too-long",
      layer: "input",
      risk: "high",
      reason: `输入超出 ${policies.maxInputLength} 字符上限`,
    });
  }

  for (const rule of policies.injectionRules) {
    const m = input.match(rule.pattern);
    if (m) {
      hits.push({
        ruleId: rule.id,
        ruleName: rule.id,
        layer: "input",
        risk: rule.risk,
        reason: rule.reason,
        matchedText: m[0],
        suggestion: rule.risk === "high" || rule.risk === "critical" ? "block" : "sanitize",
      });
    }
  }

  const top = maxRisk(hits);
  let action: "allow" | "sanitize" | "block";
  if (hits.length === 0) action = "allow";
  else if (top === "high" || top === "critical") action = "block";
  else if (top === "medium") action = "sanitize";
  else action = "allow";

  const result: GuardResult = {
    layer: "input",
    passed: action !== "block",
    hits,
    maxRisk: top,
    action,
    sanitizedInput: action === "sanitize" ? sanitize(input, hits) : undefined,
    durationMs: Date.now() - t0,
  };

  // ============ Observability：写 OTel span + AgentEvent ============
  const trace = getCurrentTrace();
  if (trace) {
    const span = trace.startSpan("guardrail.input");
    span.setAttributes({
      hits: hits.length,
      maxRisk: top,
      action,
      inputLength: input.length,
    });
    trace.endSpan(span, action === "block" ? "error" : "success");
  }

  if (options.userId) {
    logAgentEvent({
      userId: options.userId,
      conversationId: options.conversationId,
      eventType: "guardrail",
      eventName: "input_check",
      payload: {
        layer: "input",
        action,
        maxRisk: top,
        hits: hits.map(h => ({ id: h.ruleId, risk: h.risk, reason: h.reason })),
      },
      durationMs: result.durationMs,
    });
  }

  return result;
}
