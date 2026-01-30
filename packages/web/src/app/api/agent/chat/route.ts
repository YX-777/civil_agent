import { NextRequest, NextResponse } from "next/server";
import { createAgentGraph, createInitialState } from "@civil-agent/agent-langgraph";

// 全局存储用户状态（生产环境应该使用 Redis 或数据库）
const userStates = new Map<string, any>();

// 初始化 Agent Graph
let agentGraph: any;

try {
  agentGraph = createAgentGraph();
  console.log("[Agent API] Agent graph initialized successfully");
} catch (error) {
  console.error("[Agent API] Failed to initialize agent graph:", error);
  agentGraph = null;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (!agentGraph) {
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 503 }
      );
    }

    const effectiveUserId = userId || "default-user";

    let userState = userStates.get(effectiveUserId);

    if (!userState) {
      userState = createInitialState(effectiveUserId);
      userStates.set(effectiveUserId, userState);
      console.log(`[Agent API] Created new state for user: ${effectiveUserId}`);
    }

    const updatedMessages = [
      ...(userState.messages || []),
      {
        id: generateId(),
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      },
    ];

    const updatedState = {
      ...userState,
      messages: updatedMessages,
    };

    console.log(`[Agent API] Processing message for user ${effectiveUserId}:`, message);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamGenerator = agentGraph.processStateStream(updatedState);
          let finalState: any = null;
          let iterator = streamGenerator[Symbol.asyncIterator]();

          while (true) {
            const { value, done } = await iterator.next();

            if (done) {
              finalState = value;
              break;
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: value })}\n\n`)
            );
          }

          if (finalState) {
            userStates.set(effectiveUserId, finalState);

            const quickReplies = finalState.quickReplyOptions || [];

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", quickReplies })}\n\n`
              )
            );
          }

          controller.close();
        } catch (error) {
          console.error("[Agent API] Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Failed to process message" })}\n\n`
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

/**
 * GET 请求：获取用户当前状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || "default-user";

    const userState = userStates.get(userId);

    if (!userState) {
      return NextResponse.json({
        error: "User state not found",
        message: "No conversation history found for this user",
        userId,
      });
    }

    return NextResponse.json({
      userId: userState.userId,
      messageCount: userState.messages?.length || 0,
      userIntent: userState.userIntent,
      quickReplyOptions: userState.quickReplyOptions || [],
    });
  } catch (error) {
    console.error("[Agent API] Error in GET handler:", error);

    return NextResponse.json(
      { error: "Failed to get user state" },
      { status: 500 }
    );
  }
}

/**
 * DELETE 请求：重置用户对话状态
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || "default-user";

    const deleted = userStates.delete(userId);

    if (deleted) {
      console.log(`[Agent API] Reset state for user: ${userId}`);
      return NextResponse.json({
        success: true,
        message: "User state reset successfully",
        userId,
      });
    } else {
      return NextResponse.json(
        {
          error: "User state not found",
          message: "No conversation history found for this user",
          userId,
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("[Agent API] Error in DELETE handler:", error);

    return NextResponse.json(
      { error: "Failed to reset user state" },
      { status: 500 }
    );
  }
}