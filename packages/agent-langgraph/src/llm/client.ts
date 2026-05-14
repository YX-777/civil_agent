/**
 * 多模型分级路由 —— 统一客户端
 *
 * 对外两个入口：
 *   1) getChatModel(hint, opts?)          → ChatOpenAI 实例（用于 LangChain 调用方）
 *   2) streamLLM({ messages, hint, ... }) → 异步生成器，逐 chunk yield，
 *                                            兼容 OpenAI compatible 流式协议
 *
 * 设计要点：
 *   - 默认走 DashScope 百炼，env 可单 tier 切供应商（GLM/DeepSeek 都是 OpenAI 协议）
 *   - 所有 tier 共享一个 fetch 实现，分流只在 model + endpoint + key 这三层
 *   - getChatModel 是薄壳：原有 createLLM/createLightLLM 代理过去即可
 */

import { ChatOpenAI } from "@langchain/openai";
import type { ChatModelOptions, LLMTier, RoutingHint } from "./types";
import { pickTier, resolveTierConfig } from "./router";

/** 给 LangChain 调用方使用的工厂 */
export function getChatModel(
  hintOrTier: RoutingHint | LLMTier = {},
  opts: ChatModelOptions = {}
): ChatOpenAI {
  const tier: LLMTier =
    typeof hintOrTier === "string" ? hintOrTier : pickTier(hintOrTier);
  const cfg = resolveTierConfig(tier);

  return new ChatOpenAI({
    modelName: cfg.model,
    apiKey: cfg.apiKey,
    temperature: opts.temperature ?? cfg.defaultTemperature,
    maxTokens: opts.maxTokens ?? cfg.defaultMaxTokens,
    configuration: { baseURL: cfg.baseURL, ...opts.configuration },
    ...stripUsedKeys(opts),
  });
}

function stripUsedKeys(o: ChatModelOptions): ChatModelOptions {
  const { temperature: _t, maxTokens: _m, configuration: _c, ...rest } = o as any;
  return rest;
}

/**
 * 流式聊天的统一入口。
 * 直接打 OpenAI 兼容 /chat/completions，stream=true，逐行解析 SSE。
 * 调用方负责把 chunk 翻译成自己的协议（StreamChunk / SSE）。
 *
 * 选 fetch 而非 LangChain.stream 的原因：
 *   - DashScope 的 reasoning_content（思考流）必须直读 raw SSE
 *   - 流式 first-byte 时间需要自己测，方便接 OTel
 */
export interface StreamLLMOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  hint?: RoutingHint;
  tier?: LLMTier;
  temperature?: number;
  maxTokens?: number;
  /** Qwen3 思考模式：true → 返回 reasoning_content（英文 self-talk） */
  enableThinking?: boolean;
  /** AbortSignal */
  signal?: AbortSignal;
}

export interface StreamLLMResult {
  model: string;
  tier: LLMTier;
  /** body Reader（调用方负责 decode 和 SSE parse） */
  reader: ReadableStreamDefaultReader<Uint8Array>;
}

export async function startStreamLLM(opts: StreamLLMOptions): Promise<StreamLLMResult> {
  const tier: LLMTier = opts.tier || pickTier(opts.hint || {});
  const cfg = resolveTierConfig(tier);

  const response = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: opts.messages,
      temperature: opts.temperature ?? cfg.defaultTemperature,
      max_tokens: opts.maxTokens ?? cfg.defaultMaxTokens,
      stream: true,
      enable_thinking: opts.enableThinking ?? false,
    }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`LLM stream HTTP ${response.status} (model=${cfg.model}): ${errBody.slice(0, 300)}`);
  }

  return {
    model: cfg.model,
    tier,
    reader: response.body.getReader(),
  };
}

/** 非流式：返回 content 字符串 + 所用 model/tier */
export async function chatLLM(opts: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  hint?: RoutingHint;
  tier?: LLMTier;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string; tier: LLMTier }> {
  const tier: LLMTier = opts.tier || pickTier(opts.hint || {});
  const cfg = resolveTierConfig(tier);

  const response = await fetch(`${cfg.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: opts.messages,
      temperature: opts.temperature ?? cfg.defaultTemperature,
      max_tokens: opts.maxTokens ?? cfg.defaultMaxTokens,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`LLM HTTP ${response.status} (model=${cfg.model}): ${errBody.slice(0, 300)}`);
  }
  const data = (await response.json()) as any;
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: cfg.model,
    tier,
  };
}
