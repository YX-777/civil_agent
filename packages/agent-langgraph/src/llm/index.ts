/**
 * LLM 多模型分级路由 —— 对外入口
 */

export type { LLMTier, RoutingHint, TierConfig } from "./types";
export { pickTier, resolveTierConfig, resolveByHint } from "./router";
export { getChatModel, startStreamLLM, chatLLM } from "./client";
