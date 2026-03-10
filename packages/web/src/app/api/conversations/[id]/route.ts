import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getConversationRepository, ConversationWithMessages } from '@civil-agent/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDatabase();
    const conversationId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const conversationRepo = getConversationRepository();
    const conversation = await conversationRepo.getConversationWithMessages(conversationId, userId) as ConversationWithMessages | null;

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: conversation.messages,
    });
  } catch (error) {
    console.error('[Conversations API] Error in GET [id] handler:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDatabase();
    const conversationId = params.id;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const conversationRepo = getConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await conversationRepo.deleteConversation(conversationId);

    console.log(`[Conversations API] Deleted conversation: ${conversationId}`);
    return NextResponse.json({
      success: true,
      message: '会话删除成功',
    });
  } catch (error) {
    console.error('[Conversations API] Error in DELETE [id] handler:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getDatabase();
    const conversationId = params.id;
    const body = await request.json();
    const { userId, title } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const conversationRepo = getConversationRepository();
    const conversation = await conversationRepo.getConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // 限制标题长度
    const trimmedTitle = title.trim().substring(0, 50);

    const updatedConversation = await conversationRepo.updateConversation(conversationId, {
      title: trimmedTitle
    });

    console.log(`[Conversations API] Updated conversation ${conversationId} title to: ${trimmedTitle}`);
    return NextResponse.json({
      success: true,
      conversation: {
        id: updatedConversation.id,
        title: updatedConversation.title,
        updatedAt: updatedConversation.updatedAt
      }
    });
  } catch (error) {
    console.error('[Conversations API] Error in PATCH [id] handler:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}