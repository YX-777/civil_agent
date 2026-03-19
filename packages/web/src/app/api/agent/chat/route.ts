import { NextRequest, NextResponse } from "next/server";
import { createAgentGraph, createInitialState } from "@civil-agent/agent-langgraph";
import { getDatabase } from "@/lib/database";
import { getAgentStateRepository, getPrismaClient } from "@civil-agent/database";
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
              stateVersion: Number(finalState?.stateVersion ?? updatedState.stateVersion ?? 0) + 1,
              schemaVersion: Number(finalState?.schemaVersion ?? 1),
            };
            setCachedState(effectiveUserId, effectiveConversationId, persistedState);

            // 同一事务里写入消息和状态，避免出现“消息写成功但状态未更新”的分裂数据。
            await prisma.$transaction(async (tx) => {
              await tx.message.create({
                data: {
                  conversationId: effectiveConversationId,
                  role: userMessage.role,
                  content: userMessage.content,
                  timestamp: userMessage.timestamp,
                },
              });
              await tx.message.create({
                data: {
                  conversationId: effectiveConversationId,
                  role: assistantMessage.role,
                  content: assistantMessage.content,
                  timestamp: assistantMessage.timestamp,
                },
              });
              await tx.agentState.upsert({
                where: {
                  userId_conversationId: {
                    userId: effectiveUserId,
                    conversationId: effectiveConversationId,
                  },
                },
                create: {
                  userId: effectiveUserId,
                  conversationId: effectiveConversationId,
                  stateData: JSON.stringify(persistedState),
                },
                update: {
                  stateData: JSON.stringify(persistedState),
                },
              });

              const currentConversation = await tx.conversation.findUnique({
                where: { id: effectiveConversationId },
                select: { title: true },
              });
              const maybeTitle =
                currentConversation?.title && currentConversation.title !== "新对话"
                  ? currentConversation.title
                  : generateConversationTitle(message);

              await tx.conversation.update({
                where: { id: effectiveConversationId },
                data: {
                  title: maybeTitle,
                  updatedAt: new Date(),
                },
              });

              // 记录标题更新时间，便于和 SSE done 的前后顺序做定位。
              console.log(
                `[Agent API] conversation_updated id=${effectiveConversationId} title="${maybeTitle}" turn=${turnId}`
              );
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
