/**
 * 边定义
 * LangGraph 状态机的边（转换条件）
 */

import type { UserIntent } from "@civil-agent/core";
import type { GraphStateType } from "./state";

/**
 * 意图识别后的路由
 */
export function routeByIntent(state: GraphStateType): string {
  switch (state.userIntent) {
    case "create_task":
      return "task_generation";
    case "progress_tracking":
      return "progress_query";
    case "emotional_support":
      return "emotion_support";
    case "general_inquiry":
    default:
      return "general_qa";
  }
}

/**
 * 是否等待用户输入
 */
export function shouldWaitForInput(state: GraphStateType): string {
  return state.waitingForUserInput ? "wait_for_input" : "generate_response";
}

/**
 * 是否需要情感支持
 */
export function needsEmotionSupport(state: GraphStateType): string {
  const negativeEmotions = ["焦虑", "挫败", "迷茫", "疲惫"];
  const emotion = state.emotionContext?.emotion;

  if (emotion && negativeEmotions.includes(emotion)) {
    return "emotion_support";
  }

  return "continue";
}

/**
 * 任务确认后的路由
 */
export function routeAfterTaskConfirmation(state: GraphStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content as string;

  if (content?.includes("确认") || content?.includes("好的")) {
    return "create_task";
  } else if (content?.includes("调整") || content?.includes("修改")) {
    return "adjust_task";
  } else {
    return "cancel_task";
  }
}

/**
 * 早安问候后的路由
 */
export function routeAfterMorningGreeting(state: GraphStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content as string;

  if (content?.includes("开始")) {
    return "task_generation";
  } else if (content?.includes("调整")) {
    return "adjust_plan";
  } else if (content?.includes("查看")) {
    return "progress_query";
  } else {
    return "general_qa";
  }
}

/**
 * 晚间复盘后的路由
 */
export function routeAfterEveningReview(state: GraphStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content as string;

  if (content?.includes("记录") || content?.includes("心得")) {
    return "save_note";
  } else if (content?.includes("查看") || content?.includes("数据")) {
    return "progress_query";
  } else if (content?.includes("休息")) {
    return "end_conversation";
  } else {
    return "general_qa";
  }
}

/**
 * 情感支持后的路由
 */
export function routeAfterEmotionSupport(state: GraphStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = lastMessage?.content as string;

  if (content?.includes("分析") || content?.includes("薄弱")) {
    return "analyze_weakness";
  } else if (content?.includes("制定") || content?.includes("突破")) {
    return "create_breakthrough_plan";
  } else if (content?.includes("结束") || content?.includes("再见")) {
    return "end_conversation";
  } else {
    return "continue_conversation";
  }
}

/**
 * 边类型定义
 */
export type EdgeType =
  | "intent_recognition"
  | "morning_greeting"
  | "evening_review"
  | "task_generation"
  | "emotion_support"
  | "progress_query"
  | "general_qa"
  | "generate_response"
  | "end";

/**
 * 边配置
 */
export const EDGE_CONFIG = {
  intent_recognition: {
    next: routeByIntent,
  },
  morning_greeting: {
    next: routeAfterMorningGreeting,
  },
  evening_review: {
    next: routeAfterEveningReview,
  },
  task_generation: {
    next: shouldWaitForInput,
  },
  emotion_support: {
    next: routeAfterEmotionSupport,
  },
  progress_query: {
    next: "generate_response",
  },
  general_qa: {
    next: "generate_response",
  },
  generate_response: {
    next: "end",
  },
};