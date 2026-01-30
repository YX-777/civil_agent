/**
 * 图构建
 * LangGraph 状态机的图构建
 */

import { logger } from "@civil-agent/core";
import { AIMessage } from "@langchain/core/messages";
import type { GraphStateType } from "./state";
import {
  intentRecognitionNode,
  morningGreetingNode,
  eveningReviewNode,
  taskGenerationNode,
  emotionSupportNode,
  progressQueryNode,
  generalQANode,
  generateResponseNode,
  generalQANodeStream,
  taskGenerationNodeStream,
  progressQueryNodeStream,
  emotionSupportNodeStream,
  createQuickReplies,
} from "./nodes";
import { getAgentConfig, validateAgentConfig } from "../config/agent.config";

/**
 * 创建 Agent 处理函数
 */
export function createAgentGraph() {
  logger.info("Creating agent graph");

  const config = getAgentConfig();
  validateAgentConfig(config);

  const processState = async (state: GraphStateType): Promise<GraphStateType> => {
    let currentState = { ...state };

    currentState = { ...currentState, ...(await intentRecognitionNode(currentState)) };

    switch (currentState.userIntent) {
      case "create_task":
        currentState = { ...currentState, ...(await taskGenerationNode(currentState)) };
        break;
      case "progress_tracking":
        currentState = { ...currentState, ...(await progressQueryNode(currentState)) };
        break;
      case "emotional_support":
        currentState = { ...currentState, ...(await emotionSupportNode(currentState)) };
        break;
      case "general_inquiry":
      default:
        currentState = { ...currentState, ...(await generalQANode(currentState)) };
        break;
    }

    currentState = { ...currentState, ...(await generateResponseNode(currentState)) };

    return currentState;
  };

  const processStateStream = async function* (state: GraphStateType): AsyncGenerator<string, GraphStateType, unknown> {
    let currentState = { ...state };

    currentState = { ...currentState, ...(await intentRecognitionNode(currentState)) };

    let streamGenerator: AsyncGenerator<string, GraphStateType, unknown>;
    
    switch (currentState.userIntent) {
      case "create_task":
        streamGenerator = taskGenerationNodeStream(currentState);
        break;
      case "progress_tracking":
        streamGenerator = progressQueryNodeStream(currentState);
        break;
      case "emotional_support":
        streamGenerator = emotionSupportNodeStream(currentState);
        break;
      case "general_inquiry":
      default:
        streamGenerator = generalQANodeStream(currentState);
        break;
    }

    let result: IteratorResult<string> | null = null;
    
    while (true) {
      result = await streamGenerator.next();
      if (result.done) {
        break;
      }
      yield result.value;
    }

    if (result && result.value) {
      currentState = result.value as GraphStateType;
      currentState = { ...currentState, ...(await generateResponseNode(currentState)) };
    }

    return currentState;
  };

  logger.info("Agent graph created successfully");

  return {
    processState,
    processStateStream,
  };
}