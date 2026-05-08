import { NextRequest, NextResponse } from "next/server";
import { getTaskService } from "@tech-mate/database";
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
  // 当前 schema 里还没有单独的 source 字段，这里先用描述内容做最小推断：
  // Agent 确认计划创建的任务会带固定前缀，手动创建任务则归为 manual。
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

export async function GET(request: NextRequest) {
  try {
    await getDatabase();

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId")?.trim() || DEFAULT_USER_ID;
    const status = searchParams.get("status")?.trim() || undefined;
    const taskService = getTaskService();
    const tasks = await taskService.listTasks(userId, { status });

    return NextResponse.json({ success: true, tasks: tasks.map(serializeTask) });
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDatabase();

    const body = await request.json();
    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const module = typeof body?.module === "string" ? body.module.trim() : undefined;
    const difficulty = typeof body?.difficulty === "string" ? body.difficulty.trim() : undefined;
    const estimatedMinutes = typeof body?.estimatedMinutes === "number" ? body.estimatedMinutes : 60;
    const dueDate = typeof body?.dueDate === "string" && body.dueDate.trim()
      ? new Date(body.dueDate)
      : new Date();

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const taskService = getTaskService();
    const task = await taskService.createTask(userId, {
      title,
      description,
      module,
      difficulty: difficulty || "medium",
      estimatedMinutes,
      dueDate,
      status: "todo",
      progress: 0,
    });

    return NextResponse.json({ success: true, task: serializeTask(task) });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
