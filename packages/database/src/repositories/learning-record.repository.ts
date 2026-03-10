import type { LearningRecord } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateLearningRecordDto {
  userId: string;
  date: Date;
  learningHours?: number;
  completed?: boolean;
  tasksCompleted?: number;
  questionsAnswered?: number;
  accuracy?: number;
  notes?: string;
  mood?: string;
  energyLevel?: number;
}

export class LearningRecordRepository extends BaseRepository<LearningRecord> {
  constructor(prisma: any) {
    super(prisma, 'learningRecord');
  }

  async findByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<LearningRecord[]> {
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    return this.prisma.learningRecord.findMany({
      where,
      orderBy: { date: 'desc' }
    });
  }

  async createRecord(userId: string, data: Omit<CreateLearningRecordDto, 'userId'>): Promise<LearningRecord> {
    return this.prisma.learningRecord.create({
      data: {
        ...data,
        userId
      }
    });
  }

  async updateRecord(id: string, data: Partial<LearningRecord>): Promise<LearningRecord> {
    return this.prisma.learningRecord.update({
      where: { id },
      data
    });
  }

  async getConsecutiveDays(userId: string): Promise<number> {
    const records = await this.prisma.learningRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    if (records.length === 0) return 0;

    let consecutiveDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const record of records) {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === consecutiveDays) {
        consecutiveDays++;
      } else if (diffDays > consecutiveDays) {
        break;
      }
    }

    return consecutiveDays;
  }

  async getTotalHours(userId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const where: any = { userId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const records = await this.prisma.learningRecord.findMany({
      where,
      select: { learningHours: true }
    });

    return records.reduce((sum: number, r: { learningHours: number }) => sum + r.learningHours, 0);
  }

  async getRecordByDate(userId: string, date: Date): Promise<LearningRecord | null> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    return this.prisma.learningRecord.findFirst({
      where: {
        userId,
        date: {
          gte: dateStart,
          lte: dateEnd
        }
      }
    });
  }

  async getRecentRecords(userId: string, limit: number = 30): Promise<LearningRecord[]> {
    return this.prisma.learningRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit
    });
  }

  async getLearningStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalDays: number;
    totalHours: number;
    averageHoursPerDay: number;
    totalTasksCompleted: number;
    totalQuestionsAnswered: number;
    averageAccuracy: number;
  }> {
    const records = await this.findByUserId(userId, startDate, endDate);

    const totalDays = records.length;
    const totalHours = records.reduce((sum: number, r: LearningRecord) => sum + r.learningHours, 0);
    const totalTasksCompleted = records.reduce((sum: number, r: LearningRecord) => sum + r.tasksCompleted, 0);
    const totalQuestionsAnswered = records.reduce((sum: number, r: LearningRecord) => sum + r.questionsAnswered, 0);

    const recordsWithAccuracy = records.filter((r: LearningRecord) => r.accuracy !== null);
    const averageAccuracy = recordsWithAccuracy.length > 0
      ? recordsWithAccuracy.reduce((sum: number, r: LearningRecord) => sum + (r.accuracy || 0), 0) / recordsWithAccuracy.length
      : 0;

    return {
      totalDays,
      totalHours,
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      totalTasksCompleted,
      totalQuestionsAnswered,
      averageAccuracy
    };
  }

  async deleteRecord(id: string): Promise<LearningRecord> {
    return this.prisma.learningRecord.delete({
      where: { id }
    });
  }
}