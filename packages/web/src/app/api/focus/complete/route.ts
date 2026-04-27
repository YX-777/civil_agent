import { NextRequest, NextResponse } from "next/server";
import { getFocusService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await getDatabase();

    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const actualMinutes = typeof body?.actualMinutes === "number" ? body.actualMinutes : Number(body?.actualMinutes);
    const reflection = typeof body?.reflection === "string" ? body.reflection : "";

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const focusService = getFocusService();
    const result = await focusService.completeSession({
      userId,
      sessionId,
      actualMinutes: Number.isFinite(actualMinutes) ? actualMinutes : undefined,
      reflection,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete focus session";
    const status =
      message === "Focus session not found" ? 404 :
      message === "Focus session already completed" ? 409 :
      500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
