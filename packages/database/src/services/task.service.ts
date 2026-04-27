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
