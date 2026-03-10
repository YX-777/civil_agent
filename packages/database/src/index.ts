import { PrismaClient } from '@prisma/client';
import { UserRepository } from './repositories/user.repository';
import { ConversationRepository, ConversationWithMessages } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { TaskRepository } from './repositories/task.repository';
import { FocusSessionRepository } from './repositories/focus-session.repository';
import { LearningRecordRepository } from './repositories/learning-record.repository';
import { ModuleProgressRepository } from './repositories/module-progress.repository';
import { EmbeddingService } from './services/embedding.service';

let prisma: any = null;
let embeddingService: EmbeddingService | null = null;

export function getPrismaClient(): any {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}

export function getUserRepository(): UserRepository {
  return new UserRepository(getPrismaClient());
}

export function getConversationRepository(): ConversationRepository {
  return new ConversationRepository(getPrismaClient());
}

export function getMessageRepository(): MessageRepository {
  return new MessageRepository(getPrismaClient());
}

export function getTaskRepository(): TaskRepository {
  return new TaskRepository(getPrismaClient());
}

export function getFocusSessionRepository(): FocusSessionRepository {
  return new FocusSessionRepository(getPrismaClient());
}

export function getLearningRecordRepository(): LearningRecordRepository {
  return new LearningRecordRepository(getPrismaClient());
}

export function getModuleProgressRepository(): ModuleProgressRepository {
  return new ModuleProgressRepository(getPrismaClient());
}

export async function initializeDatabase(options?: { skipVectorDB?: boolean }): Promise<void> {
  if (!options?.skipVectorDB) {
    try {
      const { initializeVectorDB } = await import('./services/vector-db.loader');
      await initializeVectorDB();
    } catch (error) {
      console.warn('Failed to initialize VectorDB:', error);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
  embeddingService = null;
}

export async function getSyncService(): Promise<any> {
  const { getSyncService: getSyncServiceLoader } = await import('./services/sync.loader');
  return getSyncServiceLoader();
}

export {
  UserRepository,
  ConversationRepository,
  ConversationWithMessages,
  MessageRepository,
  TaskRepository,
  FocusSessionRepository,
  LearningRecordRepository,
  ModuleProgressRepository,
  EmbeddingService
};

export * from '@prisma/client';