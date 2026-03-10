import type { PrismaClient } from '@prisma/client';

export abstract class BaseRepository<T> {
  protected prisma: any;
  protected modelName: string;

  constructor(prisma: any, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  async findById(id: string): Promise<T | null> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.findUnique({
      where: { id }
    });
  }

  async findMany(filter?: any): Promise<T[]> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.findMany({
      where: filter
    });
  }

  async create(data: any): Promise<T> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.create({
      data
    });
  }

  async update(id: string, data: any): Promise<T> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<T> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.delete({
      where: { id }
    });
  }

  async upsert(filter: any, data: any): Promise<T> {
    const model = this.prisma[this.modelName as keyof PrismaClient] as any;
    return model.upsert({
      where: filter,
      create: data,
      update: data
    });
  }
}