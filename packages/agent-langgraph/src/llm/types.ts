/**
 * LLM 多模型分级路由 —— 类型定义
 *
 * 三档分级：
 *   T1 (light)   — 极速、最便宜，用于意图分类 / 事实提取 / 快捷回复
 *   T2 (main)    — 主力，用于通用问答 / 流式回答 / 进度查询 / 早安
 *   T3 (heavy)   — 高质量推理，用于任务生成（结构化输出 + 多约束）
 *
 * 同一供应商内分级 → 控制成本（轻任务别用大模型）
 * 跨供应商兜底 → 提升可用性（单 vendor 限流不影响主链路）
 */

import type { ChatOpenAIFields } from "@langchain/openai";

export type LLMTier = "T1" | "T2" | "T3";

/**
 * 路由提示：调用方告诉 router 当前任务的语义，
 * router 再映射到具体 tier → 具体 model。
 */
export interface RoutingHint {
  /** 任务类型 —— 最高优先级信号 */
  task?:
    | "intent_classification"
    | "fact_extraction"
    | "quick_reply"
    | "general_qa"
    | "task_generation"
    | "emotion_support"
    | "morning_greeting"
    | "progress_query";
  /** 业务意图（次要信号，作 task 不明时兜底） */
  intent?: string;
  /** 输入长度（用作 tier 判定的辅助信号） */
  queryLength?: number;
  /** RAG 三级策略命中档位 */
  ragTier?: "direct" | "candidates" | "expand" | "fallback";
  /** 强制指定 tier（覆盖所有自动判定） */
  forceTier?: LLMTier;
}

/**
 * 一个 tier 的具体配置：模型 + 端点 + 鉴权。
 * 不同 tier 默认共享 DashScope 端点，但允许通过 env 单独覆盖
 * （比如 T1 指给智谱 GLM-4-Flash 做"多供应商兜底"演示）。
 */
export interface TierConfig {
  tier: LLMTier;
  model: string;
  baseURL: string;
  apiKey: string;
  /** 该 tier 默认 temperature，可被调用方 override */
  defaultTemperature: number;
  /** 该 tier 默认 maxTokens */
  defaultMaxTokens: number;
}

/** LangChain ChatOpenAI 构造参数（用于薄壳代理） */
export type ChatModelOptions = Partial<Omit<ChatOpenAIFields, "model" | "apiKey">>;
