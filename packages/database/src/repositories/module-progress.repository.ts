import type { ModuleProgress } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateModuleProgressDto {
  userId: string;
  moduleName: string;
  totalQuestions?: number;
  correctAnswers?: number;
  accuracy?: number;
  progressPercentage?: number;
  weakPoints?: string;
  strongPoints?: string;
}

export class ModuleProgressRepository extends BaseRepository<ModuleProgress> {
  constructor(prisma: any) {
    super(prisma, 'moduleProgress');
  }

  async findByUserId(userId: string): Promise<ModuleProgress[]> {
    return this.prisma.moduleProgress.findMany({
      where: { userId },
      orderBy: { accuracy: 'desc' }
    });
  }

  async findByModule(userId: string, moduleName: string): Promise<ModuleProgress | null> {
    return this.prisma.moduleProgress.findFirst({
      where: {
        userId,
        moduleName
      }
    });
  }

  async createProgress(userId: string, data: Omit<CreateModuleProgressDto, 'userId'>): Promise<ModuleProgress> {
    return this.prisma.moduleProgress.create({
      data: {
        ...data,
        userId
      }
    });
  }

  async updateProgress(id: string, data: Partial<ModuleProgress>): Promise<ModuleProgress> {
    const updateData: any = { ...data };

    if (data.totalQuestions !== undefined || data.correctAnswers !== undefined) {
      const existing = await this.prisma.moduleProgress.findUnique({
        where: { id },
        select: { totalQuestions: true, correctAnswers: true }
      });

      if (existing) {
        const totalQuestions = data.totalQuestions ?? existing.totalQuestions;
        const correctAnswers = data.correctAnswers ?? existing.correctAnswers;

        if (totalQuestions > 0) {
          updateData.accuracy = (correctAnswers / totalQuestions) * 100;
        }
      }
    }

    return this.prisma.moduleProgress.update({
      where: { id },
      data: updateData
    });
  }

  async updateAccuracy(userId: string, moduleName: string, correct: number, total: number): Promise<ModuleProgress> {
    const existing = await this.findByModule(userId, moduleName);

    if (existing) {
      return this.prisma.moduleProgress.update({
        where: { id: existing.id },
        data: {
          totalQuestions: existing.totalQuestions + total,
          correctAnswers: existing.correctAnswers + correct,
          accuracy: ((existing.correctAnswers + correct) / (existing.totalQuestions + total)) * 100,
          lastPracticedAt: new Date()
        }
      });
    } else {
      return this.prisma.moduleProgress.create({
        data: {
          userId,
          moduleName,
          totalQuestions: total,
          correctAnswers: correct,
          accuracy: total > 0 ? (correct / total) * 100 : 0,
          lastPracticedAt: new Date()
        }
      });
    }
  }

  async getProgressById(id: string): Promise<ModuleProgress | null> {
    return this.prisma.moduleProgress.findUnique({
      where: { id }
    });
  }

  async getWeakModules(userId: string, threshold: number = 60): Promise<ModuleProgress[]> {
    return this.prisma.moduleProgress.findMany({
      where: {
        userId,
        accuracy: {
          lt: threshold
        }
      },
      orderBy: { accuracy: 'asc' }
    });
  }

  async getStrongModules(userId: string, threshold: number = 80): Promise<ModuleProgress[]> {
    return this.prisma.moduleProgress.findMany({
      where: {
        userId,
        accuracy: {
          gte: threshold
        }
      },
      orderBy: { accuracy: 'desc' }
    });
  }

  async getOverallProgress(userId: string): Promise<{
    totalModules: number;
    averageAccuracy: number;
    completedModules: number;
    totalQuestions: number;
    totalCorrect: number;
  }> {
    const modules = await this.findByUserId(userId);

    const totalModules = modules.length;
    const averageAccuracy = totalModules > 0
      ? modules.reduce((sum: number, m: ModuleProgress) => sum + m.accuracy, 0) / totalModules
      : 0;
    const completedModules = modules.filter((m: ModuleProgress) => m.accuracy >= 80).length;
    const totalQuestions = modules.reduce((sum: number, m: ModuleProgress) => sum + m.totalQuestions, 0);
    const totalCorrect = modules.reduce((sum: number, m: ModuleProgress) => sum + m.correctAnswers, 0);

    return {
      totalModules,
      averageAccuracy,
      completedModules,
      totalQuestions,
      totalCorrect
    };
  }

  async deleteProgress(id: string): Promise<ModuleProgress> {
    return this.prisma.moduleProgress.delete({
      where: { id }
    });
  }

  async updateWeakPoints(id: string, weakPoints: string): Promise<ModuleProgress> {
    return this.prisma.moduleProgress.update({
      where: { id },
      data: { weakPoints }
    });
  }

  async updateStrongPoints(id: string, strongPoints: string): Promise<ModuleProgress> {
    return this.prisma.moduleProgress.update({
      where: { id },
      data: { strongPoints }
    });
  }
}