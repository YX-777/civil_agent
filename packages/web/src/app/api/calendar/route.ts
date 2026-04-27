import { NextRequest, NextResponse } from "next/server";
import { getStatsService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const userId = searchParams.get("userId")?.trim() || DEFAULT_USER_ID;
    const month = Number(searchParams.get("month") ?? now.getMonth());
    const year = Number(searchParams.get("year") ?? now.getFullYear());

    const statsService = getStatsService();
    const days = await statsService.getCalendarDays(userId, year, month);

    return NextResponse.json({ days });
  } catch (error) {
    console.error("Failed to fetch calendar:", error);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}
