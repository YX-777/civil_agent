/**
 * 图构建
 * LangGraph 状态机的图构建
 */

import { logger } from "@civil-agent/core";
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

  logger.info("Agent graph created successfully");

  return {
    processState,
  };
}