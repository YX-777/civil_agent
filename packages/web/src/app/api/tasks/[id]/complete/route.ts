import { NextRequest, NextResponse } from "next/server";
import { getTaskService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDatabase();

    const { id } = params;
    const body = await request.json();
    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const actualMinutes = typeof body?.actualMinutes === "number" ? body.actualMinutes : 60;
    const actualQuestionCount = typeof body?.actualQuestionCount === "number" ? body.actualQuestionCount : 20;
    const accuracy = typeof body?.accuracy === "number" ? body.accuracy : 0.75;
    const reflection = typeof body?.reflection === "string" ? body.reflection : "";

    if (!id) {
      return NextResponse.json({ error: "task id is required" }, { status: 400 });
    }

    const taskService = getTaskService();
    const result = await taskService.completeTask({
      userId,
      taskId: id,
      actualMinutes,
      actualQuestionCount,
      accuracy,
      reflection,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete task";
    const status = message === "Task not found" ? 404 : message === "Task already completed" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
