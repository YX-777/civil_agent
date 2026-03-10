import type { User, UserProfile } from '@prisma/client';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository<User> {
  constructor(prisma: any) {
    super(prisma, 'user');
  }

  async findByUserId(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    });
  }

  async createUser(userId: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        id: userId,
        profile: {
          create: {}
        }
      },
      include: {
        profile: true
      }
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId }
    });
  }

  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return this.prisma.userProfile.update({
      where: { userId },
      data
    });
  }

  async updateStudyDays(userId: string, days: number): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        totalStudyDays: days
      }
    });
  }

  async findOrCreateUser(userId: string): Promise<User> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }
    return this.createUser(userId);
  }
}