/**
 * 节点定义
 * LangGraph 状态机的各个节点
 */

import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { logger, QuickReplyOption } from "@tech-mate/core";
import type { UserIntent } from "@tech-mate/core";
import { SYSTEM_PROMPTS } from "../prompts/system-prompts";
import { TASK_PROMPTS } from "../prompts/task-prompts";
import { getMCPToolClient } from "../tools/mcp-tools";
import { TimeTools, StringTools, ProgressTools, LogTools } from "../tools/local-tools";
import { getEmotionDetector } from "../middleware/emotion-detector";
import { getContextEnhancer } from "../middleware/context-enhancer";
import { getAgentConfig } from "../config/agent.config";
import type { GraphStateType } from "./state";
import { retrieveWithFallback } from "../utils/rag-fallback";
import { shouldUseWebSearch, webSearch, type WebSearchResult } from "../tools/web-search";
import { logAgentEvent } from "../utils/event-logger";
import { getCurrentTrace } from "../otel/async-context";
import {
  buildGeneralAnswerPrompt,
  resolveXiaohongshuKnowledge,
  shouldRouteToXiaohongshuRag,
} from "./xiaohongshu-rag";
import { parseTaskPlanFromText } from "./task-plan";
import { getMemoryFusionRetriever, type Message } from "../memory";
import { getUserRepository } from "@tech-mate/database";

/**
 * 从用户消息中抽取姓名（正则方式，覆盖最常见的几种中文表达）
 *
 * 命中后回写到 UserProfile.nickname，下次任何会话的 memoryContextPrompt
 * 都会带上"用户称呼"字段。
 *
 * 设计：保守命中而不是大而全。常见 false positive 用排除清单兜底。
 */
const NICKNAME_BLOCKLIST = new Set([
  // 代词
  "我", "你", "他", "她", "它", "您",
  // 疑问代词 —— "我叫什么" 会被误抽成"什么"
  "什么", "啥", "谁", "哪个", "哪位", "几", "多少", "啥子", "什麼",
  // 角色泛称
  "学生", "学习者", "用户", "小白", "新手", "老手",
  "技术", "前端", "后端", "全栈", "工程师", "程序员", "开发者",
  // 客套词
  "好的", "可以", "知道", "明白", "对", "是", "不是",
]);

/**
 * 判断是否是疑问句（问句不该抽姓名，比如"我叫什么"、"我是谁"）
 */
function isInterrogative(text: string): boolean {
  if (!text) return false;
  // 句末问号（中英文）
  if (/[?？]\s*$/.test(text)) return true;
  // 显式疑问代词出现在自报句式中
  if (/我叫\s*(?:什么|啥|谁|哪个)/.test(text)) return true;
  if (/我是\s*(?:谁|哪位|哪个)/.test(text)) return true;
  if (/我的名字(?:是|叫)\s*(?:什么|啥|哪个)/.test(text)) return true;
  // "吗 / 呢"语气词结尾
  if (/(?:吗|呢)\s*[?？]?\s*$/.test(text)) return true;
  return false;
}

export function extractNickname(text: string): string | null {
  if (!text) return null;
  // 疑问句整体跳过 —— 避免"我叫什么"被抽成"什么"
  if (isInterrogative(text)) return null;
  // 中文常见自报姓名表达
  const patterns: RegExp[] = [
    /我叫([一-龥A-Za-z]{1,8})/,
    /我的名字(?:是|叫)([一-龥A-Za-z]{1,8})/,
    /我是([一-龥A-Za-z]{1,8})(?:[，。,.!?！？]|$)/,
    /叫我([一-龥A-Za-z]{1,8})/,
    /[Mm]y name is\s+([A-Za-z]{2,12})/,
    /[Ii]'?m\s+([A-Za-z]{2,12})(?:[\s,.!?]|$)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const name = m[1].trim();
    if (NICKNAME_BLOCKLIST.has(name)) continue;
    // 兜底：抽出的"姓名"中如果包含任何黑名单词（如"什么名字"含"什么"），也跳过
    let polluted = false;
    for (const bad of NICKNAME_BLOCKLIST) {
      if (bad.length >= 2 && name.includes(bad)) { polluted = true; break; }
    }
    if (polluted) continue;
    if (name.length < 1 || name.length > 12) continue;
    return name;
  }
  return null;
}

/**
 * 检测并持久化用户姓名（异步，失败不阻塞主流程）
 */
async function detectAndSaveNickname(userId: string, content: string): Promise<string | null> {
  const name = extractNickname(content);
  if (!name) return null;

  try {
    const userRepo = getUserRepository();
    // 确保 User + UserProfile 已存在
    await userRepo.findOrCreateUser(userId);
    const profile = await userRepo.getUserProfile(userId);
    // 已有非默认昵称且不一致时也覆盖（用户重新自报）
    if (profile?.nickname === name) {
      return name;
    }
    await userRepo.updateUserProfile(userId, { nickname: name });
    console.log(`👤 [Identity] 用户姓名已更新：${profile?.nickname || "未设置"} → ${name}`);
    return name;
  } catch (e) {
    console.warn("[Identity] 写入 nickname 失败：", e);
    return null;
  }
}

/**
 * 直接调用百炼 API (绕过 LangChain 的兼容性问题)
 */
async function callDashscopeAPI(systemPrompt: string, userPrompt: string): Promise<string> {
  const config = getAgentConfig();
  const apiKey = config.llm.apiKey;

  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen3.6-plus",  // 前端编程能力增强的模型（思考过程为英文）
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: config.llm.maxTokens,
    }),
  });

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

/**
 * 流式调用百炼 API（带思考过程）
 * 开启 enable_thinking 后，返回 reasoning_content（思考）和 content（回答）
 */
export type StreamChunkType = "thought" | "content" | "step";

export interface StreamChunk {
  type: StreamChunkType;
  text: string;
  // step 专用字段
  stepId?: string;
  stepLabel?: string;
  stepIcon?: string;
  stepStatus?: "running" | "done" | "skip";
  stepDetail?: string;
}

/**
 * 过滤思考标签
 * Qwen3 enable_thinking 开启后，content 可能仍包含思考标签
 * 此函数过滤掉这些标签，只保留纯答案内容
 */
function filterThinkingTags(text: string): string {
  if (!text) return "";

  let filtered = text;

  // 过滤 Qwen3 思考标签（特殊字符格式）
  // 标签格式：темы...\/темы
  // 直接使用正则匹配
  filtered = filtered.replace(/темы[\s\S]*?темы/gi, "");

  // 过滤其他常见的思考分隔符格式
  filtered = filtered.replace(/<\|thought\|>/gi, "");
  filtered = filtered.replace(/<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/gi, "");

  // 清理多余的空行
  filtered = filtered.replace(/\n{3,}/g, "\n\n");

  return filtered.trim();
}

