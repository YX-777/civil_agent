import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    const mockResponse = {
      content: `收到你的消息："${message}"。我是你的 AI 助手，有什么可以帮助你的吗？`,
      quickReplies: [
        {
          id: "1",
          text: "开始今天的学习",
          action: "create_task",
        },
        {
          id: "2",
          text: "查看学习进度",
          action: "query_progress",
        },
      ],
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}