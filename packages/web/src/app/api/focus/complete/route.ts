import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: "Focus session completed",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to complete focus session" },
      { status: 500 }
    );
  }
}