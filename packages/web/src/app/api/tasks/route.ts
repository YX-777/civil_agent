import { NextRequest, NextResponse } from "next/server";
import { Task } from "@/types";

export async function GET(request: NextRequest) {
  const mockTasks: Task[] = [
    {
      id: "1",
      title: "资料分析50题",
      status: "in_progress",
      progress: 60,
      dueDate: "2025-01-30",
    },
    {
      id: "2",
      title: "数量关系30题",
      status: "todo",
      progress: 0,
      dueDate: "2025-01-25",
    },
    {
      id: "3",
      title: "判断推理40题",
      status: "completed",
      progress: 100,
      dueDate: "2025-01-20",
    },
  ];

  return NextResponse.json({ tasks: mockTasks });
}