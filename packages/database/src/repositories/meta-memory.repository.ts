import type { MetaMemory } from "@prisma/client";
import { BaseRepository } from "./base.repository";

export class MetaMemoryRepository extends BaseRepository<MetaMemory> {
  constructor(prisma: any) {
    super(prisma, "metaMemory");
  }

  // 查找用户的元记忆（userId 是唯一键）
  async findByUserId(userId: string): Promise<MetaMemory | null> {
    return this.prisma.metaMemory.findUnique({
      where: { userId },
    });
  }

  // 创建或更新元记忆
  async upsertMeta(userId: string, data: {
    skillGraph: string;
    weakAreas: string;
    strongAreas: string;
    learningStyle?: string;
    preferredTime?: string;
    dailyGoal?: number;
    totalHours?: number;
    consecutiveDays?: number;
    averageAccuracy?: number;
    emotionalPattern?: string;
  }): Promise<MetaMemory> {
    return this.prisma.metaMemory.upsert({
      where: { userId },
      create: {
        userId,
        skillGraph: data.skillGraph,
        weakAreas: data.weakAreas,
        strongAreas: data.strongAreas,
        learningStyle: data.learningStyle,
        preferredTime: data.preferredTime,
        dailyGoal: data.dailyGoal,
        totalHours: data.totalHours ?? 0,
        consecutiveDays: data.consecutiveDays ?? 0,
        averageAccuracy: data.averageAccuracy ?? 0,
        emotionalPattern: data.emotionalPattern,
      },
      update: {
        skillGraph: data.skillGraph,
        weakAreas: data.weakAreas,
        strongAreas: data.strongAreas,
        learningStyle: data.learningStyle,
        preferredTime: data.preferredTime,
        dailyGoal: data.dailyGoal,
        totalHours: data.totalHours,
        consecutiveDays: data.consecutiveDays,
        averageAccuracy: data.averageAccuracy,
        emotionalPattern: data.emotionalPattern,
      },
    });
  }

  // 更新学习统计
  async updateStats(userId: string, stats: {
    totalHours?: number;
    consecutiveDays?: number;
    averageAccuracy?: number;
  }): Promise<MetaMemory> {
    return this.prisma.metaMemory.update({
      where: { userId },
      data: {
        totalHours: stats.totalHours,
        consecutiveDays: stats.consecutiveDays,
        averageAccuracy: stats.averageAccuracy,
        updatedAt: new Date(),
      },
    });
  }

  // 更新能力图谱
  async updateSkillGraph(userId: string, data: {
    skillGraph: string;
    weakAreas: string;
    strongAreas: string;
  }): Promise<MetaMemory> {
    return this.prisma.metaMemory.update({
      where: { userId },
      data: {
        skillGraph: data.skillGraph,
        weakAreas: data.weakAreas,
        strongAreas: data.strongAreas,
        updatedAt: new Date(),
      },
    });
  }

  // 获取用户能力摘要（用于 Agent prompt）
  async getSkillSummary(userId: string): Promise<{
    strongAreas: string[];
    weakAreas: string[];
    learningStyle: string | null;
    consecutiveDays: number;
  } | null> {
    const meta = await this.findByUserId(userId);
    if (!meta) return null;

    return {
      strongAreas: JSON.parse(meta.strongAreas || "[]"),
      weakAreas: JSON.parse(meta.weakAreas || "[]"),
      learningStyle: meta.learningStyle,
      consecutiveDays: meta.consecutiveDays,
    };
  }
}