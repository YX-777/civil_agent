import { NextRequest, NextResponse } from "next/server";
import { Stats } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "month";

  const mockStats: Stats = {
    totalHours: range === "week" ? 25 : 120,
    avgAccuracy: range === "week" ? 0.82 : 0.78,
    consecutiveDays: 7,
    completedTasks: range === "week" ? 15 : 45,
    progressPercentage: 65,
  };

  return NextResponse.json(mockStats);
}