/**
 * 智能快捷回复 — 按本次回答用到的来源生成相关引导问题
 *
 * 设计理念：固定 "继续提问/深入话题/换个话题" 太空泛，根据真实场景给精准引导：
 * - 用了本地 KB → "举个代码例子" / "和其他方案对比" / "深入原理"
 * - 用了 web 搜索 → "看看最新动态" / "查官方文档" / "换个角度搜"
 * - 都没用上 → 引导用户提供更具体场景
 */
export function buildSmartQuickReplies(opts: {
  hasKB: boolean;
  hasWeb: boolean;
  query: string;
}): string[] {
  if (opts.hasKB && opts.hasWeb) {
    return ["举个代码例子", "对比其他方案", "看官方文档"];
  }
  if (opts.hasKB) {
    return ["举个代码例子", "深入原理", "和实战结合"];
  }
  if (opts.hasWeb) {
    return ["看看最新动态", "找官方文档", "换个角度问"];
  }
  // 纯闲聊/记忆类
  return ["给我推荐学习方向", "我想学 React", "我想学 AI/Agent"];
}

/**
 * 用轻量 LLM 根据当前问答生成相关追问
 *
 * 设计：用 qwen-turbo 控制延迟（300-600ms），失败时回落到 buildSmartQuickReplies。
 * 这里调用的轻量模型与意图识别共用，复用 createLightLLM。
 */
async function generateContextualQuickReplies(
  query: string,
  answer: string,
  fallback: string[]
): Promise<string[]> {
  try {
    // 答案太短就用 fallback（没有上下文价值）
    if (!answer || answer.length < 40) return fallback;

    const prompt = `用户刚问了：${query}

助手刚回答了（摘要）：${answer.slice(0, 500)}

请基于这次问答，提出 3 个用户最可能想接着问的相关问题。

要求：
- 每个问题 ≤ 14 个汉字
- 必须与刚才回答的具体技术点强相关（出现回答里的关键词），不要泛泛
- 三个问题角度不要重复（一个深入原理 / 一个实战代码 / 一个对比扩展）
- 严格输出 JSON 数组（不要 markdown 包裹、不要解释）：["问题1","问题2","问题3"]`;

    const llm = createLightLLM();
    const response = await llm.invoke([new HumanMessage(prompt)]);
    const raw = (response.content as string).trim();
    // 剥可能的 ```json 包裹
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (!match) return fallback;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    const result = arr.slice(0, 3).map(String).map(s => s.trim()).filter(s => s.length > 0 && s.length <= 20);
    return result.length > 0 ? result : fallback;
  } catch (e) {
    console.warn("[QuickReplies] 动态生成失败，回退固定模板：", e);
    return fallback;
  }
}

export async function* streamDashscopeAPIWithThinking(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  }
): AsyncGenerator<StreamChunk> {
  const config = getAgentConfig();
  const apiKey = config.llm.apiKey;

  // ========== OTel：LLM 调用 span（包含 first-byte/total token 计数）==========
  const trace = getCurrentTrace();
  const span = trace?.startSpan("llm.stream");
  span?.setAttributes({
    model: "qwen3.6-plus",
    systemPromptLen: systemPrompt.length,
    userPromptLen: userPrompt.length,
    historyLen: options?.history?.length ?? 0,
  });
  const llmStartedAt = Date.now();
  let firstByteAt: number | null = null;
  let spanChunkCount = 0;

  // 组装 messages：system + 历史对话 + 当前用户消息
  // 历史对话可让模型保持多轮上下文连贯（用户名字、上文提及的话题等）
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (options?.history?.length) {
    for (const m of options.history) {
      if (!m.content) continue;
      if (m.role === "system") continue; // system 由我们统一注入
      messages.push({ role: m.role, content: m.content });
    }
  }
  messages.push({ role: "user", content: userPrompt });

  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen3.6-plus",  // 前端编程能力增强的模型
      messages,
      temperature: 0.2,
      max_tokens: config.llm.maxTokens,
      stream: true,
      // 关闭思考模式：qwen3.6-plus 的 reasoning_content 是英文 self-talk，
      // 不仅冗长还会在思考过程里把答案预演一遍，UX 极差。直接输出正式答案。
      enable_thinking: false,
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) {
    logger.error('[DashScope] No reader available');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      if (!line.startsWith("data: ")) continue;

      const dataStr = line.slice(6).trim();
      if (dataStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(dataStr) as any;
        const choice = parsed.choices?.[0];
        const delta = choice?.delta || choice?.message || {};

        chunkCount++;

        const thoughtText = delta?.reasoning_content || delta?.reasoning || "";
        let contentText = delta?.content || delta?.text || "";

        contentText = filterThinkingTags(contentText);

        if (thoughtText) {
          spanChunkCount++;
          if (firstByteAt === null) firstByteAt = Date.now();
          yield { type: "thought", text: thoughtText };
        }
        if (contentText) {
          spanChunkCount++;
          if (firstByteAt === null) firstByteAt = Date.now();
          yield { type: "content", text: contentText };
        }
      } catch {
        // 单条 SSE chunk 解析失败不影响整体流，忽略
      }
    }
  }

  // 结束 span 并记录关键性能指标（first byte / total ms / chunk 数）
  if (trace && span) {
    span.setAttributes({
      chunkCount: spanChunkCount,
      firstByteMs: firstByteAt ? firstByteAt - llmStartedAt : null,
      totalMs: Date.now() - llmStartedAt,
    });
    trace.endSpan(span, "success");
  }
}

/**
 * 流式调用百炼 API（无思考过程，兼容旧版本）
 */
async function* streamDashscopeAPI(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
  for await (const chunk of streamDashscopeAPIWithThinking(systemPrompt, userPrompt)) {
    // 只返回 content，过滤掉 thought
    if (chunk.type === "content") {
      yield chunk.text;
    }
  }
}

/**
 * 创建 LLM 实例 (备用)
 */
function createLLM() {
  const config = getAgentConfig();
  return new ChatOpenAI({
    modelName: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });
}

/**
 * 创建快捷回复选项
 */
