import type { LearningRecord, Task } from "@prisma/client";
import { LearningRecordService } from "./learning-record.service";
import { TaskRepository, type CreateTaskDto, type TaskFilter } from "../repositories/task.repository";
import { UserRepository } from "../repositories/user.repository";

export interface CompleteTaskInput {
  userId: string;
  taskId: string;
  actualMinutes?: number;
  actualQuestionCount?: number;
  accuracy?: number | null;
  reflection?: string | null;
}

export interface UpdateTaskInput {
  userId: string;
  taskId: string;
  title?: string;
  description?: string | null;
  module?: string | null;
  difficulty?: string | null;
  estimatedMinutes?: number;
  dueDate?: Date | null;
  status?: string;
}

export class TaskService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly taskRepository: TaskRepository,
    private readonly learningRecordService: LearningRecordService
  ) {}

  async listTasks(userId: string, filter?: TaskFilter): Promise<Task[]> {
    await this.userRepository.findOrCreateUser(userId);
    return this.taskRepository.findByUserId(userId, filter);
  }

  /**
   * 今日任务概览：返回逾期 / 今日到期 / 明日到期 三组未完成任务。
   * 用于两个地方：① 聊天页打开时主动提醒  ② Agent systemPrompt 上下文
   *
   * 边界：只算 status !== "completed" 的任务；已完成的不算逾期也不算今日。
   */
  async getTodaySummary(userId: string): Promise<{
    overdue: Task[];
    todayDue: Task[];
    tomorrowDue: Task[];
  }> {
    await this.userRepository.findOrCreateUser(userId);
    const tasks = await this.taskRepository.findByUserId(userId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterStart = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

    const overdue: Task[] = [];
    const todayDue: Task[] = [];
    const tomorrowDue: Task[] = [];

    for (const t of tasks) {
      if (t.status === "completed") continue;
      if (!t.dueDate) continue;
      const due = t.dueDate.getTime();
      if (due < todayStart.getTime()) overdue.push(t);
      else if (due < tomorrowStart.getTime()) todayDue.push(t);
      else if (due < dayAfterStart.getTime()) tomorrowDue.push(t);
    }
    return { overdue, todayDue, tomorrowDue };
  }

  async createTask(userId: string, data: Omit<CreateTaskDto, "userId">): Promise<Task> {
    await this.userRepository.findOrCreateUser(userId);
    return this.taskRepository.createTask(userId, data);
  }

  async updateTask(input: UpdateTaskInput): Promise<Task> {
    const { userId, taskId, ...updateData } = input;
    await this.userRepository.findOrCreateUser(userId);

    const task = await this.taskRepository.getTaskByIdForUser(taskId, userId);
    if (!task) {
      throw new Error("Task not found");
    }

    return this.taskRepository.updateTask(taskId, {
      title: updateData.title ?? task.title,
      description: updateData.description ?? task.description,
      module: updateData.module ?? task.module,
      difficulty: updateData.difficulty ?? task.difficulty,
      estimatedMinutes: typeof updateData.estimatedMinutes === "number" ? updateData.estimatedMinutes : task.estimatedMinutes,
      dueDate: updateData.dueDate ?? task.dueDate,
      status: updateData.status ?? task.status,
    });
  }

  /**
   * 删除任务：先确认归属，再删 SQLite，最后 best-effort 删 ChromaDB 向量。
   * 向量删除失败不阻塞主流程（任务已删，残留向量不会被检索回来因为 taskId 失效）。
   */
  async deleteTask(userId: string, taskId: string): Promise<void> {
    await this.userRepository.findOrCreateUser(userId);

    const task = await this.taskRepository.getTaskByIdForUser(taskId, userId);
    if (!task) {
      throw new Error("Task not found");
    }

    await this.taskRepository.deleteTask(taskId);

    // 异步清向量（不 await，失败也不影响响应）
    void (async () => {
      try {
        const { getSyncService } = await import("../index");
        const syncService = await getSyncService();
        await syncService.deleteTaskVector(taskId);
      } catch (err: any) {
        console.warn(`[TaskService] delete vector failed for task ${taskId}:`, err?.message || err);
      }
    })();
  }

  /**
   * 任务完成的事务边界先收口在服务层。
   * 这样 route 只负责解析请求，后续接飞书同步或学习统计时不用把逻辑再拆回去。
   */
  async completeTask(input: CompleteTaskInput): Promise<{ task: Task; learningRecord: LearningRecord }> {
    const { userId, taskId, actualMinutes, actualQuestionCount, accuracy, reflection } = input;

    await this.userRepository.findOrCreateUser(userId);

    const task = await this.taskRepository.getTaskByIdForUser(taskId, userId);
    if (!task) {
      throw new Error("Task not found");
    }

    // 已完成任务保持幂等，避免前端重复点击时生成多条学习记录。
    if (task.status === "completed") {
      throw new Error("Task already completed");
    }

    const updatedTask = await this.taskRepository.updateTask(taskId, {
      status: "completed",
      actualMinutes: typeof actualMinutes === "number" ? actualMinutes : task.actualMinutes,
    });

    const learningRecord = await this.learningRecordService.recordTaskCompletion({
      userId,
      taskId: task.id,
      taskTitle: task.title,
      module: task.module,
      actualMinutes,
      actualQuestionCount,
      accuracy,
      reflection,
    });

    return {
      task: updatedTask,
      learningRecord,
    };
  }
}
