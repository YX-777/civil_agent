/**
 * 节点定义
 * LangGraph 状态机的各个节点
 */

import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { logger, QuickReplyOption } from "@civil-agent/core";
import type { UserIntent } from "@civil-agent/core";
import { SYSTEM_PROMPTS } from "../prompts/system-prompts";
import { TASK_PROMPTS } from "../prompts/task-prompts";
import { getMCPToolClient } from "../tools/mcp-tools";
import { TimeTools, StringTools, ProgressTools, LogTools } from "../tools/local-tools";
import { getEmotionDetector } from "../middleware/emotion-detector";
import { getContextEnhancer } from "../middleware/context-enhancer";
import { getAgentConfig } from "../config/agent.config";
import type { GraphStateType } from "./state";
import { retrieveWithFallback } from "../utils/rag-fallback";
import {
  buildGeneralAnswerPrompt,
  resolveXiaohongshuKnowledge,
  shouldRouteToXiaohongshuRag,
} from "./xiaohongshu-rag";
import { parseTaskPlanFromText } from "./task-plan";
import { getMemoryFusionRetriever, type Message } from "../memory";

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
      model: "qwen3.6-plus",
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
 * 流式调用百炼 API
 */
async function* streamDashscopeAPI(systemPrompt: string, userPrompt: string): AsyncGenerator<string> {
  const config = getAgentConfig();
  const apiKey = config.llm.apiKey;

  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen3.6-plus",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: config.llm.maxTokens,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const dataStr = line.slice(6);
        if (dataStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(dataStr) as any;
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) yield content;
        } catch {}
      }
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
 */
