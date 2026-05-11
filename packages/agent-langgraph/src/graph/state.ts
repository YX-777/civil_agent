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

/**
 * 答案使用到的信息来源，用于前端独立渲染"参考来源" UI。
 */
export interface UsedSource {
  type: "memory" | "kb" | "web";
  title: string;
  detail?: string;
  url?: string;          // web 类型的链接
  score?: number;        // kb 类型的检索分数
}

/**
 * 意图识别返回的附加判断信息（用于前端 step 透出）
 */
export interface IntentDecision {
  reasoning: string;
  keywords: string[];
}

export interface GraphStateType {
  userId: string;
  messages: any[];
  userIntent: UserIntent;
  intentDecision?: IntentDecision;
  waitingForUserInput: boolean;
  quickReplyOptions: QuickReplyOption[];
  ragResults: any[];
  feishuTaskIds: string[];
  emotionContext?: EmotionContext;
  pendingTaskPlan?: PendingTaskPlan;
  usedSources?: UsedSource[];
  /**
   * create_task 流程标志：true 表示当前轮还在收集需求（反问用户），
   * 不是最终计划。graph.ts 据此选择不同的输出渲染路径。
   */
  clarificationNeeded?: boolean;
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
  intentDecision: {
    value: (x: IntentDecision | undefined, y: IntentDecision | undefined) => y ?? x,
    default: () => undefined,
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
  usedSources: {
    value: (x: UsedSource[] | undefined, y: UsedSource[] | undefined) => y ?? x,
    default: () => undefined,
  },
  clarificationNeeded: {
    value: (x: boolean | undefined, y: boolean | undefined) => y ?? x,
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
