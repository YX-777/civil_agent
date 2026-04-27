import { NextRequest, NextResponse } from "next/server";
import { getStatsService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "month") as "week" | "month" | "all";
    const userId = searchParams.get("userId")?.trim() || DEFAULT_USER_ID;

    const statsService = getStatsService();
    const [stats, accuracyTrend, modules, suggestion] = await Promise.all([
      statsService.getStatsSummary(userId, range),
      statsService.getAccuracyTrend(userId, range),
      statsService.getModuleAccuracy(userId),
      statsService.getDashboardSuggestion(userId, range),
    ]);

    return NextResponse.json({
      ...stats,
      accuracyTrend,
      modules,
      suggestion,
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