export function createQuickReplies(texts: string[]): QuickReplyOption[] {
  return texts.map((text) => ({
    id: `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    action: text,
  }));
}

/**
 * 意图识别节点
 *
 * LLM 现在按 JSON 返回 { intent, reasoning, keywords }，
 * 三种映射兼容：
 * - 旧 prompt 返回纯意图字符串（容错）
 * - 新 prompt 返回 JSON 对象（标准路径）
 * - 部分模型把 JSON 包在 ```json ... ``` 里（剥壳）
 */
const INTENT_ALIASES: Record<string, UserIntent> = {
  general_qa: "general_inquiry",
  query_progress: "progress_tracking",
  emotion_support: "emotional_support",
  greeting: "general_inquiry", // 当前 graph 没有 greeting 节点，回落到通用
};

function normalizeIntent(raw: string): UserIntent {
  const v = (raw || "").trim().toLowerCase();
  if (INTENT_ALIASES[v]) return INTENT_ALIASES[v];
  // 直接匹配 UserIntent 枚举值
  const known: UserIntent[] = [
    "create_task", "update_task", "delete_task", "list_tasks",
    "search_knowledge", "study_material", "exam_simulation",
    "progress_tracking", "emotional_support", "general_inquiry",
  ];
  if (known.includes(v as UserIntent)) return v as UserIntent;
  return "general_inquiry";
}

function parseIntentResponse(text: string): {
  intent: UserIntent;
  reasoning: string;
  keywords: string[];
} {
  const fallback = { intent: "general_inquiry" as UserIntent, reasoning: "默认通用问答", keywords: [] as string[] };
  if (!text) return fallback;

  // 剥 ```json ... ``` 外壳
  let stripped = text.trim();
  stripped = stripped.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // 找第一个 { ... } 块
  const m = stripped.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const obj = JSON.parse(m[0]);
      return {
        intent: normalizeIntent(String(obj.intent || "")),
        reasoning: String(obj.reasoning || "").slice(0, 60),
        keywords: Array.isArray(obj.keywords) ? obj.keywords.slice(0, 3).map(String) : [],
      };
    } catch {
      // JSON 解析失败，往下走
    }
  }

  // 兜底：把整个文本当作意图名
  return {
    intent: normalizeIntent(stripped),
    reasoning: "LLM 未返回标准 JSON，按字符串解析",
    keywords: [],
  };
}

/**
 * 本地规则兜底：高置信度关键词命中直接返回，跳过 LLM
 *
 * 设计：保守命中、宁可漏判。命中要求"非常明显"，
 * 这样命中率不高但准确度极高；未命中再走 LLM 兜底。
 */
function ruleBasedIntent(content: string): {
  intent: UserIntent;
  reasoning: string;
  keywords: string[];
} | null {
  const text = content.trim();
  if (!text) return null;

  // 学习计划相关（含"调整/重做"，让快捷回复也能命中）
  const planKeywords = [
    "学习计划", "学习路径", "学习路线", "制定计划", "规划学习", "怎么学",
    "调整任务", "调整计划", "重新规划", "改一下计划", "再来一份", "换一个计划",
  ];
  for (const kw of planKeywords) {
    if (text.includes(kw)) {
      return { intent: "create_task", reasoning: "命中本地规则：学习计划关键词", keywords: [kw] };
    }
  }

  // 进度查询
  const progressKeywords = ["学到哪", "学到什么程度", "我的进度", "学习进度", "学了多少"];
  for (const kw of progressKeywords) {
    if (text.includes(kw)) {
      return { intent: "progress_tracking", reasoning: "命中本地规则：进度查询关键词", keywords: [kw] };
    }
  }

  // 情绪支持（明显负面情绪）
  const emotionKeywords = ["压力大", "焦虑", "崩溃", "学不下去", "想放弃", "好累"];
  for (const kw of emotionKeywords) {
    if (text.includes(kw)) {
      return { intent: "emotional_support", reasoning: "命中本地规则：负面情绪关键词", keywords: [kw] };
    }
  }

  return null;
}

/**
 * 轻量 LLM（专用于意图识别），qwen-turbo-latest 比 qwen3.6-plus 快 3-5 倍
 */
function createLightLLM() {
  const config = getAgentConfig();
  return new ChatOpenAI({
    modelName: "qwen-turbo-latest",
    temperature: 0,
    maxTokens: 120,
    apiKey: config.llm.apiKey,
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });
}

export async function intentRecognitionNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Intent recognition node executing");

  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage.content as string;

  // Fast path: 本地规则命中直接返回（0 LLM 调用）
  const ruleHit = ruleBasedIntent(content);
  if (ruleHit) {
    logger.info(`Intent fast-path: ${ruleHit.intent} | ${ruleHit.reasoning}`);
    return {
      userIntent: ruleHit.intent,
      intentDecision: { reasoning: ruleHit.reasoning, keywords: ruleHit.keywords },
    };
  }

  const intentPrompt = SYSTEM_PROMPTS.INTENT_RECOGNITION.replace("{message}", content);

  try {
    // 用轻量模型，避免 qwen3.6-plus 的 1-2 秒延迟
    const llm = createLightLLM();
    const response = await llm.invoke([new HumanMessage(intentPrompt)]);
    const raw = response.content as string;
    const parsed = parseIntentResponse(raw);

    logger.info(`Detected intent: ${parsed.intent} | reasoning: ${parsed.reasoning}`);

    return {
      userIntent: parsed.intent,
      intentDecision: {
        reasoning: parsed.reasoning,
        keywords: parsed.keywords,
      },
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Intent recognition failed", err);
    return {
      userIntent: "general_inquiry",
      intentDecision: { reasoning: "意图识别异常，回落通用问答", keywords: [] },
    };
  }
}

/**
 * 早安问候节点
 */
export async function morningGreetingNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Morning greeting node executing");

  try {
    const llm = createLLM();
    const contextEnhancer = getContextEnhancer();
    const context = await contextEnhancer.enhanceContext(state.userId, "");

    const systemPrompt = SYSTEM_PROMPTS.MORNING_GREETING;
    const userPrompt = `用户ID：${state.userId}\n${contextEnhancer.generateSystemPromptEnhancement(context)}`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const quickReplies = ["开始今天的学习", "调整学习计划", "查看学习进度"];

    LogTools.logAgentDecision(state.userId, state.userIntent, "Morning greeting");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(quickReplies),
      waitingForUserInput: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Morning greeting failed", err);
    const errorMessage = "早上好！☀️ 今天又是充满希望的一天。准备好了吗？";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["开始今天的学习", "调整学习计划", "查看学习进度"]),
      waitingForUserInput: true,
    };
  }
}

/**
 * 晚间复盘节点
 */
export async function eveningReviewNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Evening review node executing");

  try {
    const llm = createLLM();
    const contextEnhancer = getContextEnhancer();
    const context = await contextEnhancer.enhanceContext(state.userId, "");

    const systemPrompt = SYSTEM_PROMPTS.EVENING_REVIEW;
    const userPrompt = `用户ID：${state.userId}\n${contextEnhancer.generateSystemPromptEnhancement(context)}`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const quickReplies = ["记录今天的学习心得", "查看本周数据", "准备休息"];

    LogTools.logAgentDecision(state.userId, state.userIntent, "Evening review");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(quickReplies),
      waitingForUserInput: true,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Evening review failed", err);
    const errorMessage = "晚上好！🌙 今天辛苦了，早点休息哦～";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["记录今天的学习心得", "查看本周数据", "准备休息"]),
      waitingForUserInput: true,
    };
  }
}

/**
 * 检测用户原始需求是否足够生成计划
 *
 * 充足判定：消息里能识别出明确的技术栈方向。
 * 否则需要反问用户具体想学什么。
 */
function detectTechStackSignal(text: string): { matched: boolean; label: string | null } {
  const checks: Array<[RegExp, string]> = [
    [/(React|Reactjs|响应式组件|jsx)/i, "React 开发"],
    [/(Vue|vue3|vue\.js)/i, "Vue 开发"],
    [/(Next\.?js|SSR|全栈)/i, "Next.js 实战"],
    [/(TypeScript|TS|类型体操|类型推导)/i, "TypeScript 进阶"],
    [/(JavaScript深入|原型链|闭包|JS 基础|js基础)/i, "JavaScript 深入"],
    [/(CSS|布局|Flex|Grid|动画|样式)/i, "CSS 布局"],
    [/(Node\.?js|后端|Express|API 开发)/i, "Node.js 后端"],
    [/(算法|LeetCode|刷题|数据结构)/i, "算法刷题"],
    [/(面试|大厂|八股|简历|应聘)/i, "前端面试"],
    [/(AI|LangChain|Agent|大模型|RAG)/i, "AI 应用开发"],
  ];
  for (const [re, label] of checks) {
    if (re.test(text)) return { matched: true, label };
  }
  return { matched: false, label: null };
}

/**
 * 判断 create_task 当前轮是否需要追问用户
 *
 * 充足条件（满足任一即可）：
 * 1. 用户本轮输入命中明确技术栈
 * 2. 用户本轮输入是对前一轮反问的回答（前一条 assistant 是 clarification 反问）
 * 3. 已经存在"上一份计划"（说明是调整流程，沿用前一份的 tech_stack）
 */
export function shouldClarifyTaskPlan(state: GraphStateType): { needClarify: boolean } {
  const lastUserMessage = state.messages.filter((m: any) => (m.role || m._getType?.()) === "user").pop();
  const userText = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

  // 本轮命中明确技术栈 → 信息够
  if (detectTechStackSignal(userText).matched) return { needClarify: false };

  // 上一条 assistant 含追问标识 → 用户本轮是在回答 → 信息够
  for (let i = state.messages.length - 2; i >= 0; i--) {
    const msg: any = state.messages[i];
    const role = msg.role || msg._getType?.();
    const c = typeof msg.content === "string" ? msg.content : "";
    if (role === "assistant" || role === "ai") {
      if (c.includes("【需求确认】") || c.includes("你最想专攻") || c.includes("📋") || c.includes("学习计划")) {
        return { needClarify: false };
      }
      break;
    }
  }

  return { needClarify: true };
}

/**
 * 构造追问消息（带快捷回复，让用户在不需要打字的情况下回答）
 */
export function buildClarificationMessage(): string {
  return [
    "【需求确认】",
    "",
    "好的！来一起规划一份学习计划 📋",
    "",
    "在动手生成之前，先了解一下你的想法：",
    "",
    "**你最想专攻哪个方向？**",
    "",
    "如果不在下面的快捷选项里，也可以直接打字告诉我，比如 _\"想做 Electron 桌面端\"_ / _\"想冲腾讯面试\"_。",
  ].join("\n");
}

/**
 * 任务生成节点
 */
export async function taskGenerationNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Task generation node executing");

  try {
    // === 多轮对话：先检查需求是否充足 ===
    const { needClarify } = shouldClarifyTaskPlan(state);
    if (needClarify) {
      logger.info("Task generation: 需求不充足，进入追问轮");
      const clarifyContent = buildClarificationMessage();
      return {
        messages: [...state.messages, new AIMessage(clarifyContent)],
        quickReplyOptions: createQuickReplies([
          "React 开发",
          "Vue 开发",
          "TypeScript 进阶",
          "前端面试",
          "AI 应用开发",
          "刷算法",
        ]),
        waitingForUserInput: true,
        clarificationNeeded: true,
      };
    }

    const llm = createLLM();
    const mcpClient = getMCPToolClient();

    // 获取用户原始消息
    const lastUserMessage = state.messages.filter(m => m.role === "user").pop();
    const userRequest = typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : "用户想学习技术";

    const ragResult = await mcpClient.searchKnowledge({
      query: `用户 ${state.userId} 的技术学习进度`,
      category: "user_history",
      topK: 3,
    });

    let ragContext = "";
    if (ragResult.success && ragResult.data?.results?.length > 0) {
      ragContext = ragResult.data.results.map((r: any) => r.content).join("\n");
    }

    const systemPrompt = SYSTEM_PROMPTS.TASK_GENERATION;
    const userPrompt = TASK_PROMPTS.GENERATE_TASK_PLAN
      .replace("{userId}", state.userId)
      .replace("{progress}", ragContext || "暂无进度数据")
      .replace("{weakModules}", "待分析")
      .replace("{studyHabits}", "待分析");

    // 抽取上一份计划（如果存在），作为"调整"场景的上下文
    // 触发条件：messages 中有上一条 assistant 消息且包含计划标识
    let previousPlan: string | null = null;
    for (let i = state.messages.length - 2; i >= 0; i--) {
      const msg: any = state.messages[i];
      const role = msg.role || (msg._getType ? msg._getType() : "");
      const c = typeof msg.content === "string" ? msg.content : "";
      if ((role === "assistant" || role === "ai") && (c.includes("学习计划") || c.includes("tech_stack") || c.includes("📋"))) {
        previousPlan = c;
        break;
      }
    }

    // 把用户原始需求 + 上一份计划（如有）都传给模型
    const adjustmentContext = previousPlan
      ? `\n上一份计划：\n${previousPlan}\n\n请基于上一份计划做有针对性的调整（不要重复输出一遍）。\n`
      : "";

    const enhancedUserPrompt = `用户具体需求：${userRequest}${adjustmentContext}

${userPrompt}`;

    if (previousPlan) {
      console.log("📋 [Task] 检测到上一份计划，进入调整模式");
    }

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(enhancedUserPrompt),
    ]);

    const quickReplies = ["确认计划", "调整任务", "取消"];
    const parsedTaskPlan = parseTaskPlanFromText(response.content as string);

    LogTools.logAgentDecision(state.userId, state.userIntent, "Task generation");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(quickReplies),
      waitingForUserInput: true,
      ragResults: ragResult.success ? ragResult.data?.results : [],
      pendingTaskPlan: parsedTaskPlan ?? undefined,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Task generation failed", err);
    const errorMessage = "抱歉，生成任务计划时出错了。请稍后再试。";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试", "取消"]),
      waitingForUserInput: true,
    };
  }
}

/**
 * 情感支持节点
 */
export async function emotionSupportNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Emotion support node executing");

  try {
    const llm = createLLM();
    const emotionDetector = getEmotionDetector();
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const emotionResult = emotionDetector.detectEmotion(content);
    const emotionLabel = emotionDetector.getEmotionLabel(emotionResult.emotion);
    const emotionDescription = emotionDetector.getEmotionDescription(
      emotionResult.emotion,
      emotionResult.intensity
    );

    const mcpClient = getMCPToolClient();
    const ragResult = await mcpClient.searchKnowledge({
      query: `${emotionResult.emotion} 备考经验 解决方案`,
      category: "exam_experience",
      topK: 3,
    });

    let ragContext = "";
    if (ragResult.success && ragResult.data?.results?.length > 0) {
      // 情感支持场景下，RAG 的作用是补“别人怎么走出来”的经验语境，
      // 不是机械罗列知识点，所以这里只保留可直接转成安抚建议的内容。
      ragContext = ragResult.data.results.map((r: any) => r.content).join("\n");
    }

    const systemPrompt = SYSTEM_PROMPTS.EMOTION_SUPPORT;
    const userPrompt = `用户情绪：${emotionLabel} (${emotionDescription})\n相关经验：${ragContext || "暂无相关经验"}\n用户消息：${content}`;

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const quickReplies = ["分析薄弱模块", "制定突破计划", "我再想想"];

    LogTools.logAgentDecision(state.userId, state.userIntent, "Emotion support");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(quickReplies),
      waitingForUserInput: true,
      ragResults: ragResult.success ? ragResult.data?.results : [],
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Emotion support failed", err);
    const errorMessage = "我理解你的感受，有什么我可以帮助你的吗？";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["继续对话", "结束对话"]),
      waitingForUserInput: true,
    };
  }
}

/**
 * 进度查询节点
 */
export async function progressQueryNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Progress query node executing");

  try {
    const llm = createLLM();
    const mcpClient = getMCPToolClient();
    const ragResult = await mcpClient.searchKnowledge({
      query: `用户 ${state.userId} 的学习进度数据`,
      category: "user_history",
      topK: 5,
    });

    let progressData = "";
    if (ragResult.success && ragResult.data?.results?.length > 0) {
      progressData = ragResult.data.results.map((r: any) => r.content).join("\n");
    }

    const systemPrompt = SYSTEM_PROMPTS.GENERAL_QA;
    const userPrompt = TASK_PROMPTS.QUERY_PROGRESS.replace("{userId}", state.userId);

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    LogTools.logAgentDecision(state.userId, state.userIntent, "Progress query");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(["继续提问", "查看详细进度", "返回首页"]),
      waitingForUserInput: false,
      ragResults: ragResult.success ? ragResult.data?.results : [],
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Progress query failed", err);
    const errorMessage = "抱歉，查询学习进度时出错了。请稍后再试。";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试", "返回首页"]),
      waitingForUserInput: false,
    };
  }
}

/**
 * 一般问答节点
 */
export async function generalQANode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("General QA node executing");

  try {
    const llm = createLLM();
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const contextEnhancer = getContextEnhancer();
    const enhancedMessage = await contextEnhancer.enhanceUserMessage(state.userId, content);
    const config = getAgentConfig();

    // ========== 四层记忆融合检索（面试核心亮点）==========
    console.log("\n");
    console.log("🧠 [Memory] 开始四层记忆融合检索");

    // 转换消息格式为 Memory Message
    const memoryMessages: Message[] = state.messages.map((msg: any) => ({
      role: msg.role || (msg._getType ? msg._getType() : "user"),
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    }));

    // 执行四层记忆融合检索
    const memoryRetriever = getMemoryFusionRetriever();
    const fusedMemory = await memoryRetriever.retrieve(
      state.userId,
      content,
      memoryMessages
    );

    // 将融合后的上下文添加到系统提示
    const memoryContextPrompt = fusedMemory.fusedContext;
    console.log(`🧠 [Memory] 融合上下文已生成，长度: ${memoryContextPrompt.length} 字符`);

    // 使用 LlamaIndex HybridFusion + BGE-M3 重排 + 三级策略的 RAG 检索
    let ragContext = "";
    let ragResults: any[] = [];

    if (config.features.ragEnabled && shouldRouteToXiaohongshuRag(content)) {
      const ragFallbackResult = await retrieveWithFallback(content, { topK: 5, userId: state.userId });
      ragContext = ragFallbackResult.context;
      ragResults = ragFallbackResult.results;
      console.log(`[RAG] source=${ragFallbackResult.source} tier=${ragFallbackResult.tier} hits=${ragResults.length}`);
    }

    // 构建 prompt：优先使用 RAG context，否则使用原始消息
    const userPrompt = ragContext || enhancedMessage;

    const systemPrompt = SYSTEM_PROMPTS.DEFAULT;
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    LogTools.logAgentDecision(state.userId, state.userIntent, "General QA");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(["继续提问", "深入这个话题", "换个话题"]),
      waitingForUserInput: false,
      ragResults,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("General QA failed", err);
    const errorMessage = "抱歉，我无法理解你的问题。请换个方式问我。";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试", "换个话题"]),
      waitingForUserInput: false,
    };
  }
}

/**
 * 响应生成节点
 */
export async function generateResponseNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Generate response node executing");

  return {
    waitingForUserInput: false,
  };
}

/**
 * 流式版本的节点函数
 */

/**
 * 规范化消息内容：从 DB 恢复的 state.messages 是纯 JSON 对象，
 * content 字段可能为 undefined、数组或字符串。
 * 此处统一转为字符串，避免传给 LangChain 消息构造函数时报错。
 */
function normalizeMessageContent(msg: any): string {
  if (msg.content === undefined || msg.content === null) return "";
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((c: any) => (typeof c === "string" ? c : c?.text || ""))
      .join(" ");
  }
  if (typeof msg.content !== "string") {
    return JSON.stringify(msg.content);
  }
  return msg.content;
}

/**
 * 将 state.messages 数组中可能混杂的 LangChain 消息对象和纯 JSON
 * 对象统一映射为 LangChain 消息实例，用于构建 LLM prompt。
 */
function buildLLMMessages(messages: any[]): any[] {
  return messages.map((msg: any) => {
    if (msg.lc_serializable === true) return msg;
    const content = normalizeMessageContent(msg);
    if (msg.role === "user") return new HumanMessage(content);
    if (msg.role === "assistant") return new AIMessage(content);
    return new HumanMessage(content);
  });
}

export async function* generalQANodeStream(
  state: GraphStateType
): AsyncGenerator<StreamChunk, GraphStateType, unknown> {
  logger.info("General QA stream node executing (with thinking mode)");

  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    // ========== 用户身份抽取（在记忆检索前先持久化姓名）==========
    // 这样如果用户说"我叫小明"，会立刻写入 UserProfile.nickname，
    // 紧随其后的记忆融合就会在 fusedContext 顶部带上"用户称呼"。
    await detectAndSaveNickname(state.userId, content);

    const contextEnhancer = getContextEnhancer();
    const enhancedMessage = await contextEnhancer.enhanceUserMessage(state.userId, content);
    const config = getAgentConfig();

    // ========== Memory + RAG 并行检索（性能优化）==========
    // 两条链路无数据依赖：memory 用 long_term_memory collection，RAG 用 tech_knowledge collection
    // 串行 4-7s → 并行 max ≈ 2-4s，省 ~40-50% 等待时间
    const memT0 = Date.now();
    yield {
      type: "step",
      text: "",
      stepId: "memory",
      stepLabel: "融合四阶分层记忆",
      stepIcon: "🧠",
      stepStatus: "running",
    };

    const ragEnabled = config.features.ragEnabled && shouldRouteToXiaohongshuRag(content);
    if (ragEnabled) {
      yield {
        type: "step",
        text: "",
        stepId: "rag",
        stepLabel: "检索本地知识库",
        stepIcon: "🔍",
        stepStatus: "running",
      };
    }

    const memoryMessages: Message[] = state.messages.map((msg: any) => ({
      role: msg.role || (msg._getType ? msg._getType() : "user"),
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    }));

    const memoryRetriever = getMemoryFusionRetriever();
    const memoryPromise = memoryRetriever.retrieve(state.userId, content, memoryMessages);
    const ragPromise = ragEnabled
      ? retrieveWithFallback(content, { topK: 5, userId: state.userId })
      : Promise.resolve(null);

    // 并行执行（关键点）
    const [fusedMemory, ragFallbackResult] = await Promise.all([memoryPromise, ragPromise]);

    const memoryContextPrompt = fusedMemory.fusedContext;
    console.log(`🧠 [Memory] 融合上下文已生成，长度: ${memoryContextPrompt.length} 字符`);

    const memElapsed = Date.now() - memT0;
    yield {
      type: "step",
      text: "",
      stepId: "memory",
      stepLabel: "融合四阶分层记忆",
      stepIcon: "🧠",
      stepStatus: "done",
      stepDetail: `瞬时${state.messages.length}条 · 短期/长期/元 共 ${memoryContextPrompt.length} 字符上下文 · ${memElapsed}ms`,
    };

    let ragContext = "";
    let ragResults: any[] = [];
    if (ragFallbackResult) {
      ragContext = ragFallbackResult.context;
      ragResults = ragFallbackResult.results;
      yield {
        type: "step",
        text: "",
        stepId: "rag",
        stepLabel: "检索本地知识库",
        stepIcon: "🔍",
        stepStatus: "done",
        stepDetail: `LlamaIndex 混合检索 · 命中 ${ragResults.length} 条 · ${ragFallbackResult.tier} · ${memElapsed}ms（与记忆并行）`,
      };
    } else {
      yield {
        type: "step",
        text: "",
        stepId: "rag",
        stepLabel: "检索本地知识库",
        stepIcon: "🔍",
        stepStatus: "skip",
        stepDetail: "问题不属于知识库分类，跳过",
      };
    }

    console.log(`[RAG] hits=${ragResults.length}`);

    // ========== 联网搜索智能路由 ==========
    // 触发条件：RAG tier=fallback/expand 或问题命中时效/显式联网关键词
    let webResult: WebSearchResult | null = null;
    const ragTier: string | undefined = ragResults.length > 0 ? "candidates" : undefined;
    if (shouldUseWebSearch(content, ragTier)) {
      const webT0 = Date.now();
      yield {
        type: "step",
        text: "",
        stepId: "web",
        stepLabel: "联网搜索",
        stepIcon: "🌐",
        stepStatus: "running",
      };
      webResult = await webSearch(content);
      const webDuration = Date.now() - webT0;
      // 写入事件日志，供 Dashboard 累加 webCount
      logAgentEvent({
        userId: state.userId,
        eventType: "rag",
        eventName: "web_search",
        payload: {
          webCount: webResult?.citations.length ?? 0,
          success: !!webResult,
          ragTier,
          query: content.slice(0, 80),
        },
        durationMs: webDuration,
      });
      yield {
        type: "step",
        text: "",
        stepId: "web",
        stepLabel: "联网搜索",
        stepIcon: "🌐",
        stepStatus: webResult ? "done" : "skip",
        stepDetail: webResult
          ? `Tavily · ${webResult.citations.length} 个来源 · ${webDuration}ms`
          : "Tavily 调用失败，跳过",
      };
    } else {
      yield {
        type: "step",
        text: "",
        stepId: "web",
        stepLabel: "联网搜索",
        stepIcon: "🌐",
        stepStatus: "skip",
        stepDetail: "本地知识充足且无时效关键词，跳过",
      };
    }

    // ========== 装配 systemPrompt：DEFAULT + 四阶记忆 + RAG 带来源 + 来源规则 ==========
    let enhancedSystemPrompt = SYSTEM_PROMPTS.DEFAULT;
    const usedSources: Array<{ type: "memory" | "kb" | "web"; title: string; detail?: string; url?: string; score?: number }> = [];

    if (memoryContextPrompt && memoryContextPrompt.trim().length > 0) {
      enhancedSystemPrompt += `\n\n## 🧠 对话记忆与用户画像\n${memoryContextPrompt}`;
      usedSources.push({ type: "memory", title: "四阶分层记忆", detail: "瞬时/短期/长期/元记忆融合" });
    }

    if (ragResults.length > 0) {
      const ragBlock = ragResults
        .map((r, i) => {
          const title = r.metadata?.title || `知识点 ${i + 1}`;
          const category = r.metadata?.category ? ` · ${r.metadata.category}` : "";
          const text = (r.content || "").trim();
          // 透传 metadata.source_url（content-ingestion 写入时已保存原文链接）
          // 这样前端 SourcesSection 可以渲染成可点的 <a target="_blank">
          const url = (r.metadata?.source_url || r.metadata?.sourceUrl || "").trim() || undefined;
          // detail 透传知识点正文片段（截短到 400 字），用于 GuardRail L3 事实交叉验证
          // 不传完整 content 是避免 SSE payload 膨胀 / 前端展示溢出
          const detailSnippet = text.length > 0 ? text.slice(0, 400) : undefined;
          usedSources.push({ type: "kb", title: `${title}${category}`, detail: detailSnippet, score: r.score, url });
          return `${i + 1}. 【📚 本地知识库 · ${title}${category}】\n${text}`;
        })
        .join("\n\n");
      enhancedSystemPrompt += `\n\n## 📚 本地知识库检索结果\n${ragBlock}`;
    }

    if (webResult && webResult.answer) {
      const webCitations = webResult.citations.slice(0, 5);
      const citationsList = webCitations
        .map((c, i) => `   - [${c.title || c.url}](${c.url})`)
        .join("\n");
      enhancedSystemPrompt += `\n\n## 🌐 联网搜索结果\n${webResult.answer}\n\n参考链接：\n${citationsList || "（无）"}`;
      webCitations.forEach((c) => {
        usedSources.push({
          type: "web",
          title: c.title || c.url,
          url: c.url,
        });
      });
      if (webCitations.length === 0) {
        // 没有 citations 时也记一条 web 来源
        usedSources.push({ type: "web", title: "Perplexity Sonar 综合搜索" });
      }
    }

    // 回答规则（来源不在正文里列，前端会独立渲染来源 chip 区块）
    enhancedSystemPrompt += `\n\n## 📌 回答规则
1. 严格利用上面的【🧠 对话记忆】保持上下文连贯。若记忆中包含用户姓名/技能/偏好等信息，回答时必须用上，绝对不要回复"我没有存储或访问个人信息"等推卸性话术。
2. 优先基于【📚 本地知识库】和【🌐 联网搜索结果】回答技术问题；都不足时再结合你的通用知识。
3. **不要在回答末尾列"参考来源"区块**——系统会在 UI 中独立展示参考来源 chip，正文里重复列出反而冗余。如果想强调某个来源，在正文中自然提及即可（例如"根据 Next.js 16 发布日志..."）。
4. 回答要简洁、有结构（适当使用标题、列表），不要堆砌"思考过程"或"自我提醒"之类的内部内容。
`;

    // ========== 装配历史对话 ==========
    // state.messages 最后一条是当前用户消息，单独作为 userPrompt；前面的作为 history
    const historyForLLM = state.messages
      .slice(0, -1)
      .map((msg: any) => {
        const rawRole = msg.role || (msg._getType ? msg._getType() : "user");
        const role: "user" | "assistant" =
          rawRole === "assistant" || rawRole === "ai" ? "assistant" : "user";
        const content = typeof msg.content === "string" ? msg.content : "";
        return { role, content };
      })
      .filter((m: any) => m.content && m.content.trim().length > 0);

    console.log(`🧩 [Context] 注入历史消息 ${historyForLLM.length} 条 + memoryPrompt ${memoryContextPrompt.length} 字符 + ragResults ${ragResults.length} 条`);

    // userPrompt 保持纯净：当前问题 + 时间/日期/学习上下文（由 enhanceUserMessage 注入）
    const userPrompt = enhancedMessage;

    const genT0 = Date.now();
    yield {
      type: "step",
      text: "",
      stepId: "generate",
      stepLabel: "生成回答",
      stepIcon: "✨",
      stepStatus: "running",
      stepDetail: `qwen3.6-plus · 注入 ${historyForLLM.length} 条历史 + ${ragResults.length} 条知识 + ${usedSources.filter(s => s.type === "web").length} 个 web 来源`,
    };

    // 使用 DashScope API
    let fullContent = "";
    let fullThought = "";

    for await (const chunk of streamDashscopeAPIWithThinking(enhancedSystemPrompt, userPrompt, {
      history: historyForLLM,
    })) {
      if (chunk.type === "thought") {
        fullThought += chunk.text;
      } else {
        fullContent += chunk.text;
      }
      yield chunk;  // 直接 yield StreamChunk
    }

    // LLM 流式完成后 yield generate done step（让前端 ExecutionStepsSection 显示"已完成"）
    yield {
      type: "step",
      text: "",
      stepId: "generate",
      stepLabel: "生成回答",
      stepIcon: "✨",
      stepStatus: "done",
      stepDetail: `qwen3.6-plus · ${fullContent.length} 字 · ${Date.now() - genT0}ms`,
    };

    LogTools.logAgentDecision(state.userId, state.userIntent, "General QA Stream");

    console.log(`📎 [Sources] 本次使用来源: ${usedSources.map(s => `${s.type}/${s.title}`).join(", ") || "无"}`);

    // ========== 智能快捷回复 ==========
    // 优先用轻量 LLM 基于当前问答生成 3 个相关追问；失败时回落到 buildSmartQuickReplies 模板
    const fallbackReplies = buildSmartQuickReplies({
      hasKB: ragResults.length > 0,
      hasWeb: usedSources.some(s => s.type === "web"),
      query: content,
    });
    const smartReplies = await generateContextualQuickReplies(content, fullContent, fallbackReplies);

    return {
      ...state,
      messages: [...state.messages, new AIMessage(fullContent)],
      quickReplyOptions: createQuickReplies(smartReplies),
      waitingForUserInput: false,
      ragResults,
      usedSources,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("General QA stream failed", err);
    yield { type: "content", text: "抱歉，我无法理解你的问题。请换个方式问我。" };

    return {
      ...state,
      messages: [...state.messages, new AIMessage("抱歉，我无法理解你的问题。请换个方式问我。")],
      quickReplyOptions: createQuickReplies(["重试", "换个话题"]),
      waitingForUserInput: false,
    };
  }
}

export async function* taskGenerationNodeStream(
  state: GraphStateType
): AsyncGenerator<string, GraphStateType, unknown> {
  logger.info("Task generation stream node executing");

  try {
    const mcpClient = getMCPToolClient();

    // 获取用户原始消息
    const lastUserMessage = state.messages.filter(m => m.role === "user").pop();
    const userRequest = typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : "用户想学习技术";

    const ragResult = await mcpClient.searchKnowledge({
      query: `用户 ${state.userId} 的技术学习进度`,
      category: "user_history",
      topK: 3,
    });

    let ragContext = "";
    if (ragResult.success && ragResult.data?.results?.length > 0) {
      ragContext = ragResult.data.results.map((r: any) => r.content).join("\n");
    }

    // Step 1: 调用模型生成 JSON 格式的任务计划（不 yield）
    const planSystemPrompt = `你是 TechMate 任务规划引擎。请严格按照 JSON 格式输出学习计划，不要输出其他内容。

输出格式示例：
{"tech_stack":"React开发","daily_practice":"每天3个案例","difficulty":"基础","duration":"预计7天完成","reason":"React是前端核心框架"}

技术栈选项：React开发、Next.js实战、TypeScript进阶、JavaScript深入、CSS布局、Node.js后端、算法刷题、前端面试

禁止使用考公、行测、申论等词汇。`;

    const planUserPrompt = `用户需求：${userRequest}

请生成 JSON 格式的技术学习计划。`;

    let planJson = "";
    for await (const chunk of streamDashscopeAPI(planSystemPrompt, planUserPrompt)) {
      planJson += chunk;
      // 不 yield，先收集
    }

    // Step 2: 解析 JSON
    let parsedPlan: any = null;
    try {
      // 提取 JSON（模型可能返回 ```json 包裹的内容）
      const jsonMatch = planJson.match(/\{[^}]+\}/);
      if (jsonMatch) {
        parsedPlan = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.warn("Failed to parse plan JSON, using raw text");
    }

    // 映射 parsedPlan 到 PendingTaskPlan 格式
    function mapDifficulty(diff: string): "easy" | "medium" | "hard" {
      if (diff?.includes("基础") || diff?.includes("简单") || diff?.includes("easy")) return "easy";
      if (diff?.includes("进阶") || diff?.includes("中等") || diff?.includes("medium")) return "medium";
      return "hard";
    }

    function extractPeriodDays(duration: string): number | null {
      const match = duration?.match(/(\d+)\s*[天周]/);
      if (match) return parseInt(match[1]);
      // 如果是"周"，乘以7
      if (duration?.includes("周")) {
        const weekMatch = duration.match(/(\d+)\s*周/);
        if (weekMatch) return parseInt(weekMatch[1]) * 7;
      }
      return 7; // 默认7天
    }

    function extractEstimatedMinutes(practice: string): number {
      // 尝试从 daily_practice 提取时间
      const hourMatch = practice?.match(/(\d+)\s*小时/);
      if (hourMatch) return parseInt(hourMatch[1]) * 60;
      const minMatch = practice?.match(/(\d+)\s*分钟/);
      if (minMatch) return parseInt(minMatch[1]);
      return 60; // 默认60分钟
    }

    const mappedPlan = parsedPlan ? {
      title: parsedPlan.tech_stack || "技术学习计划",
      description: parsedPlan.reason || "技术栈学习计划",
      module: parsedPlan.tech_stack || null,
      difficulty: mapDifficulty(parsedPlan.difficulty),
      estimatedMinutes: extractEstimatedMinutes(parsedPlan.daily_practice),
      dailyQuestionCount: null,
      periodDays: extractPeriodDays(parsedPlan.duration),
      reason: parsedPlan.reason || null,
      rawPlan: planJson,
    } : null;

    // Step 3: 再调用模型，将计划转换成友好文本（这次 yield）
    const explainSystemPrompt = `你是 TechMate 技术学习助手。请用亲切、鼓励的语气向用户介绍学习计划。

回复要求：
1. 使用自然语言，不要输出 JSON
2. 简洁明了，控制在 100 字以内
3. 用表情符号增加亲和力（如 📚、💪、🎯）
4. 结尾提示用户可以确认或调整计划`;

    const explainUserPrompt = parsedPlan
      ? `请用友好语气介绍以下学习计划：
- 技术栈：${parsedPlan.tech_stack}
- 每日练习：${parsedPlan.daily_practice}
- 难度：${parsedPlan.difficulty}
- 预计周期：${parsedPlan.duration}
- 推荐理由：${parsedPlan.reason}`
      : `请用友好语气介绍这个学习计划：${planJson}`;

    // Step 4: yield 友好文本
    let friendlyContent = "";
    for await (const chunk of streamDashscopeAPI(explainSystemPrompt, explainUserPrompt)) {
      friendlyContent += chunk;
      yield chunk;
    }

    const quickReplies = createQuickReplies(["确认计划", "调整任务", "取消"]);
    LogTools.logAgentDecision(state.userId, state.userIntent, "Task generation Stream");

    return {
      ...state,
      messages: [...state.messages, new AIMessage(friendlyContent)],
      quickReplyOptions: quickReplies,
      waitingForUserInput: true,
      pendingTaskPlan: mappedPlan ?? undefined,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Task generation stream failed", err);
    const errorMessage = "抱歉，生成任务计划时出错了。请稍后再试。";
    yield errorMessage;
    
    return {
      ...state,
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试"]),
      waitingForUserInput: true,
    };
  }
}

export async function* progressQueryNodeStream(
  state: GraphStateType
): AsyncGenerator<string, GraphStateType, unknown> {
  logger.info("Progress query stream node executing");

  try {
    const llm = createLLM();
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const contextEnhancer = getContextEnhancer();
    const context = await contextEnhancer.enhanceContext(state.userId, content);

    const systemPrompt = SYSTEM_PROMPTS.GENERAL_QA;
    const userPrompt = `用户ID：${state.userId}\n${contextEnhancer.generateSystemPromptEnhancement(context)}`;

    const stream = await llm.stream([
      new SystemMessage(systemPrompt),
      ...buildLLMMessages(state.messages.slice(0, -1)),
      new HumanMessage(userPrompt),
    ]);

    let fullContent = "";
    for await (const chunk of stream) {
      const chunkContent = chunk.content as string;
      fullContent += chunkContent;
      yield chunkContent;
    }

    LogTools.logAgentDecision(state.userId, state.userIntent, "Progress query Stream");

    return {
      ...state,
      messages: [...state.messages, new AIMessage(fullContent)],
      quickReplyOptions: createQuickReplies(["继续提问", "查看详细进度", "返回首页"]),
      waitingForUserInput: false,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Progress query stream failed", err);
    const errorMessage = "抱歉，查询进度时出错了。请稍后再试。";
    yield errorMessage;

    return {
      ...state,
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试", "返回首页"]),
      waitingForUserInput: false,
    };
  }
}

export async function* emotionSupportNodeStream(
  state: GraphStateType
): AsyncGenerator<string, GraphStateType, unknown> {
  logger.info("Emotion support stream node executing");

  try {
    const llm = createLLM();
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const emotionDetector = getEmotionDetector();
    const emotion = await emotionDetector.detectEmotion(content);

    const systemPrompt = SYSTEM_PROMPTS.EMOTION_SUPPORT;
    const userPrompt = `用户情绪：${emotion.emotion}\n用户消息：${content}`;

    const stream = await llm.stream([
      new SystemMessage(systemPrompt),
      ...buildLLMMessages(state.messages.slice(0, -1)),
      new HumanMessage(userPrompt),
    ]);

    let fullContent = "";
    for await (const chunk of stream) {
      const chunkContent = chunk.content as string;
      fullContent += chunkContent;
      yield chunkContent;
    }

    LogTools.logAgentDecision(state.userId, state.userIntent, "Emotion support Stream");

    return {
      ...state,
      messages: [...state.messages, new AIMessage(fullContent)],
      quickReplyOptions: createQuickReplies(["继续倾诉", "换个话题", "结束对话"]),
      waitingForUserInput: false,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Emotion support stream failed", err);
    const errorMessage = "抱歉，情感支持时出错了。请稍后再试。";
    yield errorMessage;

    return {
      ...state,
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: createQuickReplies(["重试", "结束对话"]),
      waitingForUserInput: false,
    };
  }
}
