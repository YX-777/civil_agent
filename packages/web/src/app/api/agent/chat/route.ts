import { NextRequest, NextResponse } from "next/server";
import { createAgentGraph, createInitialState, startTrace, endTrace, TraceContext } from "@tech-mate/agent-langgraph";
import { getDatabase } from "@/lib/database";
import { getAgentStateRepository, getPrismaClient, getTaskService } from "@tech-mate/database";
import {
  buildStateKey,
  generateConversationTitle,
  parseStateData,
  validateChatPayload,
} from "@/lib/agent-state.contract";
import { pipeUIMessageStreamToResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { AIMessageChunk } from "@langchain/core/messages";

// 仅做进程内缓存使用，真实状态以数据库 agent_states 为准。
const userStates = new Map<string, any>();
const AGENT_STATE_CACHE_ENABLED = process.env.AGENT_STATE_CACHE_ENABLED !== "false";

let agentGraph: any;

try {
  agentGraph = createAgentGraph();
  console.log("[Agent API] Agent graph initialized successfully");
} catch (error) {
  console.error("[Agent API] Failed to initialize agent graph:", error);
  agentGraph = null;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateTurnId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getStateKey(userId: string, conversationId: string): string {
  return buildStateKey(userId, conversationId);
}

function getCachedState(userId: string, conversationId: string): any | null {
  if (!AGENT_STATE_CACHE_ENABLED) return null;
  return userStates.get(getStateKey(userId, conversationId)) ?? null;
}

function setCachedState(userId: string, conversationId: string, state: any): void {
  if (!AGENT_STATE_CACHE_ENABLED) return;
  userStates.set(getStateKey(userId, conversationId), state);
}

function clearCachedState(userId: string, conversationId: string): void {
  if (!AGENT_STATE_CACHE_ENABLED) return;
  userStates.delete(getStateKey(userId, conversationId));
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

function createQuickReplies(texts: string[]) {
  return texts.map((text) => ({
    id: `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    action: text,
  }));
}

function buildTaskDueDate(periodDays?: number | null): Date {
  const dueDate = new Date();
  dueDate.setHours(23, 59, 59, 999);
  dueDate.setDate(dueDate.getDate() + Math.max(1, periodDays ?? 1));
  return dueDate;
}

async function commitConversationTurn(params: {
  prisma: ReturnType<typeof getPrismaClient>;
  userId: string;
  conversationId: string;
  turnId: string;
  userMessage: { role: "user"; content: string; timestamp: Date };
  assistantMessage: { role: "assistant"; content: string; timestamp: Date };
  persistedState: any;
  fallbackTitleSource: string;
}) {
  const {
    prisma,
    userId,
    conversationId,
    turnId,
    userMessage,
    assistantMessage,
    persistedState,
    fallbackTitleSource,
  } = params;

  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        conversationId,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      },
    });
    await tx.message.create({
      data: {
        conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp,
      },
    });
    await tx.agentState.upsert({
      where: {
        userId_conversationId: {
          userId,
          conversationId,
        },
      },
      create: {
        userId,
        conversationId,
        stateData: JSON.stringify(persistedState),
      },
      update: {
        stateData: JSON.stringify(persistedState),
      },
    });

    // ========== 四阶分层记忆：自动存储短期记忆 ==========
    // 用户消息自动创建短期记忆记录
    const topicTags = extractTopicTags(userMessage.content);
    // 清理内容中的特殊字符，避免 Prisma 解析错误
    const cleanUserContent = sanitizeContent(userMessage.content);
    const shortMemoryRecord = await tx.shortTermMemory.create({
      data: {
        userId,
        conversationId,
        content: cleanUserContent.slice(0, 200),
        contentType: "user_message",
        topicTags: JSON.stringify(topicTags),
        freshnessScore: 1.0,
        accessCount: 0,
        lastAccessedAt: new Date(),
        archived: false,
      },
    });
    // 保存记录 ID 用于后续向量同步
    params.persistedState._shortMemoryId = shortMemoryRecord.id;
    console.log(`[Memory] 短期记忆已存储(SQLite): 话题=${topicTags.join(",")}`);

    // 助手回复也存储（可选）
    if (assistantMessage.content.length > 50) {
      const cleanAssistantContent = sanitizeContent(assistantMessage.content);
      await tx.shortTermMemory.create({
        data: {
          userId,
          conversationId,
          content: cleanAssistantContent.slice(0, 200),
          contentType: "assistant_response",
          topicTags: JSON.stringify(topicTags),
          freshnessScore: 0.8,
          accessCount: 0,
          lastAccessedAt: new Date(),
          archived: false,
        },
      });
    }

    const currentConversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });
    const maybeTitle =
      currentConversation?.title && currentConversation.title !== "新对话"
        ? currentConversation.title
        : generateConversationTitle(fallbackTitleSource);

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        title: maybeTitle,
        updatedAt: new Date(),
      },
    });

    console.log(
      `[Agent API] conversation_updated id=${conversationId} title="${maybeTitle}" turn=${turnId}`
    );
  });
}

/**
 * 从用户消息中提取话题标签（简化版）
 * 后续可以用 LLM 提取更精确的话题
 */
function extractTopicTags(content: string): string[] {
  const techKeywords = [
    "React", "Vue", "Angular", "JavaScript", "TypeScript", "Node",
    "Agent", "LangChain", "RAG", "LLM", "GPT", "大模型",
    "前端", "后端", "面试", "学习", "计划", "任务",
    "hooks", "组件", "状态", "性能", "优化",
  ];

  const found: string[] = [];
  for (const keyword of techKeywords) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  }

  return found.slice(0, 3); // 最多3个话题标签
}

/**
 * 清理内容中的特殊字符，避免 Prisma 解析错误
 * 问题：消息中可能包含 \x 等十六进制转义字符
 */
function sanitizeContent(content: string): string {
  // 移除或替换可能导致问题的特殊字符
  let sanitized = content;

  // 移除十六进制转义字符模式（如 \x1b, \x00 等）
  sanitized = sanitized.replace(/\\x[0-9a-fA-F]{0,2}/g, "");

  // 移除其他控制字符
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

  // 替换可能的转义序列
  sanitized = sanitized.replace(/\\[a-zA-Z]/g, (match) => {
    // 只保留常见的合法转义
    if (match === "\\n" || match === "\\t" || match === "\\r") {
      return match;
    }
    return "";
  });

  return sanitized;
}

/**
 * 异步同步短期记忆到 ChromaDB（向量检索）
 * 使用 fire-and-forget 模式，不阻塞主流程
 */
async function syncShortMemoryToChroma(
  memoryId: string,
  userId: string,
  content: string,
  topicTags: string
): Promise<void> {
  try {
    // 动态导入避免 Next.js 编译问题
    const { getVectorDBService, getEmbeddingService } = await import("@tech-mate/database");

    const vectorService = getVectorDBService();
    const embeddingService = getEmbeddingService();

    // 初始化向量服务
    await vectorService.initialize();

    // 生成 embedding
    console.log(`[Memory] 正在生成向量: ${memoryId}`);
    const vector = await embeddingService.generateEmbedding(content);

    // 存入 ChromaDB
    const vectorId = `sm_${memoryId}`;
    await vectorService.addEmbedding(
      "short_term_memory",
      vectorId,
      vector,
      {
        user_id: userId,
        memory_id: memoryId,
        content,
        content_type: "user_message",
        topics: JSON.parse(topicTags),
        freshness: 1.0,
        created_at: new Date().toISOString(),
      }
    );

    console.log(`[Memory] 短期记忆已同步到ChromaDB: ${vectorId}`);
  } catch (error) {
    console.error(`[Memory] ChromaDB同步失败:`, error);
    // 失败不影响主流程，SQLite 数据已存储
  }
}

/**
 * 创建立即响应的 SSE stream（用于任务确认等非流式场景）
 */
function createImmediateSSE(params: {
  content: string;
  quickReplies: any[];
  conversationId: string;
  turnId: string;
}) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        // 发送文本内容
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: params.content })}\n\n`));
        // 发送完成事件
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          quickReplies: params.quickReplies,
          conversationId: params.conversationId,
          turnId: params.turnId,
        })}\n\n`));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  // ========== OpenTelemetry Trace 创建 ==========
  const trace: TraceContext = startTrace();

  try {
    const body = await request.json();

    // 兼容多种请求格式：
    // 1. 旧格式：{ message, userId, conversationId }
    // 2. AI SDK text 格式：{ text, userId, conversationId }
    // 3. AI SDK messages 格式：{ messages, userId, conversationId, trigger }
    let message: string | undefined;
    const userId = body.userId;
    const conversationId = body.conversationId || body.id;

    // 从 messages 数组提取最新用户消息
    if (body.messages && Array.isArray(body.messages)) {
      const lastMessage = body.messages[body.messages.length - 1];
      if (lastMessage?.role === "user") {
        // 处理两种格式：{ content: "..." } 或 { parts: [{ type: "text", text: "..." }] }
        message = lastMessage.content ||
          (lastMessage.parts?.find((p: any) => p.type === "text")?.text);
      }
    } else {
      // 兼容旧格式
      message = body.message || body.text;
    }

    if (!message) {
      return jsonError("INVALID_ARGUMENT", "Invalid message format", 400);
    }

    // 更新 Trace 用户信息
    trace.userId = userId?.trim();
    trace.conversationId = conversationId?.trim();

    const payloadCheck = validateChatPayload(message, userId, conversationId);
    if (!payloadCheck.ok) {
      return jsonError(payloadCheck.code!, payloadCheck.error!, 400);
    }

    if (!agentGraph) {
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 503 }
      );
    }

    const effectiveUserId = userId.trim();
    const effectiveConversationId = conversationId.trim();
    const turnId = generateTurnId();

    // ========== Span: 数据库初始化 ==========
    const dbSpan = trace.startSpan("db_init");
    await getDatabase();
    const prisma = getPrismaClient();
    const agentStateRepo = getAgentStateRepository();
    trace.endSpan(dbSpan, "success");

    // ========== Span: 会话查询 ==========
    const convSpan = trace.startSpan("conversation_query");
    const conversation = await prisma.conversation.findUnique({
      where: { id: effectiveConversationId },
      select: { id: true, userId: true },
    });
    trace.endSpan(convSpan, "success");

    if (!conversation) {
      return jsonError("CONVERSATION_NOT_FOUND", "Conversation not found", 404);
    }
    if (conversation.userId !== effectiveUserId) {
      return jsonError("UNAUTHORIZED", "Conversation does not belong to user", 403);
    }

    let userState = getCachedState(effectiveUserId, effectiveConversationId);
    let stateLoadSource: "cache" | "db" | "init" = "cache";
    // 优先从缓存取状态，未命中再回源 DB，最后才初始化默认状态。
    // 这样可以兼顾：
    // 1. 当前进程内连续多轮对话的性能
    // 2. 刷新页面或服务重启后的状态恢复
    if (!userState) {
      const persisted = await agentStateRepo.findByUserConversation(effectiveUserId, effectiveConversationId);
      if (persisted?.stateData) {
        userState = parseStateData(persisted.stateData);
        if (userState) stateLoadSource = "db";
      }
    }
    if (!userState) {
      userState = createInitialState(effectiveUserId);
      stateLoadSource = "init";
    }
    setCachedState(effectiveUserId, effectiveConversationId, userState);

    const normalizedMessage = message.trim();

    // 任务确认属于"执行动作"而不是"再次让模型生成文案"。
    // 这里直接读取上一轮 state 中沉淀好的 pendingTaskPlan，创建真实任务，
    // 避免前端把结构化计划再传回来，也避免模型二次解释造成计划漂移。
    if (normalizedMessage === "确认计划" && userState.pendingTaskPlan) {
      const turnId = generateTurnId();
      const taskService = getTaskService();
      const createdTask = await taskService.createTask(effectiveUserId, {
        title: userState.pendingTaskPlan.title,
        description: userState.pendingTaskPlan.description,
        module: userState.pendingTaskPlan.module ?? undefined,
        difficulty: userState.pendingTaskPlan.difficulty,
        estimatedMinutes: userState.pendingTaskPlan.estimatedMinutes,
        dueDate: buildTaskDueDate(userState.pendingTaskPlan.periodDays),
        status: "todo",
        progress: 0,
      });

      const userMessage = {
        id: generateId(),
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };
      const assistantContent = [
        `好的，已经根据刚才的计划为你创建真实任务。`,
        `任务标题：${createdTask.title}`,
        userState.pendingTaskPlan.module ? `模块：${userState.pendingTaskPlan.module}` : null,
        userState.pendingTaskPlan.periodDays ? `建议周期：${userState.pendingTaskPlan.periodDays} 天` : null,
        `你现在可以去任务页查看，并在完成后继续沉淀学习记录。`,
      ]
        .filter(Boolean)
        .join("\n");
      const assistantMessage = {
        id: generateId(),
        role: "assistant" as const,
        content: assistantContent,
        timestamp: new Date(),
      };
      const persistedState = {
        ...userState,
        messages: [...(userState.messages || []), userMessage, assistantMessage],
        waitingForUserInput: false,
        quickReplyOptions: createQuickReplies(["继续制定计划"]),
        pendingTaskPlan: undefined,
        stateVersion: Number(userState?.stateVersion ?? 0) + 1,
        schemaVersion: Number(userState?.schemaVersion ?? 1),
      };

      setCachedState(effectiveUserId, effectiveConversationId, persistedState);
      await commitConversationTurn({
        prisma,
        userId: effectiveUserId,
        conversationId: effectiveConversationId,
        turnId,
        userMessage,
        assistantMessage,
        persistedState,
        fallbackTitleSource: createdTask.title,
      });

      console.log(
        `[Agent API] task_plan_confirmed user=${effectiveUserId} conversation=${effectiveConversationId} task=${createdTask.id}`
      );

      return createImmediateSSE({
        content: assistantContent,
        quickReplies: persistedState.quickReplyOptions,
        conversationId: effectiveConversationId,
        turnId,
      });
    }

    if (normalizedMessage === "取消" && userState.pendingTaskPlan) {
      const turnId = generateTurnId();
      const userMessage = {
        id: generateId(),
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };
      const assistantContent = "好的，已经取消这次任务创建。你如果愿意，我们可以重新调整一版更合适的学习计划。";
      const assistantMessage = {
        id: generateId(),
        role: "assistant" as const,
        content: assistantContent,
        timestamp: new Date(),
      };
      const persistedState = {
        ...userState,
        messages: [...(userState.messages || []), userMessage, assistantMessage],
        waitingForUserInput: false,
        quickReplyOptions: createQuickReplies(["继续制定计划"]),
        pendingTaskPlan: undefined,
        stateVersion: Number(userState?.stateVersion ?? 0) + 1,
        schemaVersion: Number(userState?.schemaVersion ?? 1),
      };

      setCachedState(effectiveUserId, effectiveConversationId, persistedState);
      await commitConversationTurn({
        prisma,
        userId: effectiveUserId,
        conversationId: effectiveConversationId,
        turnId,
        userMessage,
        assistantMessage,
        persistedState,
        fallbackTitleSource: message,
      });

      return createImmediateSSE({
        content: assistantContent,
        quickReplies: persistedState.quickReplyOptions,
        conversationId: effectiveConversationId,
        turnId,
      });
    }

    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: message,
      timestamp: new Date(),
    };

    const updatedMessages = [
      ...(userState.messages || []),
      userMessage,
    ];

    const updatedState = {
      ...userState,
      messages: updatedMessages,
      schemaVersion: userState?.schemaVersion ?? 1,
      // stateVersion 在 turn 提交成功后才递增，这样能更清楚地区分"准备态"和"已提交态"。
      stateVersion: Number(userState?.stateVersion ?? 0),
    };

    console.log(
      `[Agent API] Processing message for user ${effectiveUserId}, conversation ${effectiveConversationId}, source=${stateLoadSource}:`,
      message
    );

    // ========== Span: Agent 处理 ==========
    const agentSpan = trace.startSpan("agent_process");

    // ========== 使用传统 SSE 格式（支持思考过程）==========
    // 格式:
    //   thought: data: {"type":"thought","content":"思考片段"}\n\n
    //   content: data: {"type":"chunk","content":"回答片段"}\n\n
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamGenerator = agentGraph.processStateStream(updatedState);
          let fullAssistantContent = "";
          let fullThoughtContent = "";
          let finalState: any = updatedState;

          // 流式发送文本内容（支持 thought 和 content 分离）
          while (true) {
            const result = await streamGenerator.next();
            if (result.done) {
              finalState = result.value;
              break;
            }
            const chunk = result.value;

            // 根据 chunk 类型发送不同的 SSE 事件
            if (chunk.type === "thought") {
              fullThoughtContent += chunk.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "thought", content: chunk.text })}\n\n`));
            } else {
              // content 类型（正式回答）
              fullAssistantContent += chunk.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk.text })}\n\n`));
            }
          }

          // 结束 Agent Span
          trace.endSpan(agentSpan, "success");
          agentSpan.setAttributes({ responseLength: fullAssistantContent.length });

          if (finalState) {
            const assistantMessage = {
              id: generateId(),
              role: "assistant" as const,
              content: fullAssistantContent,
              timestamp: new Date(),
            };
            const persistedState = {
              ...finalState,
              stateVersion: Number(finalState?.stateVersion ?? updatedState.stateVersion ?? 0) + 1,
              schemaVersion: Number(finalState?.schemaVersion ?? 1),
            };
            setCachedState(effectiveUserId, effectiveConversationId, persistedState);

            // ========== Span: 消息存储 ==========
            const storageSpan = trace.startSpan("message_storage");

            await commitConversationTurn({
              prisma,
              userId: effectiveUserId,
              conversationId: effectiveConversationId,
              turnId,
              userMessage,
              assistantMessage,
              persistedState,
              fallbackTitleSource: message,
            });

            trace.endSpan(storageSpan, "success");

            console.log(
              `[Agent API] turn_commit_success user=${effectiveUserId} conversation=${effectiveConversationId} turn=${turnId}`
            );

            // ========== 异步同步短期记忆到 ChromaDB（暂时禁用）==========
            // ChromaDB 同频失败不影响主流程，暂时禁用
            // const shortMemoryId = persistedState._shortMemoryId;
            // if (shortMemoryId && process.env.VECTOR_DB_PATH) {
            //   syncShortMemoryToChroma(
            //     shortMemoryId,
            //     effectiveUserId,
            //     sanitizeContent(userMessage.content).slice(0, 200),
            //     JSON.stringify(extractTopicTags(message))
            //   ).catch(err => console.error("[Memory] ChromaDB同步失败:", err));
            // }

            // 发送完成事件（包含思考过程）
            const quickReplies = persistedState.quickReplyOptions || [];
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "done",
              quickReplies,
              conversationId: effectiveConversationId,
              turnId,
              thoughts: fullThoughtContent || undefined,  // 新增：思考过程
            })}\n\n`));
          }

          controller.close();

          // ========== 结束 Trace ==========
          trace.endTrace();
          endTrace(trace);
        } catch (error) {
          console.error("[Agent API] Stream error:", error);
          trace.endSpan(agentSpan, "error", String(error));
          trace.endTrace();
          endTrace(trace);
          console.error(
            `[Agent API] turn_commit_fail user=${effectiveUserId} conversation=${effectiveConversationId} turn=${turnId}`
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "error",
            code: "INTERNAL_ERROR",
            message: "Failed to process message",
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    // ========== Trace 错误结束 ==========
    trace.endTrace();
    endTrace(trace);

    console.error("[Agent API] Error in POST handler:", error);

    return NextResponse.json(
      {
        error: "Failed to process message",
        content: "抱歉，服务暂时不可用。请稍后再试。",
        quickReplies: [],
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    if (!userId || !conversationId) {
      return jsonError("INVALID_ARGUMENT", "userId and conversationId are required", 400);
    }

    await getDatabase();
    const agentStateRepo = getAgentStateRepository();

    const cacheState = getCachedState(userId, conversationId);
    const persisted = await agentStateRepo.findByUserConversation(userId, conversationId);
    // GET 允许优先读缓存，是为了让前端调试/联调时能看到当前进程中的最新状态；
    // 但 persisted 仍然必须存在，否则说明这条会话还没有完成过一次有效提交。
    const state = cacheState ?? parseStateData(persisted?.stateData);
    const stateLoadSource = cacheState ? "cache" : "db";

    if (!state || !persisted) {
      return jsonError("STATE_NOT_FOUND", "State not found", 404);
    }

    return NextResponse.json({
      userId,
      conversationId,
      stateVersion: Number(state?.stateVersion ?? 0),
      updatedAt: persisted.updatedAt,
      source: stateLoadSource,
      state,
    });
  } catch (error) {
    console.error("[Agent API] Error in GET handler:", error);

    return NextResponse.json(
      { error: "Failed to get user state" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    if (!userId || !conversationId) {
      return jsonError("INVALID_ARGUMENT", "userId and conversationId are required", 400);
    }

    await getDatabase();
    const agentStateRepo = getAgentStateRepository();
    const deletedCount = await agentStateRepo.deleteByUserConversation(userId, conversationId);
    clearCachedState(userId, conversationId);

    if (deletedCount === 0) {
      return jsonError("STATE_NOT_FOUND", "State not found", 404);
    }

    console.log(`[Agent API] Reset state for user=${userId}, conversation=${conversationId}`);
    return NextResponse.json({
      success: true,
      message: "Conversation state reset successfully",
      userId,
      conversationId,
    });
  } catch (error) {
    console.error("[Agent API] Error in DELETE handler:", error);

    return NextResponse.json(
      { error: "Failed to reset user state" },
      { status: 500 }
    );
  }
}
