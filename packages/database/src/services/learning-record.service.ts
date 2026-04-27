import type { LearningRecord } from "@prisma/client";
import { LearningRecordRepository } from "../repositories/learning-record.repository";
import { ModuleProgressRepository } from "../repositories/module-progress.repository";
import { UserRepository } from "../repositories/user.repository";

export interface RecordTaskCompletionInput {
  userId: string;
  taskId: string;
  taskTitle: string;
  module?: string | null;
  actualMinutes?: number;
  actualQuestionCount?: number;
  accuracy?: number | null;
  reflection?: string | null;
}

export interface RecordFocusCompletionInput {
  userId: string;
  sessionId: string;
  module: string;
  actualMinutes: number;
  reflection?: string | null;
}

export class LearningRecordService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly learningRecordRepository: LearningRecordRepository,
    private readonly moduleProgressRepository: ModuleProgressRepository
  ) {}

  /**
   * 将“完成任务”沉淀成一条统一的学习事实。
   * 这里先复用现有 LearningRecord 结构，不额外引入 sourceType 字段，
   * 避免为了 MVP 首版先改动 schema 和迁移链路。
   */
  async recordTaskCompletion(input: RecordTaskCompletionInput): Promise<LearningRecord> {
    const {
      userId,
      taskId,
      taskTitle,
      module,
      actualMinutes = 0,
      actualQuestionCount = 0,
      accuracy,
      reflection,
    } = input;

    await this.userRepository.findOrCreateUser(userId);

    const normalizedAccuracy = typeof accuracy === "number" && Number.isFinite(accuracy)
      ? accuracy
      : null;

    // 现有表里没有 sourceType/sourceId 字段，因此先把来源上下文写进备注，
    // 这样后续统计和排障时仍能追溯这条学习记录是由哪个任务产生的。
    const notes = [
      `[task_completion] taskId=${taskId}`,
      `title=${taskTitle}`,
      module ? `module=${module}` : null,
      reflection?.trim() ? `reflection=${reflection.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const learningRecord = await this.learningRecordRepository.createRecord(userId, {
      date: new Date(),
      learningHours: actualMinutes > 0 ? actualMinutes / 60 : 0,
      completed: true,
      tasksCompleted: 1,
      questionsAnswered: actualQuestionCount,
      accuracy: normalizedAccuracy ?? undefined,
      notes,
    });

    // 模块进度不是任务完成接口的主要职责，但它是后续统计页的重要输入，
    // 因此在这里顺手做最小同步，保证“完成任务”可以反馈到真实学习数据上。
    if (module && actualQuestionCount > 0 && normalizedAccuracy !== null) {
      const correctCount = Math.max(
        0,
        Math.min(actualQuestionCount, Math.round(actualQuestionCount * normalizedAccuracy))
      );
      await this.moduleProgressRepository.updateAccuracy(userId, module, correctCount, actualQuestionCount);
    }

    return learningRecord;
  }

  /**
   * Focus 完成后的学习记录只沉淀时长与来源，不强行伪造题量/正确率。
   * 这样统计页会真实增长学习时长和学习天数，但不会污染正确率口径。
   */
  async recordFocusCompletion(input: RecordFocusCompletionInput): Promise<LearningRecord> {
    const {
      userId,
      sessionId,
      module,
      actualMinutes,
      reflection,
    } = input;

    await this.userRepository.findOrCreateUser(userId);

    const notes = [
      `[focus_completion] sessionId=${sessionId}`,
      `module=${module}`,
      reflection?.trim() ? `reflection=${reflection.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    return this.learningRecordRepository.createRecord(userId, {
      date: new Date(),
      learningHours: actualMinutes > 0 ? actualMinutes / 60 : 0,
      completed: true,
      tasksCompleted: 0,
      questionsAnswered: 0,
      notes,
    });
  }
}
