import type { ShortTermMemory } from "@prisma/client";
import { BaseRepository } from "./base.repository";

export class ShortTermMemoryRepository extends BaseRepository<ShortTermMemory> {
  constructor(prisma: any) {
    super(prisma, "shortTermMemory");
  }

  // 查找用户的所有活跃短期记忆（未归档）
  async findActiveByUserId(userId: string, limit: number = 50): Promise<ShortTermMemory[]> {
    return this.prisma.shortTermMemory.findMany({
      where: {
        userId,
        archived: false,
      },
      orderBy: {
        freshnessScore: "desc",
      },
      take: limit,
    });
  }

  // 查找用户需要归档的记忆（新鲜度低于阈值）
  async findExpired(userId: string, threshold: number = 0.1): Promise<ShortTermMemory[]> {
    return this.prisma.shortTermMemory.findMany({
      where: {
        userId,
        archived: false,
        freshnessScore: { lt: threshold },
      },
    });
  }

  // 查找所有需要归档的记忆（全量，用于定时任务）
  async findAllExpired(threshold: number = 0.1): Promise<ShortTermMemory[]> {
    return this.prisma.shortTermMemory.findMany({
      where: {
        archived: false,
        freshnessScore: { lt: threshold },
      },
    });
  }

  // 查找所有活跃记忆（全量，用于定时任务衰减计算）
  async findAllActive(): Promise<ShortTermMemory[]> {
    return this.prisma.shortTermMemory.findMany({
      where: { archived: false },
    });
  }

  // 查找指定对话的短期记忆
  async findByConversation(userId: string, conversationId: string): Promise<ShortTermMemory[]> {
    return this.prisma.shortTermMemory.findMany({
      where: {
        userId,
        conversationId,
        archived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // 按话题标签搜索
  async findByTopicTag(userId: string, topic: string): Promise<ShortTermMemory[]> {
    // SQLite 不支持 JSON 查询，使用字符串匹配
    return this.prisma.shortTermMemory.findMany({
      where: {
        userId,
        archived: false,
        topicTags: { contains: topic },
      },
      orderBy: {
        freshnessScore: "desc",
      },
    });
  }

  // 创建短期记忆
  async createMemory(data: {
    userId: string;
    conversationId: string;
    content: string;
    contentType: string;
    topicTags?: string;
  }): Promise<ShortTermMemory> {
    return this.prisma.shortTermMemory.create({
      data: {
        userId: data.userId,
        conversationId: data.conversationId,
        content: data.content,
        contentType: data.contentType,
        topicTags: data.topicTags,
        freshnessScore: 1.0,
        accessCount: 0,
        lastAccessedAt: new Date(),
        archived: false,
      },
    });
  }

  // 更新新鲜度分数
  async updateFreshness(id: string, freshnessScore: number): Promise<ShortTermMemory> {
    return this.prisma.shortTermMemory.update({
      where: { id },
      data: {
        freshnessScore,
        updatedAt: new Date(),
      },
    });
  }

  // 强化记忆：增加访问次数并更新访问时间
  async reinforce(id: string): Promise<ShortTermMemory> {
    return this.prisma.shortTermMemory.update({
      where: { id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // 标记为已归档
  async markArchived(id: string): Promise<ShortTermMemory> {
    return this.prisma.shortTermMemory.update({
      where: { id },
      data: {
        archived: true,
        updatedAt: new Date(),
      },
    });
  }

  // 批量标记归档
  async markBatchArchived(ids: string[]): Promise<number> {
    const result = await this.prisma.shortTermMemory.updateMany({
      where: { id: { in: ids } },
      data: {
        archived: true,
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  // 获取用户短期记忆统计
  async getStats(userId: string): Promise<{
    total: number;
    active: number;
    archived: number;
    avgFreshness: number;
  }> {
    const total = await this.prisma.shortTermMemory.count({
      where: { userId },
    });
    const active = await this.prisma.shortTermMemory.count({
      where: { userId, archived: false },
    });
    const archived = await this.prisma.shortTermMemory.count({
      where: { userId, archived: true },
    });

    // 计算平均新鲜度
    const activeMemories = await this.prisma.shortTermMemory.findMany({
      where: { userId, archived: false },
      select: { freshnessScore: true },
    });
    const avgFreshness = activeMemories.length > 0
      ? activeMemories.reduce((sum: number, m: any) => sum + m.freshnessScore, 0) / activeMemories.length
      : 0;

    return { total, active, archived, avgFreshness };
  }
}