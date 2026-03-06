import { NextRequest, NextResponse } from "next/server";
import { conversations } from "@/lib/conversation-store";

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateTitle(firstMessage: string): string {
  if (!firstMessage || firstMessage.trim().length === 0) {
    return "新对话";
  }
  
  const maxLength = 20;
  let title = firstMessage.trim();
  
  if (title.length > maxLength) {
    title = title.substring(0, maxLength) + "...";
  }
  
  return title;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, initialMessages } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Invalid userId" },
        { status: 400 }
      );
    }

    const conversationId = generateId();
    const now = new Date();

    const newConversation = {
      id: conversationId,
      title: title || "新对话",
      messages: initialMessages || [],
      createdAt: now,
      updatedAt: now,
      userId,
    };

    conversations.set(conversationId, newConversation);

    console.log(`[Conversations API] Created conversation: ${conversationId} for user: ${userId}`);

    return NextResponse.json({
      id: newConversation.id,
      title: newConversation.title,
      createdAt: newConversation.createdAt,
      updatedAt: newConversation.updatedAt,
    });
  } catch (error) {
    console.error("[Conversations API] Error in POST handler:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);

    const responseConversations = userConversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      messages: conv.messages,
    }));

    return NextResponse.json({
      conversations: responseConversations,
    });
  } catch (error) {
    console.error("[Conversations API] Error in GET handler:", error);
    return NextResponse.json(
      { error: "Failed to get conversations" },
      { status: 500 }
    );
  }
}
