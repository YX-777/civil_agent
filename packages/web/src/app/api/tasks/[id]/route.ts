import { NextRequest, NextResponse } from "next/server";
import { getTaskService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  dueDate: Date | null;
  module: string | null;
  difficulty: string | null;
  actualMinutes: number | null;
  estimatedMinutes: number | null;
  completedAt: Date | null;
  createdAt: Date;
}) {
  const source = task.description?.startsWith("Agent 生成的学习计划") ? "agent" : "manual";
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status as "todo" | "in_progress" | "completed" | "overdue",
    progress: task.progress,
    dueDate: task.dueDate ? task.dueDate.toISOString() : "",
    module: task.module,
    difficulty: task.difficulty,
    actualMinutes: task.actualMinutes ?? 0,
    estimatedMinutes: task.estimatedMinutes ?? 0,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    source,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDatabase();
    const body = await request.json();
    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const description = typeof body?.description === "string" ? body.description.trim() : undefined;
    const module = typeof body?.module === "string" ? body.module.trim() : undefined;
    const difficulty = typeof body?.difficulty === "string" ? body.difficulty.trim() : undefined;
    const estimatedMinutes = typeof body?.estimatedMinutes === "number" ? body.estimatedMinutes : undefined;
    const status = typeof body?.status === "string" ? body.status.trim() : undefined;
    const dueDate = typeof body?.dueDate === "string" && body.dueDate.trim()
      ? new Date(body.dueDate)
      : undefined;

    const taskService = getTaskService();
    const task = await taskService.updateTask({
      userId,
      taskId: params.id,
      title,
      description,
      module,
      difficulty,
      estimatedMinutes,
      dueDate,
      status,
    });

    return NextResponse.json({ success: true, task: serializeTask(task) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    const status = message === "Task not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
