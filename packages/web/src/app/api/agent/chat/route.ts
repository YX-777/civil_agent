import { NextRequest, NextResponse } from "next/server";
import { createAgentGraph, createInitialState } from "@civil-agent/agent-langgraph";
import { getDatabase } from "@/lib/database";
import { getAgentStateRepository, getPrismaClient, getTaskService } from "@civil-agent/database";
import {
  buildStateKey,
  generateConversationTitle,
  parseStateData,
  validateChatPayload,
} from "@/lib/agent-state.contract";

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
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: params.content })}\n\n`)
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              quickReplies: params.quickReplies,
              conversationId: params.conversationId,
              turnId: params.turnId,
            })}\n\n`
          )
        );
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId, conversationId } = await request.json();
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

    await getDatabase();
    const prisma = getPrismaClient();
    const agentStateRepo = getAgentStateRepository();

    const conversation = await prisma.conversation.findUnique({
      where: { id: effectiveConversationId },
      select: { id: true, userId: true },
    });

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

    // 任务确认属于“执行动作”而不是“再次让模型生成文案”。
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
      // stateVersion 在 turn 提交成功后才递增，这样能更清楚地区分“准备态”和“已提交态”。
      stateVersion: Number(userState?.stateVersion ?? 0),
    };

    console.log(
      `[Agent API] Processing message for user ${effectiveUserId}, conversation ${effectiveConversationId}, source=${stateLoadSource}:`,
      message
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 这里直接消费 LangGraph 的流式输出；在拿到完整 assistant 文本前，
          // 不急着落库，避免把半截回复写进 messages。
          const streamGenerator = agentGraph.processStateStream(updatedState);
          let finalState: any = null;
          let iterator = streamGenerator[Symbol.asyncIterator]();
          let fullAssistantContent = "";

          while (true) {
            const { value, done } = await iterator.next();

            if (done) {
              finalState = value;
              break;
            }

            fullAssistantContent += value;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: value })}\n\n`)
            );
          }

          if (finalState) {
            const assistantMessage = {
              id: generateId(),
              role: "assistant" as const,
              content: fullAssistantContent,
              timestamp: new Date(),
            };
            const persistedState = {
              ...finalState,
              // 只有拿到完整 finalState 并准备提交事务时，才把版本号推进到下一版。
              stateVersion: Number(finalState?.stateVersion ?? updatedState.stateVersion ?? 0) + 1,
              schemaVersion: Number(finalState?.schemaVersion ?? 1),
            };
            setCachedState(effectiveUserId, effectiveConversationId, persistedState);

            // 同一事务里写入消息和状态，避免出现“消息写成功但状态未更新”的分裂数据。
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

            console.log(
              `[Agent API] turn_commit_success user=${effectiveUserId} conversation=${effectiveConversationId} turn=${turnId}`
            );

            const quickReplies = persistedState.quickReplyOptions || [];

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  quickReplies,
                  conversationId: effectiveConversationId,
                  turnId,
                })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          console.error("[Agent API] Stream error:", error);
          console.error(
            `[Agent API] turn_commit_fail user=${effectiveUserId} conversation=${effectiveConversationId} turn=${turnId}`
          );
          // 发生流式异常时不做消息落库，避免数据库里出现“只有半截 assistant 回复”的脏数据。
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                code: "INTERNAL_ERROR",
                message: "Failed to process message",
                conversationId: effectiveConversationId,
                turnId,
              })}\n\n`
            )
          );
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
