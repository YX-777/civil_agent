import type { FocusSession } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateFocusSessionDto {
  userId: string;
  duration: number;
  module: string;
  notes?: string;
  moodBefore?: string;
}

export class FocusSessionRepository extends BaseRepository<FocusSession> {
  constructor(prisma: any) {
    super(prisma, 'focusSession');
  }

  async findByUserId(userId: string, limit: number = 20): Promise<FocusSession[]> {
    return this.prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: limit
    });
  }

  async createSession(userId: string, data: Omit<CreateFocusSessionDto, 'userId'>): Promise<FocusSession> {
    return this.prisma.focusSession.create({
      data: {
        ...data,
        userId,
        startTime: new Date()
      }
    });
  }

  async updateSession(id: string, data: Partial<FocusSession>): Promise<FocusSession> {
    return this.prisma.focusSession.update({
      where: { id },
      data
    });
  }

  async completeSession(id: string, endTime: Date, moodAfter?: string): Promise<FocusSession> {
    return this.prisma.focusSession.update({
      where: { id },
      data: {
        completed: true,
        endTime,
        moodAfter
      }
    });
  }

  async getActiveSession(userId: string): Promise<FocusSession | null> {
    return this.prisma.focusSession.findFirst({
      where: {
        userId,
        completed: false
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async getSessionById(id: string): Promise<FocusSession | null> {
    return this.prisma.focusSession.findUnique({
      where: { id }
    });
  }

  async getSessionsByModule(userId: string, module: string, limit: number = 10): Promise<FocusSession[]> {
    return this.prisma.focusSession.findMany({
      where: {
        userId,
        module
      },
      orderBy: { startTime: 'desc' },
      take: limit
    });
  }

  async getCompletedSessions(userId: string, startDate: Date, endDate: Date): Promise<FocusSession[]> {
    return this.prisma.focusSession.findMany({
      where: {
        userId,
        completed: true,
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { startTime: 'desc' }
    });
  }

  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalDuration: number;
    completedSessions: number;
    averageDuration: number;
  }> {
    const sessions = await this.prisma.focusSession.findMany({
      where: { userId },
      select: {
        duration: true,
        completed: true
      }
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s: { completed: boolean }) => s.completed).length;
    const totalDuration = sessions.reduce((sum: number, s: { duration: number }) => sum + s.duration, 0);
    const averageDuration = completedSessions > 0 ? totalDuration / completedSessions : 0;

    return {
      totalSessions,
      totalDuration,
      completedSessions,
      averageDuration
    };
  }

  async deleteSession(id: string): Promise<FocusSession> {
    return this.prisma.focusSession.delete({
      where: { id }
    });
  }
}