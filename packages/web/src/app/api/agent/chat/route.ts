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

/**
 * 处理用户消息
 */
async function processMessage(
  message: string,
  userId: string = "default-user"
): Promise<{
  content: string;
  quickReplies: any[];
}> {
  try {
    // 检查 Agent Graph 是否已初始化
    if (!agentGraph) {
      return {
        content: "抱歉，AI 服务暂时不可用。请稍后再试。",
        quickReplies: [
          {
            id: "retry",
            text: "重试",
            action: "retry",
          },
        ],
      };
    }

    // 获取或创建用户状态
    let userState = userStates.get(userId);

    if (!userState) {
      userState = createInitialState(userId);
      userStates.set(userId, userState);
      console.log(`[Agent API] Created new state for user: ${userId}`);
    }

    // 添加用户消息到历史
    const updatedMessages = [
      ...(userState.messages || []),
      {
        id: generateId(),
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      },
    ];

    // 更新状态
    const updatedState = {
      ...userState,
      messages: updatedMessages,
    };

    console.log(`[Agent API] Processing message for user ${userId}:`, message);

    // 调用 Agent 处理
    const processedState = await agentGraph.processState(updatedState);

    // 保存更新后的状态
    userStates.set(userId, processedState);

    // 获取最新的助手回复
    const messages = processedState.messages || [];
    console.log(`111111[Agent API] Processed messages:`, messages);
    const lastMessage = messages[messages.length - 1];
    console.log(`222222[Agent API] Last message:`, lastMessage);

    // 如果最后一条是助手消息，返回它；否则返回默认消息
    // LangChain 的 AIMessage 对象有 lc_serializable 属性，可以用来判断
    const isAIMessage = lastMessage && 
      (lastMessage.lc_serializable === true ||
       (lastMessage.content && typeof lastMessage.content === 'string' && !lastMessage.role));
    
    const assistantMessage = isAIMessage
      ? lastMessage.content
      : "我已收到您的消息，正在处理中...";

    console.log(`[Agent API] Agent response:`, assistantMessage);

    return {
      content: assistantMessage,
      quickReplies: processedState.quickReplyOptions || [],
    };
  } catch (error) {
    console.error("[Agent API] Error in processMessage:", error);

    // 返回友好的错误消息
    return {
      content: "抱歉，处理您的消息时出现了错误。请稍后再试。",
      quickReplies: [
        {
          id: "retry",
          text: "重试",
          action: "retry",
        },
      ],
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();

    // 验证请求
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

    // 处理消息
    const response = await processMessage(message, userId);

    return NextResponse.json(response);
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