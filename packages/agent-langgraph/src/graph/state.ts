/**
 * GraphState 定义
 * LangGraph 状态机使用的状态结构
 */

import type { UserIntent, QuickReplyOption } from "@tech-mate/core";
import type { StateGraphArgs } from "@langchain/langgraph";

export interface EmotionContext {
  emotion: string;
  intensity: number;
  timestamp: Date;
  triggers: string[];
  copingStrategies?: string[];
}

export interface PendingTaskPlan {
  title: string;
  description: string;
  module: string | null;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  dailyQuestionCount: number | null;
  periodDays: number | null;
  reason?: string | null;
  rawPlan: string;
}

export interface GraphStateType {
  userId: string;
  messages: any[];
  userIntent: UserIntent;
  waitingForUserInput: boolean;
  quickReplyOptions: QuickReplyOption[];
  ragResults: any[];
  feishuTaskIds: string[];
  emotionContext?: EmotionContext;
  pendingTaskPlan?: PendingTaskPlan;
}

/**
 * StateGraph Channels 定义
 * 定义状态合并规则（reducer）
 *
 * 面试讲法：
 * "messages 用 concat 累加（对话历史越来越长），
 *  userIntent 用覆盖（新意图替换旧意图），
 *  这样每个节点只需要关心自己修改的部分，状态管理自动化了"
 */
export const graphStateChannels: StateGraphArgs<GraphStateType>["channels"] = {
  userId: {
    value: (x: string, y: string) => y ?? x,
    default: () => "",
  },
  messages: {
    value: (x: any[], y: any[]) => y ? x.concat(y) : x,  // 数组累加
    default: () => [],
  },
  userIntent: {
    value: (x: UserIntent, y: UserIntent) => y ?? x ?? "general_inquiry",
    default: () => "general_inquiry" as UserIntent,
  },
  waitingForUserInput: {
    value: (x: boolean, y: boolean) => y ?? x ?? false,
    default: () => false,
  },
  quickReplyOptions: {
    value: (x: QuickReplyOption[], y: QuickReplyOption[]) => y ?? x ?? [],
    default: () => [],
  },
  ragResults: {
    value: (x: any[], y: any[]) => y ?? x ?? [],
    default: () => [],
  },
  feishuTaskIds: {
    value: (x: string[], y: string[]) => y ? x.concat(y) : x,
    default: () => [],
  },
  emotionContext: {
    value: (x: EmotionContext | undefined, y: EmotionContext | undefined) => y ?? x,
    default: () => undefined,
  },
  pendingTaskPlan: {
    value: (x: PendingTaskPlan | undefined, y: PendingTaskPlan | undefined) => y ?? x,
    default: () => undefined,
  },
};

export const createInitialState = (userId: string): GraphStateType => ({
  userId,
  messages: [],
  userIntent: "general_inquiry",
  waitingForUserInput: false,
  quickReplyOptions: [],
  ragResults: [],
  feishuTaskIds: [],
  emotionContext: undefined,
  pendingTaskPlan: undefined,
});
