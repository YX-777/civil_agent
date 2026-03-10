import type { Conversation, Message } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateConversationDto {
  userId: string;
  title: string;
  summary?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export class ConversationRepository extends BaseRepository<Conversation> {
  constructor(prisma: any) {
    super(prisma, 'conversation');
  }

  async findByUserId(userId: string, limit: number = 10): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 1
        }
      }
    });
  }

  async createConversation(userId: string, title: string): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        userId,
        title
      }
    });
  }

  async updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data
    });
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({
      where: { id }
    });
  }

  async getConversationWithMessages(id: string, userId: string): Promise<ConversationWithMessages | null> {
    return this.prisma.conversation.findFirst({
      where: {
        id,
        userId
      },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({
      where: { id }
    });
  }

  async updateConversationSummary(id: string, summary: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { summary }
    });
  }
}