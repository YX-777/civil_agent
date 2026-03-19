import { NextRequest, NextResponse } from "next/server";
import { getAgentStateRepository } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    if (!userId || !conversationId) {
      return jsonError("INVALID_ARGUMENT", "userId and conversationId are required", 400);
    }

    // 状态查询统一从数据库读取，确保和真实持久化状态一致。
    await getDatabase();
    const repo = getAgentStateRepository();
    const record = await repo.findByUserConversation(userId, conversationId);
    if (!record) {
      return jsonError("STATE_NOT_FOUND", "State not found", 404);
    }

    let state: any = null;
    try {
      state = JSON.parse(record.stateData);
    } catch {
      state = null;
    }

    return NextResponse.json({
      userId,
      conversationId,
      stateVersion: Number(state?.stateVersion ?? 0),
      updatedAt: record.updatedAt,
      source: "db",
      state,
    });
  } catch (error) {
    console.error("[Agent State API] Error in GET handler:", error);
    return jsonError("INTERNAL_ERROR", "Failed to get state", 500);
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

    // 删除只作用于单个 `(userId, conversationId)` 状态记录。
    await getDatabase();
    const repo = getAgentStateRepository();
    const deletedCount = await repo.deleteByUserConversation(userId, conversationId);
    if (deletedCount === 0) {
      return jsonError("STATE_NOT_FOUND", "State not found", 404);
    }

    return NextResponse.json({
      success: true,
      userId,
      conversationId,
      message: "Conversation state reset successfully",
    });
  } catch (error) {
    console.error("[Agent State API] Error in DELETE handler:", error);
    return jsonError("INTERNAL_ERROR", "Failed to delete state", 500);
  }
}
