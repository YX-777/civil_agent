import { NextRequest, NextResponse } from "next/server";
import { getTaskService } from "@tech-mate/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

interface SerializedTaskLite {
  id: string;
  title: string;
  module: string | null;
  dueDate: string;
  status: string;
}

function lite(task: {
  id: string;
  title: string;
  module: string | null;
  dueDate: Date | null;
  status: string;
}): SerializedTaskLite {
  return {
    id: task.id,
    title: task.title,
    module: task.module,
    dueDate: task.dueDate ? task.dueDate.toISOString() : "",
    status: task.status,
  };
}

/**
 * 今日任务概览：聊天页登录提醒 + Agent systemPrompt 上下文共用此接口。
 * 返回轻量字段（标题/模块/截止），减少传输；详情仍走 /api/tasks。
 *
 * 加 Cache-Control: no-store —— 任务状态实时变化，绝不能复用缓存。
 */
export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const userId = request.nextUrl.searchParams.get("userId")?.trim() || DEFAULT_USER_ID;
    const taskService = getTaskService();
    const summary = await taskService.getTodaySummary(userId);

    return NextResponse.json(
      {
        success: true,
        overdue: summary.overdue.map(lite),
        todayDue: summary.todayDue.map(lite),
        tomorrowDue: summary.tomorrowDue.map(lite),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Failed to fetch today summary:", error);
    return NextResponse.json({ error: "Failed to fetch today summary" }, { status: 500 });
  }
}
