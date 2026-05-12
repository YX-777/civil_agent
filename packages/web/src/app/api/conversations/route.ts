import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getConversationRepository } from '@tech-mate/database';

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const conversationRepo = getConversationRepository();
    // 默认拉 200 条；前端可显式传 ?limit=N 微调
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam, 10))) : 200;
    const conversations = await conversationRepo.findByUserId(userId, limit);

    return NextResponse.json({ success: true, conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDatabase();
    const body = await request.json();
    const { userId, title } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'userId and title are required' },
        { status: 400 }
      );
    }

    const conversationRepo = getConversationRepository();
    const conversation = await conversationRepo.createConversation(userId, title);

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
