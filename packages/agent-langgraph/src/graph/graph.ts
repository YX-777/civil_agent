/**
 * 图构建 - StateGraph 实现
 * LangGraph 状态机的图构建
 *
 * 改造说明：
 * - 从手动 switch-case 编排改为标准 StateGraph
 * - edges.ts 中定义的路由函数现在被真正使用
 * - 面试讲法："就像地铁线路图，每个节点是站，边是线路"
 */

import { logger } from "@tech-mate/core";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import type { GraphStateType } from "./state";
import { graphStateChannels, createInitialState } from "./state";
import {
  intentRecognitionNode,
  taskGenerationNode,
  progressQueryNode,
  emotionSupportNode,
  generalQANode,
  generateResponseNode,
  generalQANodeStream,
  StreamChunk,
  streamDashscopeAPIWithThinking,
} from "./nodes";
import { routeByIntent } from "./edges";
import { getAgentConfig, validateAgentConfig } from "../config/agent.config";

/**
 * 创建 Agent StateGraph
 *
 * 面试讲法：
 * "StateGraph 就像地铁线路图：
 *  - START → intent_recognition（入口站）
 *  - intent_recognition → 根据意图换乘（条件边）
 *  - 各意图节点 → generate_response → END（终点站）
 *  - 状态（乘客信息）在每个站自动更新和传递"
 */
export function createAgentGraph() {
  logger.info("Creating agent graph with StateGraph");

  const config = getAgentConfig();
  validateAgentConfig(config);

  // ========== 创建 StateGraph workflow ==========
  // 注意：分步调用以正确推断 TypeScript 类型
  const workflow = new StateGraph<GraphStateType>({ channels: graphStateChannels });

  // ========== 添加节点（地铁站）==========
  workflow.addNode("intent_recognition", intentRecognitionNode);
  workflow.addNode("task_generation", taskGenerationNode);
  workflow.addNode("progress_query", progressQueryNode);
  workflow.addNode("emotion_support", emotionSupportNode);
  workflow.addNode("general_qa", generalQANode);
  workflow.addNode("generate_response", generateResponseNode);

  // ========== 添加边（地铁线路）==========
  // 固定边：START → intent_recognition
  workflow.addEdge(START, "intent_recognition" as any);

  // 条件边：intent_recognition → 根据意图路由
  // routeByIntent 返回节点名称，StateGraph 自动传递状态到对应节点
  // 注意：不传 pathMap，让 StateGraph 根据路由函数返回值决定
  workflow.addConditionalEdges("intent_recognition" as any, routeByIntent);

  // 固定边：所有意图节点 → generate_response
  workflow.addEdge("task_generation" as any, "generate_response" as any);
  workflow.addEdge("progress_query" as any, "generate_response" as any);
  workflow.addEdge("emotion_support" as any, "generate_response" as any);
  workflow.addEdge("general_qa" as any, "generate_response" as any);

  // 固定边：generate_response → END
  workflow.addEdge("generate_response" as any, END);

  // ========== 编译 Graph（可选：添加持久化）==========
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });

  logger.info("Agent graph created successfully with StateGraph");

  return {
    /**
     * 非流式执行（兼容现有接口）
     */
    processState: async (state: GraphStateType): Promise<GraphStateType> => {
      const result = await app.invoke(state, {
        configurable: { thread_id: `session-${state.userId}-${Date.now()}` },
      });
      return result as GraphStateType;
    },

    /**
     * 流式执行（支持真正的逐字符流式输出 + 思考过程）
     *
     * 实现原理：
     * 1. 先执行意图识别（非流式）
     * 2. 根据意图选择对应的流式节点
     * 3. 直接调用流式节点，逐字符 yield
     *
     * 返回类型：StreamChunk = { type: "thought" | "content"; text: string }
     * - thought: 思考过程（灰色背景区域）
     * - content: 正式回答
     */
    processStateStream: async function* (
      state: GraphStateType
    ): AsyncGenerator<StreamChunk, GraphStateType, unknown> {
      // Step 1: 执行意图识别（非流式，快速）
      const intentResult = await intentRecognitionNode(state);
      const currentState: GraphStateType = {
        ...state,
        ...intentResult,
        userId: state.userId,
        messages: intentResult.messages
          ? [...state.messages, ...intentResult.messages]
          : state.messages,
        userIntent: intentResult.userIntent || state.userIntent,
        waitingForUserInput: intentResult.waitingForUserInput ?? state.waitingForUserInput,
        quickReplyOptions: intentResult.quickReplyOptions || state.quickReplyOptions,
        ragResults: intentResult.ragResults || state.ragResults,
        feishuTaskIds: intentResult.feishuTaskIds || state.feishuTaskIds,
      };

      const intent = currentState.userIntent;
      logger.info(`Stream routing by intent: ${intent}`);

      // Step 2: 根据意图选择流式节点
      try {
        if (intent === "create_task") {
          // 任务生成节点（使用带思考的流式）
          const lastUserMessage = currentState.messages.filter(m => m.role === "user").pop();
          const userRequest = typeof lastUserMessage?.content === "string"
            ? lastUserMessage.content
            : "用户想学习技术";

          const planSystemPrompt = `你是 TechMate 任务规划引擎。请先分析用户需求，再生成学习计划。

分析步骤：
1. 用户的技术背景是什么？
2. 用户想要学习什么？
3. 合适的学习路径是什么？

然后输出 JSON 格式的学习计划。`;

          const planUserPrompt = `用户需求：${userRequest}\n请生成技术学习计划。`;

          let planJson = "";
          for await (const chunk of streamDashscopeAPIWithThinking(planSystemPrompt, planUserPrompt)) {
            yield chunk;
            if (chunk.type === "content") {
              planJson += chunk.text;
            }
          }

          // 解析 JSON...
          const result = await taskGenerationNode(currentState);
          return { ...currentState, ...result } as GraphStateType;
        } else if (intent === "progress_tracking") {
          const result = await progressQueryNode(currentState);
          if (result.messages?.length) {
            const lastMessage = result.messages[result.messages.length - 1];
            if (lastMessage?.content) {
              yield { type: "content", text: lastMessage.content as string };
            }
          }
          return { ...currentState, ...result } as GraphStateType;
        } else if (intent === "emotional_support") {
          const result = await emotionSupportNode(currentState);
          if (result.messages?.length) {
            const lastMessage = result.messages[result.messages.length - 1];
            if (lastMessage?.content) {
              yield { type: "content", text: lastMessage.content as string };
            }
          }
          return { ...currentState, ...result } as GraphStateType;
        } else {
          // 默认（包括 general_inquiry）使用通用问答流式
          const streamGenerator = generalQANodeStream(currentState);

          // generalQANodeStream 现在直接返回 StreamChunk
          for await (const chunk of streamGenerator) {
            yield chunk;
          }

          return currentState;
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("Stream processing error:", err);
        yield { type: "content", text: "抱歉，处理您的消息时出现了错误。请稍后再试。" };
        return currentState;
      }
    },

    /**
     * 直接访问编译后的 Graph（新增）
     * 用于可视化、调试等
     */
    app,

    /**
     * Workflow 定义（新增）
     * 用于面试展示 Graph 结构
     */
    workflow,
  };
}

/**
 * 导出 createInitialState（兼容现有接口）
 */
export { createInitialState };