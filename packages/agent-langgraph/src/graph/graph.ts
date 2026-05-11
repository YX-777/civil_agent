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
import { logAgentEvent } from "../utils/event-logger";

/**
 * 把任务规划节点返回的 JSON（或中文 key:value）渲染成 markdown 表格
 *
 * 兼容三种输入：
 * 1. 严格 JSON: {"tech_stack":"React","daily_practice":"每天3个","difficulty":"基础","duration":"7天","reason":"..."}
 * 2. JSON 被 ```json 包裹
 * 3. 中文 key:value（"技术栈：xxx\n练习量：xxx"）
 */
function formatTaskPlanAsMarkdown(raw: string): string {
  const header = "## 📋 为你定制的学习计划";
  const footer = "> 如需调整，请使用下方快捷按钮。";
  const safe = (v: any) => (v == null ? "—" : String(v).trim() || "—");

  // 1) 尝试提取 JSON
  let parsed: Record<string, any> | null = null;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      parsed = null;
    }
  }

  if (parsed) {
    const tech = safe(parsed.tech_stack || parsed.techStack || parsed.module || parsed.技术栈);
    const practice = safe(parsed.daily_practice || parsed.dailyPractice || parsed.practice || parsed.练习量);
    const difficulty = safe(parsed.difficulty || parsed.难度);
    const duration = safe(parsed.duration || parsed.period || parsed.周期);
    const reason = safe(parsed.reason || parsed.说明 || parsed.理由);
    const path: any[] = Array.isArray(parsed.learning_path) ? parsed.learning_path : (Array.isArray(parsed.阶段) ? parsed.阶段 : []);
    const resources: any[] = Array.isArray(parsed.resources) ? parsed.resources : (Array.isArray(parsed.推荐资料) ? parsed.推荐资料 : []);

    const parts: string[] = [
      header,
      "",
      "| 项目 | 内容 |",
      "| --- | --- |",
      `| 🎯 技术栈 | ${tech} |`,
      `| 📝 练习量 | ${practice} |`,
      `| 📊 难度 | ${difficulty} |`,
      `| ⏳ 周期 | ${duration} |`,
      "",
    ];

    if (path.length > 0) {
      parts.push("### 🗺️ 学习路径");
      path.forEach((p, i) => parts.push(`${i + 1}. ${String(p).trim()}`));
      parts.push("");
    }

    if (resources.length > 0) {
      parts.push("### 📚 推荐资料");
      resources.forEach((r) => parts.push(`- ${String(r).trim()}`));
      parts.push("");
    }

    if (reason && reason !== "—") {
      parts.push(`**为什么选这个？** ${reason}`);
      parts.push("");
    }
    parts.push(footer);

    return parts.join("\n");
  }

  // 2) 中文 key:value 兜底（去掉可能的 JSON 残余后保留行）
  const lines = cleaned.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  return [header, "", ...lines, "", footer].join("\n");
}

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
      // ========== Step: 意图识别 ==========
      const intentT0 = Date.now();
      yield {
        type: "step",
        text: "",
        stepId: "intent",
        stepLabel: "意图识别",
        stepIcon: "🎯",
        stepStatus: "running",
      };

      const intentResult = await intentRecognitionNode(state);
      const currentState: GraphStateType = {
        ...state,
        ...intentResult,
        userId: state.userId,
        messages: intentResult.messages
          ? [...state.messages, ...intentResult.messages]
          : state.messages,
        userIntent: intentResult.userIntent || state.userIntent,
        intentDecision: intentResult.intentDecision || state.intentDecision,
        waitingForUserInput: intentResult.waitingForUserInput ?? state.waitingForUserInput,
        quickReplyOptions: intentResult.quickReplyOptions || state.quickReplyOptions,
        ragResults: intentResult.ragResults || state.ragResults,
        feishuTaskIds: intentResult.feishuTaskIds || state.feishuTaskIds,
      };

      const intent = currentState.userIntent;
      logger.info(`Stream routing by intent: ${intent}`);

      // 意图友好名称映射
      const intentLabels: Record<string, string> = {
        create_task: "制定学习计划",
        progress_tracking: "查询学习进度",
        emotional_support: "情绪支持",
        general_inquiry: "通用问答",
      };

      // 拼出更详细的 detail：意图 + 理由 + 关键词 + 耗时
      const decision = currentState.intentDecision;
      const intentLabel = intentLabels[intent] || intent;
      const detailParts: string[] = [intentLabel];
      if (decision?.reasoning) detailParts.push(decision.reasoning);
      if (decision?.keywords && decision.keywords.length > 0) {
        detailParts.push(`关键词：${decision.keywords.join("、")}`);
      }
      detailParts.push(`${Date.now() - intentT0}ms`);

      yield {
        type: "step",
        text: "",
        stepId: "intent",
        stepLabel: "意图识别",
        stepIcon: "🎯",
        stepStatus: "done",
        stepDetail: detailParts.join(" · "),
      };

      // 埋点：意图识别完成
      logAgentEvent({
        userId: state.userId,
        eventType: "intent",
        eventName: intent,
        payload: {
          intentLabel,
          reasoning: decision?.reasoning,
          keywords: decision?.keywords,
        },
        durationMs: Date.now() - intentT0,
      });

      // Step 2: 根据意图选择流式节点
      const nodeT0 = Date.now();
      try {
        if (intent === "create_task") {
          // === Step: 需求确认 / 信息收集 ===
          const checkT0 = Date.now();
          yield {
            type: "step",
            text: "",
            stepId: "clarify",
            stepLabel: "需求确认",
            stepIcon: "❓",
            stepStatus: "running",
          };

          const result = await taskGenerationNode(currentState);
          const lastMessage = result.messages?.[result.messages.length - 1];
          const planContent = typeof lastMessage?.content === "string" ? lastMessage.content : "";

          // 分支 1：需要追问，不进入"生成计划"step，直接 yield 反问内容
          if (result.clarificationNeeded) {
            yield {
              type: "step",
              text: "",
              stepId: "clarify",
              stepLabel: "需求确认",
              stepIcon: "❓",
              stepStatus: "done",
              stepDetail: `信息不充足，发起追问 · ${Date.now() - checkT0}ms`,
            };
            // 反问消息不包 markdown 表格，直接原文输出（剥掉【需求确认】内部标记前面的换行即可）
            yield { type: "content", text: planContent };
            return { ...currentState, ...result } as GraphStateType;
          }

          // 分支 2：信息充足，进入完整生成链路
          yield {
            type: "step",
            text: "",
            stepId: "clarify",
            stepLabel: "需求确认",
            stepIcon: "❓",
            stepStatus: "done",
            stepDetail: `需求明确 · ${Date.now() - checkT0}ms`,
          };

          // 上一份计划检测（用于区分是"调整"还是"新建"）
          const isAdjustment = currentState.messages.some((m: any) => {
            const role = m.role || (m._getType ? m._getType() : "");
            const c = typeof m.content === "string" ? m.content : "";
            return (role === "assistant" || role === "ai") && (c.includes("📋") || c.includes("学习计划"));
          });

          // 检索 + 生成两个 step 在 taskGenerationNode 内部已完成，这里 yield 收尾状态
          yield {
            type: "step",
            text: "",
            stepId: "rag",
            stepLabel: "检索学习历史",
            stepIcon: "📚",
            stepStatus: "done",
            stepDetail: "已注入用户进度上下文",
          };
          yield {
            type: "step",
            text: "",
            stepId: "generate",
            stepLabel: "生成学习计划",
            stepIcon: "🎯",
            stepStatus: "done",
            stepDetail: isAdjustment ? "基于上一份计划调整" : "结构化新计划已就绪",
          };

          if (planContent) {
            const markdownPlan = formatTaskPlanAsMarkdown(planContent);
            yield { type: "content", text: markdownPlan };
          }

          logAgentEvent({
            userId: state.userId,
            eventType: "node",
            eventName: "task_generation",
            payload: { isAdjustment, planLength: planContent.length },
            durationMs: Date.now() - nodeT0,
          });

          return { ...currentState, ...result } as GraphStateType;
        } else if (intent === "progress_tracking") {
          const result = await progressQueryNode(currentState);
          if (result.messages?.length) {
            const lastMessage = result.messages[result.messages.length - 1];
            if (lastMessage?.content) {
              yield { type: "content", text: lastMessage.content as string };
            }
          }
          logAgentEvent({
            userId: state.userId,
            eventType: "node",
            eventName: "progress_query",
            durationMs: Date.now() - nodeT0,
          });
          return { ...currentState, ...result } as GraphStateType;
        } else if (intent === "emotional_support") {
          const result = await emotionSupportNode(currentState);
          if (result.messages?.length) {
            const lastMessage = result.messages[result.messages.length - 1];
            if (lastMessage?.content) {
              yield { type: "content", text: lastMessage.content as string };
            }
          }
          logAgentEvent({
            userId: state.userId,
            eventType: "node",
            eventName: "emotion_support",
            durationMs: Date.now() - nodeT0,
          });
          return { ...currentState, ...result } as GraphStateType;
        } else {
          // 默认（包括 general_inquiry）使用通用问答流式
          const streamGenerator = generalQANodeStream(currentState);

          // 关键：用 next() 显式捕获 generator 的 return value
          // for-await-of 会丢失 return value，导致 usedSources/ragResults 等字段无法回传到 finalState
          let nodeResult: any = null;
          while (true) {
            const r = await streamGenerator.next();
            if (r.done) {
              nodeResult = r.value;
              break;
            }
            yield r.value;
          }

          logAgentEvent({
            userId: state.userId,
            eventType: "node",
            eventName: "general_qa",
            payload: {
              sourcesCount: nodeResult?.usedSources?.length || 0,
              ragResultsCount: nodeResult?.ragResults?.length || 0,
            },
            durationMs: Date.now() - nodeT0,
          });

          return { ...currentState, ...(nodeResult || {}) } as GraphStateType;
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