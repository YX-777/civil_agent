/**
 * GraphState 定义
 * LangGraph 状态机使用的状态结构
 */

import type { UserIntent, QuickReplyOption } from "@civil-agent/core";

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
