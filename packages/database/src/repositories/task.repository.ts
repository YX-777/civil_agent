import type { Task } from '@prisma/client';
import { BaseRepository } from './base.repository';

export interface CreateTaskDto {
  userId: string;
  title: string;
  description?: string;
  status?: string;
  progress?: number;
  dueDate?: Date;
  priority?: number;
  module?: string;
  difficulty?: string;
  estimatedMinutes?: number;
  tags?: string;
}

export interface TaskFilter {
  status?: string;
  priority?: number;
  module?: string;
  difficulty?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export class TaskRepository extends BaseRepository<Task> {
  constructor(prisma: any) {
    super(prisma, 'task');
  }

  async findByUserId(userId: string, filter?: TaskFilter): Promise<Task[]> {
    const where: any = { userId };

    if (filter) {
      if (filter.status) {
        where.status = filter.status;
      }
      if (filter.priority) {
        where.priority = filter.priority;
      }
      if (filter.module) {
        where.module = filter.module;
      }
      if (filter.difficulty) {
        where.difficulty = filter.difficulty;
      }
      if (filter.dueBefore || filter.dueAfter) {
        where.dueDate = {};
        if (filter.dueBefore) {
          where.dueDate.lte = filter.dueBefore;
        }
        if (filter.dueAfter) {
          where.dueDate.gte = filter.dueAfter;
        }
      }
    }

    return this.prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createTask(userId: string, data: Omit<CreateTaskDto, 'userId'>): Promise<Task> {
    return this.prisma.task.create({
      data: {
        ...data,
        userId
      }
    });
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const updateData: any = { ...data };

    if (data.status === 'completed' && !data.completedAt) {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    return this.prisma.task.update({
      where: { id },
      data: updateData
    });
  }

  async deleteTask(id: string): Promise<Task> {
    return this.prisma.task.delete({
      where: { id }
    });
  }

  async getOverdueTasks(userId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: { not: 'completed' },
        dueDate: { lt: new Date() }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  async getCompletedTasks(userId: string, startDate: Date, endDate: Date): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { completedAt: 'desc' }
    });
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id }
    });
  }

  async getTaskByIdForUser(id: string, userId: string): Promise<Task | null> {
    return this.prisma.task.findFirst({
      where: {
        id,
        userId
      }
    });
  }

  async getTasksByModule(userId: string, module: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        userId,
        module
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTaskStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  }> {
    const [total, completed, pending, overdue] = await Promise.all([
      this.prisma.task.count({ where: { userId } }),
      this.prisma.task.count({ where: { userId, status: 'completed' } }),
      this.prisma.task.count({ where: { userId, status: 'todo' } }),
      this.prisma.task.count({
        where: {
          userId,
          status: { not: 'completed' },
          dueDate: { lt: new Date() }
        }
      })
    ]);

    return { total, completed, pending, overdue };
  }
}
