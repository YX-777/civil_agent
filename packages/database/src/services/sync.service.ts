import type { PrismaClient, Message, Task, ModuleProgress } from '@prisma/client';
import { VectorDBService } from './vector-db.service';
import { EmbeddingService } from './embedding.service';
import { MessageRepository } from '../repositories/message.repository';

export class SyncService {
  constructor(
    private prisma: any,
    private messageRepo: MessageRepository,
    private vectorService: VectorDBService,
    private embeddingService: EmbeddingService
  ) {}

  async syncMessageToVector(message: Message): Promise<void> {
    try {
      const vector = await this.embeddingService.generateEmbedding(message.content);

      const vectorId = `msg_${message.id}`;

      await this.vectorService.addEmbedding(
        'user_messages',
        vectorId,
        vector,
        {
          user_id: message.conversationId,
          conversation_id: message.conversationId,
          role: message.role,
          timestamp: message.timestamp.toISOString()
        }
      );

      await this.prisma.message.update({
        where: { id: message.id },
        data: { embeddingId: vectorId }
      });
    } catch (error) {
      console.error(`Failed to sync message ${message.id} to vector:`, error);
      throw error;
    }
  }

  async syncMessagesToVector(messages: Message[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    try {
      const texts = messages.map(m => m.content);
      const vectors = await this.embeddingService.generateBatchEmbeddings(texts);

      const embeddings = messages.map((message, index) => ({
        id: `msg_${message.id}`,
        vector: vectors[index],
        metadata: {
          user_id: message.conversationId,
          conversation_id: message.conversationId,
          role: message.role,
          timestamp: message.timestamp.toISOString()
        }
      }));

      await this.vectorService.addBatchEmbeddings('user_messages', embeddings);

      await Promise.all(
        messages.map((message, index) =>
          this.prisma.message.update({
            where: { id: message.id },
            data: { embeddingId: embeddings[index].id }
          })
        )
      );
    } catch (error) {
      console.error('Failed to sync messages to vector:', error);
      throw error;
    }
  }

  async syncTaskToVector(task: Task): Promise<void> {
    try {
      const taskText = `${task.title} ${task.description || ''}`;
      const vector = await this.embeddingService.generateEmbedding(taskText);

      const vectorId = `task_${task.id}`;

      await this.vectorService.addEmbedding(
        'task_vectors',
        vectorId,
        vector,
        {
          user_id: task.userId,
          title: task.title,
          status: task.status,
          priority: task.priority,
          module: task.module,
          difficulty: task.difficulty
        }
      );
    } catch (error) {
      console.error(`Failed to sync task ${task.id} to vector:`, error);
      throw error;
    }
  }

  async syncUserPreferences(userId: string, preferences: any): Promise<void> {
    try {
      const preferencesText = JSON.stringify(preferences);
      const vector = await this.embeddingService.generateEmbedding(preferencesText);

      const vectorId = `pref_${userId}`;

      await this.vectorService.addEmbedding(
        'user_preferences',
        vectorId,
        vector,
        {
          user_id: userId,
          preferences: preferencesText
        }
      );
    } catch (error) {
      console.error(`Failed to sync user preferences for ${userId} to vector:`, error);
      throw error;
    }
  }

  async syncKnowledgeMastery(userId: string, progress: ModuleProgress): Promise<void> {
    try {
      const masteryText = `${progress.moduleName} Accuracy: ${progress.accuracy}% Progress: ${progress.progressPercentage}%`;
      const vector = await this.embeddingService.generateEmbedding(masteryText);

      const vectorId = `mastery_${userId}_${progress.moduleName}`;

      await this.vectorService.addEmbedding(
        'user_knowledge_mastery',
        vectorId,
        vector,
        {
          user_id: userId,
          module_name: progress.moduleName,
          accuracy: progress.accuracy,
          progress_percentage: progress.progressPercentage,
          weak_points: progress.weakPoints,
          strong_points: progress.strongPoints
        }
      );
    } catch (error) {
      console.error(`Failed to sync knowledge mastery for ${userId} to vector:`, error);
      throw error;
    }
  }

  async syncConversationSummary(conversationId: string, summary: string): Promise<void> {
    try {
      const vector = await this.embeddingService.generateEmbedding(summary);

      const vectorId = `conv_${conversationId}`;

      await this.vectorService.addEmbedding(
        'user_messages',
        vectorId,
        vector,
        {
          conversation_id: conversationId,
          type: 'summary',
          summary: summary
        }
      );

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { vectorCollectionId: vectorId }
      });
    } catch (error) {
      console.error(`Failed to sync conversation summary for ${conversationId} to vector:`, error);
      throw error;
    }
  }

  async searchSimilarMessages(conversationId: string, query: string, topK: number = 5): Promise<any[]> {
    try {
      const queryVector = await this.embeddingService.generateQueryEmbedding(query);

      const results = await this.vectorService.search(
        'user_messages',
        queryVector,
        topK,
        {
          conversation_id: conversationId
        }
      );

      return results;
    } catch (error) {
      console.error(`Failed to search similar messages for ${conversationId}:`, error);
      throw error;
    }
  }

  async searchUserTasks(userId: string, query: string, topK: number = 5): Promise<any[]> {
    try {
      const queryVector = await this.embeddingService.generateQueryEmbedding(query);

      const results = await this.vectorService.search(
        'task_vectors',
        queryVector,
        topK,
        {
          user_id: userId
        }
      );

      return results;
    } catch (error) {
      console.error(`Failed to search tasks for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteMessageVector(messageId: string): Promise<void> {
    try {
      const vectorId = `msg_${messageId}`;
      await this.vectorService.delete('user_messages', vectorId);
    } catch (error) {
      console.error(`Failed to delete vector for message ${messageId}:`, error);
      throw error;
    }
  }

  async deleteTaskVector(taskId: string): Promise<void> {
    try {
      const vectorId = `task_${taskId}`;
      await this.vectorService.delete('task_vectors', vectorId);
    } catch (error) {
      console.error(`Failed to delete vector for task ${taskId}:`, error);
      throw error;
    }
  }

  async deleteUserVectors(userId: string): Promise<void> {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: {
            userId
          }
        },
        select: { id: true }
      });

      const tasks = await this.prisma.task.findMany({
        where: { userId },
        select: { id: true }
      });

      const messageIds = messages.map((m: { id: string }) => `msg_${m.id}`);
      const taskIds = tasks.map((t: { id: string }) => `task_${t.id}`);

      await Promise.all([
        this.vectorService.deleteBatch('user_messages', messageIds),
        this.vectorService.deleteBatch('task_vectors', taskIds),
        this.vectorService.delete('user_preferences', `pref_${userId}`)
      ]);
    } catch (error) {
      console.error(`Failed to delete vectors for user ${userId}:`, error);
      throw error;
    }
  }

  async syncAllUserData(userId: string): Promise<void> {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          conversation: {
            userId
          }
        }
      });

      const tasks = await this.prisma.task.findMany({
        where: { userId }
      });

      const moduleProgress = await this.prisma.moduleProgress.findMany({
        where: { userId }
      });

      await Promise.all([
        this.syncMessagesToVector(messages),
        ...tasks.map((task: Task) => this.syncTaskToVector(task)),
        ...moduleProgress.map((progress: ModuleProgress) => this.syncKnowledgeMastery(userId, progress))
      ]);
    } catch (error) {
      console.error(`Failed to sync all data for user ${userId}:`, error);
      throw error;
    }
  }
}