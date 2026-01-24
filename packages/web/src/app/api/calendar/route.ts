import { NextRequest, NextResponse } from "next/server";
import { CalendarDay } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || new Date().getMonth().toString();

  const mockCalendar: CalendarDay[] = [];

  for (let i = 1; i <= 31; i++) {
    const date = new Date(2025, parseInt(month), i);
    const isCompleted = Math.random() > 0.3;

    mockCalendar.push({
      date: date.toISOString().split("T")[0],
      learningHours: isCompleted ? Math.floor(Math.random() * 5) + 1 : 0,
      completed: isCompleted,
    });
  }

  return NextResponse.json({ days: mockCalendar });
}