export async function intentRecognitionNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Intent recognition node executing");

  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage.content as string;

  const intentPrompt = SYSTEM_PROMPTS.INTENT_RECOGNITION.replace("{message}", content);

  try {
    const llm = createLLM();

    const response = await llm.invoke([new HumanMessage(intentPrompt)]);
    const intentText = response.content as string;
    const intent = intentText.trim() as UserIntent;

    logger.info(`Detected intent: ${intent}`);

    return {
      userIntent: intent,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Intent recognition failed", err);
    return {
      userIntent: "general_inquiry",
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
 * 任务生成节点
 */
export async function taskGenerationNode(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  logger.info("Task generation node executing");

  try {
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

    // 把用户原始需求也传递给模型，强调技术学习场景
    const enhancedUserPrompt = `用户具体需求：${userRequest}

${userPrompt}`;

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
      quickReplyOptions: [],
      waitingForUserInput: false,
      ragResults: ragResult.success ? ragResult.data?.results : [],
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Progress query failed", err);
    const errorMessage = "抱歉，查询学习进度时出错了。请稍后再试。";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: [],
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
    console.log("=".repeat(60));
    console.log("🧠 [Memory] 开始四层记忆融合检索");
    console.log("=".repeat(60));

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

    // ========== RAG Engine 集成测试日志 ==========
    console.log("\n");
    console.log("=".repeat(60));
    console.log("🔍 [RAG TEST] 用户问题:", content);
    console.log("🔍 [RAG TEST] 白名单命中:", shouldRouteToXiaohongshuRag(content));
    console.log("=".repeat(60));

    // 使用 HybridRetriever + MCP 降级的 RAG 检索
    let ragContext = "";
    let ragResults: any[] = [];

    if (config.features.ragEnabled && shouldRouteToXiaohongshuRag(content)) {
      console.log("🔍 [RAG TEST] 正在调用 HybridRetriever...");

      const ragFallbackResult = await retrieveWithFallback(content, { topK: 5 });
      ragContext = ragFallbackResult.context;
      ragResults = ragFallbackResult.results;

      // ========== RAG 检索结果日志 ==========
      console.log("=".repeat(60));
      console.log("✅ [RAG TEST] 检索来源:", ragFallbackResult.source);
      console.log("✅ [RAG TEST] 三级策略:", ragFallbackResult.tier);
      console.log("✅ [RAG TEST] 检索到文档数:", ragResults.length);
      if (ragResults.length > 0) {
        console.log("✅ [RAG TEST] 第一条文档标题:", ragResults[0]?.metadata?.title || "无标题");
        console.log("✅ [RAG TEST] 第一条文档分类:", ragResults[0]?.metadata?.category || "无分类");
        console.log("✅ [RAG TEST] 第一条文档分数:", ragResults[0]?.score || "无分数");
      }
      console.log("=".repeat(60));
      console.log("\n");
    } else {
      console.log("🔍 [RAG TEST] 白名单未命中，跳过 RAG 检索");
      console.log("=".repeat(60));
      console.log("\n");
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
      quickReplyOptions: [],
      waitingForUserInput: false,
      ragResults,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("General QA failed", err);
    const errorMessage = "抱歉，我无法理解你的问题。请换个方式问我。";
    return {
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: [],
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
): AsyncGenerator<string, GraphStateType, unknown> {
  logger.info("General QA stream node executing");

  try {
    const llm = createLLM();
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const contextEnhancer = getContextEnhancer();
    const enhancedMessage = await contextEnhancer.enhanceUserMessage(state.userId, content);
    const config = getAgentConfig();

    // ========== 四层记忆融合检索（面试核心亮点）==========
    console.log("\n");
    console.log("=".repeat(60));
    console.log("🧠 [Memory] 开始四层记忆融合检索");
    console.log("=".repeat(60));

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
    console.log("=".repeat(60));
    console.log("\n");

    // ========== RAG Engine 集成测试日志 ==========
    console.log("=".repeat(60));
    console.log("🔍 [RAG TEST] 用户问题:", content);
    console.log("🔍 [RAG TEST] 白名单命中:", shouldRouteToXiaohongshuRag(content));
    console.log("=".repeat(60));

    // 使用 HybridRetriever + MCP 降级的 RAG 检索
    let ragContext = "";
    let ragResults: any[] = [];

    if (config.features.ragEnabled && shouldRouteToXiaohongshuRag(content)) {
      console.log("🔍 [RAG TEST] 正在调用 HybridRetriever...");

      const ragFallbackResult = await retrieveWithFallback(content, { topK: 5 });
      ragContext = ragFallbackResult.context;
      ragResults = ragFallbackResult.results;

      // ========== RAG 检索结果日志 ==========
      console.log("=".repeat(60));
      console.log("✅ [RAG TEST] 检索来源:", ragFallbackResult.source);
      console.log("✅ [RAG TEST] 三级策略:", ragFallbackResult.tier);
      console.log("✅ [RAG TEST] 检索到文档数:", ragResults.length);
      if (ragResults.length > 0) {
        console.log("✅ [RAG TEST] 第一条文档标题:", ragResults[0]?.metadata?.title || "无标题");
        console.log("✅ [RAG TEST] 第一条文档分类:", ragResults[0]?.metadata?.category || "无分类");
        console.log("✅ [RAG TEST] 第一条文档分数:", ragResults[0]?.score || "无分数");
      }
      console.log("=".repeat(60));
      console.log("\n");
    } else {
      console.log("🔍 [RAG TEST] 白名单未命中，跳过 RAG 检索");
      console.log("=".repeat(60));
      console.log("\n");
    }

    // 构建 prompt：优先使用 RAG context，否则使用原始消息
    const userPrompt = ragContext || enhancedMessage;

    const systemPrompt = SYSTEM_PROMPTS.DEFAULT;

    const stream = await llm.stream([
      new SystemMessage(systemPrompt),
      ...buildLLMMessages(state.messages.slice(0, -1)),
      new HumanMessage(userPrompt),
    ]);

    let fullContent = "";
    for await (const chunk of stream) {
      // 处理多种 chunk 格式
      // LangChain ChatOpenAI stream 可能返回 AIMessageChunk
      let chunkContent = "";
      if (typeof chunk.content === "string") {
        chunkContent = chunk.content;
      } else if (chunk?.content) {
        // AIMessageChunk 格式
        chunkContent = String(chunk.content);
      }

      // 只 yield 有内容的 chunk
      if (chunkContent) {
        fullContent += chunkContent;
        yield chunkContent;
      }
    }

    LogTools.logAgentDecision(state.userId, state.userIntent, "General QA Stream");

    return {
      ...state,
      messages: [...state.messages, new AIMessage(fullContent)],
      quickReplyOptions: [],
      waitingForUserInput: false,
      ragResults,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("General QA stream failed", err);
    const errorMessage = "抱歉，我无法理解你的问题。请换个方式问我。";
    yield errorMessage;

    return {
      ...state,
      messages: [...state.messages, new AIMessage(errorMessage)],
      quickReplyOptions: [],
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
      quickReplyOptions: [],
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
      quickReplyOptions: [],
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
      quickReplyOptions: [],
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
      quickReplyOptions: [],
      waitingForUserInput: false,
    };
  }
}
