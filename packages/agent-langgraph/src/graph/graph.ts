/**
 * 图构建 - StateGraph 实现
 * LangGraph 状态机的图构建
 *
 * 改造说明：
 * - 从手动 switch-case 编排改为标准 StateGraph
 * - edges.ts 中定义的路由函数现在被真正使用
 * - 面试讲法："就像地铁线路图，每个节点是站，边是线路"
 */

import { logger } from "@civil-agent/core";
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
     * 流式执行（兼容现有接口）
     * 遍历 StateGraph 的 stream() 输出，提取消息内容
     */
    processStateStream: async function* (
      state: GraphStateType
    ): AsyncGenerator<string, GraphStateType, unknown> {
      const stream = await app.stream(state, {
        configurable: { thread_id: `session-${state.userId}-${Date.now()}` },
      });

      let finalState = state;

      for await (const event of stream) {
        // event 格式: { node_name: { messages: [...], ... } }
        const nodeName = Object.keys(event)[0];
        const nodeOutput = event[nodeName] as Partial<GraphStateType>;

        // 更新 finalState（累加状态）
        if (nodeOutput) {
          finalState = {
            ...finalState,
            ...nodeOutput,
            messages: nodeOutput.messages
              ? [...finalState.messages, ...nodeOutput.messages]
              : finalState.messages,
          };
        }

        // 如果有新消息，yield 内容（非 intent_recognition 节点）
        if (nodeName !== "intent_recognition" && nodeOutput?.messages?.length) {
          const lastMessage = nodeOutput.messages[nodeOutput.messages.length - 1];
          if (lastMessage?.content && typeof lastMessage.content === "string") {
            yield lastMessage.content;
          }
        }
      }

      return finalState as GraphStateType;
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