/**
 * 多模型分级路由 —— router
 *
 * 1) RoutingHint → LLMTier  （pickTier）
 * 2) LLMTier → TierConfig   （resolveTierConfig，从 env 读模型/端点/鉴权）
 *
 * env 约定（默认全部跑在 DashScope 百炼里，按需可单独切供应商）：
 *   LLM_MODEL_T1=qwen-turbo-latest     # 轻
 *   LLM_MODEL_T2=qwen-plus             # 主力（默认替换原 qwen3.6-plus）
 *   LLM_MODEL_T3=qwen-max              # 推理
 *
 * 可选单 tier 切供应商：
 *   LLM_BASE_URL_T1=https://open.bigmodel.cn/api/paas/v4
 *   LLM_API_KEY_T1=<zhipu-key>
 *   LLM_MODEL_T1=glm-4-flash
 */

import type { LLMTier, RoutingHint, TierConfig } from "./types";

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

/**
 * 复杂度决策：任务类型 > 显式意图 > RAG tier > 兜底 T2
 *
 * 设计原则：宁愿往上选一档，也不要让"任务生成"这种结构化输出跑在小模型上 ——
 * 小模型不遵循 JSON / 多约束的概率显著更高，成本反而更高（要重试）。
 */
export function pickTier(hint: RoutingHint = {}): LLMTier {
  if (hint.forceTier) return hint.forceTier;

  // task 是最强信号
  switch (hint.task) {
    case "intent_classification":
    case "fact_extraction":
    case "quick_reply":
      return "T1";
    case "task_generation":
      return "T3";
    case "emotion_support":
    case "general_qa":
    case "morning_greeting":
    case "progress_query":
      return "T2";
  }

  // 没有显式 task，用 intent 兜底
  if (hint.intent === "create_task" || hint.intent === "update_task") return "T3";

  // RAG 完全没命中 → 让 T2 凭 base knowledge 答（不上 T3，避免无谓花费）
  if (hint.ragTier === "fallback") return "T2";

  return "T2";
}

/**
 * 从 env 读取某 tier 的具体配置。
 * 单 tier 可单独覆盖 BASE_URL/API_KEY/MODEL，没设则回落到 DashScope 全局值。
 */
export function resolveTierConfig(tier: LLMTier): TierConfig {
  const globalApiKey = process.env.DASHSCOPE_API_KEY || "";
  const globalBase = DEFAULT_BASE_URL;

  // 各 tier 默认模型
  const defaultModel: Record<LLMTier, string> = {
    T1: "qwen-turbo-latest",
    T2: "qwen-plus",
    T3: "qwen-max",
  };

  const model = process.env[`LLM_MODEL_${tier}`] || defaultModel[tier];
  const baseURL = process.env[`LLM_BASE_URL_${tier}`] || globalBase;
  const apiKey = process.env[`LLM_API_KEY_${tier}`] || globalApiKey;

  const defaultTemperature = tier === "T1" ? 0 : 0.2;
  const defaultMaxTokens = tier === "T1" ? 300 : 4096;

  return { tier, model, baseURL, apiKey, defaultTemperature, defaultMaxTokens };
}

/**
 * 便捷：直接根据 hint 拿配置。
 */
export function resolveByHint(hint: RoutingHint = {}): TierConfig {
  return resolveTierConfig(pickTier(hint));
}
