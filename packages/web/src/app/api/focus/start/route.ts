import { NextRequest, NextResponse } from "next/server";
import { getFocusService } from "@civil-agent/database";
import { getDatabase } from "@/lib/database";

const DEFAULT_USER_ID = "default-user";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await getDatabase();

    const userId = typeof body?.userId === "string" && body.userId.trim() ? body.userId.trim() : DEFAULT_USER_ID;
    const duration = typeof body?.duration === "number" ? body.duration : Number(body?.duration);
    const module = typeof body?.module === "string" ? body.module.trim() : "";

    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json({ error: "duration must be a positive number" }, { status: 400 });
    }

    if (!module) {
      return NextResponse.json({ error: "module is required" }, { status: 400 });
    }

    const focusService = getFocusService();
    const session = await focusService.startSession({
      userId,
      duration,
      module,
    });

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start focus session";
    const status = message === "Focus session already active" ? 409 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
