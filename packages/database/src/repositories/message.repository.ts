import type { Message } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateMessageDto {
  conversationId: string;
  role: string;
  content: string;
  timestamp?: Date;
  metadata?: string;
  tokenCount?: number;
  modelVersion?: string;
}

export class MessageRepository extends BaseRepository<Message> {
  constructor(prisma: any) {
    super(prisma, 'message');
  }

  async findByConversationId(conversationId: string, limit: number = 100): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      take: limit
    });
  }

  async createMessage(data: CreateMessageDto): Promise<Message> {
    return this.prisma.message.create({
      data
    });
  }

  async createMessages(messages: CreateMessageDto[]): Promise<Message[]> {
    return this.prisma.message.createMany({
      data: messages
    }).then(() => {
      return this.prisma.message.findMany({
        where: {
          conversationId: {
            in: messages.map(m => m.conversationId)
          }
        }
      });
    });
  }

  async getRecentMessages(userId: string, limit: number = 50): Promise<Message[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: 5
    });

    const conversationIds = conversations.map((c: { id: string }) => c.id);

    return this.prisma.message.findMany({
      where: {
        conversationId: {
          in: conversationIds
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  async getMessageById(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id }
    });
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data
    });
  }

  async deleteMessage(id: string): Promise<Message> {
    return this.prisma.message.delete({
      where: { id }
    });
  }

  async getConversationMessageCount(conversationId: string): Promise<number> {
    return this.prisma.message.count({
      where: { conversationId }
    });
  }
}