/**
 * 节点定义
 * LangGraph 状态机的各个节点
 */

import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
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

/**
 * 创建快捷回复选项
 */
function createQuickReplies(texts: string[]): QuickReplyOption[] {
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
    const config = getAgentConfig();
    const llm = new ChatAnthropic({
      model: config.llm.model,
      temperature: 0,
      maxTokens: 100,
      apiKey: config.llm.apiKey,
    });

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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
    const mcpClient = getMCPToolClient();
    const ragResult = await mcpClient.searchKnowledge({
      query: `用户 ${state.userId} 的学习进度和薄弱模块`,
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

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const quickReplies = ["确认计划", "调整任务", "取消"];

    LogTools.logAgentDecision(state.userId, state.userIntent, "Task generation");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: createQuickReplies(quickReplies),
      waitingForUserInput: true,
      ragResults: ragResult.success ? ragResult.data?.results : [],
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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
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

  const config = getAgentConfig();
  const llm = new ChatAnthropic({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: config.llm.apiKey,
  });

  try {
    const lastMessage = state.messages[state.messages.length - 1];
    const content = lastMessage.content as string;

    const contextEnhancer = getContextEnhancer();
    const enhancedMessage = await contextEnhancer.enhanceUserMessage(state.userId, content);

    const systemPrompt = SYSTEM_PROMPTS.DEFAULT;
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(enhancedMessage),
    ]);

    LogTools.logAgentDecision(state.userId, state.userIntent, "General QA");

    return {
      messages: [...state.messages, new AIMessage(response.content as string)],
      quickReplyOptions: [],
      waitingForUserInput: false,
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