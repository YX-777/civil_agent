/**
 * 任务管理器
 */

import { logger } from "@civil-agent/core";
import { FeishuClient, FeishuTask } from "./feishu-client";
import { getFeishuConfig } from "../config/feishu.config";

export interface TaskBreakdownParams {
  module: string;
  type: string;
  quantity: number;
  difficulty: string;
  dueDays: number;
  priority: string;
  autoBreakdown: boolean;
}

export interface Subtask {
  title: string;
  dueDate: string;
  quantity: number;
}

export interface TaskSummary {
  totalTasks: number;
  subtasks: Subtask[];
}

export class TaskManager {
  private client: FeishuClient;

  constructor() {
    this.client = new FeishuClient();
  }

  breakdownTask(params: TaskBreakdownParams): Subtask[] {
    if (!params.autoBreakdown) {
      return [
        {
          title: `${params.module} - ${params.type} ${params.quantity}题`,
          dueDate: this.calculateDueDate(params.dueDays),
          quantity: params.quantity,
        },
      ];
    }

    const subtasks = this.generateSubtasks(params);
    return subtasks;
  }

  calculateDueDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  }

  assignPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      high: "high",
      medium: "normal",
      low: "low",
    };
    return priorityMap[priority.toLowerCase()] || "normal";
  }

  generateSubtasks(params: TaskBreakdownParams): Subtask[] {
    let numSubtasks = 1;
    let dailyQuantity = params.quantity;

    if (params.quantity <= 20) {
      numSubtasks = 1;
    } else if (params.quantity <= 50) {
      numSubtasks = 3;
    } else if (params.quantity <= 100) {
      numSubtasks = 5;
    } else {
      numSubtasks = 10;
    }

    dailyQuantity = Math.floor(params.quantity / numSubtasks);

    const difficultyMultiplier = this.getDifficultyMultiplier(params.difficulty);
    dailyQuantity = Math.floor(dailyQuantity * difficultyMultiplier);

    const dueDateMultiplier = this.getDueDateMultiplier(params.dueDays);
    dailyQuantity = Math.floor(dailyQuantity * dueDateMultiplier);

    const subtasks: Subtask[] = [];
    const baseTitle = `${params.module} - ${params.type}`;

    for (let i = 0; i < numSubtasks; i++) {
      const dayOffset = Math.floor((params.dueDays / numSubtasks) * i);
      const dueDate = this.calculateDueDate(dayOffset);
      const subtaskQuantity =
        i === numSubtasks - 1
          ? params.quantity - dailyQuantity * (numSubtasks - 1)
          : dailyQuantity;

      let level = "";
      if (i === 0) {
        level = "基础题型";
      } else if (i === numSubtasks - 1) {
        level = "综合题型";
      } else {
        level = `进阶题型 ${i}`;
      }

      subtasks.push({
        title: `${baseTitle} - ${level} ${subtaskQuantity}题`,
        dueDate,
        quantity: subtaskQuantity,
      });
    }

    return subtasks;
  }

  private getDifficultyMultiplier(difficulty: string): number {
    const multipliers: Record<string, number> = {
      easy: 1.2,
      medium: 1.0,
      hard: 0.8,
    };
    return multipliers[difficulty.toLowerCase()] || 1.0;
  }

  private getDueDateMultiplier(dueDays: number): number {
    if (dueDays < 3) {
      return 1.3;
    } else if (dueDays > 7) {
      return 0.8;
    }
    return 1.0;
  }

  async createTaskWithBreakdown(params: TaskBreakdownParams): Promise<{
    taskId: string;
    taskUrl: string;
    summary: TaskSummary;
  }> {
    const config = getFeishuConfig();
    const priority = this.assignPriority(params.priority);
    const subtasks = this.breakdownTask(params);

    const mainTask = await this.client.createTask({
      task_list_id: config.defaultTaskListId,
      title: `${params.module} - ${params.type} ${params.quantity}题`,
      summary: `难度: ${params.difficulty}, 优先级: ${params.priority}`,
      priority,
      due_date: this.calculateDueDate(params.dueDays),
    });

    const createdSubtasks: FeishuTask[] = [];

    for (const subtask of subtasks) {
      const createdSubtask = await this.client.createTask({
        task_list_id: config.defaultTaskListId,
        title: subtask.title,
        summary: `子任务 - ${subtask.quantity}题`,
        priority,
        due_date: subtask.dueDate,
        parent_task_id: mainTask.task_id,
      });
      createdSubtasks.push(createdSubtask);
    }

    const taskUrl = `https://${config.appId}.feishu.cn/task/${mainTask.task_id}`;

    logger.info(
      `Created task ${mainTask.task_id} with ${createdSubtasks.length} subtasks`
    );

    return {
      taskId: mainTask.task_id,
      taskUrl,
      summary: {
        totalTasks: createdSubtasks.length + 1,
        subtasks: subtasks,
      },
    };
  }

  async queryTasks(
    dateRange: string,
    status: string,
    module: string
  ): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    tasks: FeishuTask[];
  }> {
    const config = getFeishuConfig();
    const tasks = await this.client.listTasks({
      task_list_id: config.defaultTaskListId,
      page_size: 100,
    });

    let filteredTasks = tasks.tasks;

    if (status !== "all") {
      filteredTasks = filteredTasks.filter((task) => task.status === status);
    }

    if (module !== "all") {
      filteredTasks = filteredTasks.filter((task) =>
        task.title.includes(module)
      );
    }

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    if (dateRange === "today") {
      const today = now.toISOString().split("T")[0];
      filteredTasks = filteredTasks.filter((task) =>
        task.due_date.startsWith(today)
      );
    } else if (dateRange === "week") {
      const weekAgo = new Date(now.getTime() - 7 * oneDay);
      filteredTasks = filteredTasks.filter(
        (task) => new Date(task.due_date) >= weekAgo
      );
    } else if (dateRange === "month") {
      const monthAgo = new Date(now.getTime() - 30 * oneDay);
      filteredTasks = filteredTasks.filter(
        (task) => new Date(task.due_date) >= monthAgo
      );
    }

    const completed = filteredTasks.filter((task) => task.status === "completed")
      .length;
    const inProgress = filteredTasks.filter(
      (task) => task.status === "in_progress"
    ).length;

    return {
      total: filteredTasks.length,
      completed,
      inProgress,
      tasks: filteredTasks,
    };
  }

  async updateTask(
    taskId: string,
    status: string,
    progress: number,
    note: string
  ): Promise<{
    message: string;
    taskId: string;
  }> {
    const task = await this.client.getTask(taskId);
    const updatedTask = await this.client.updateTask({
      task_id: taskId,
      status,
      summary: note,
    });

    logger.info(`Updated task ${taskId} to status ${status}`);

    return {
      message: "任务更新成功",
      taskId,
    };
  }

  async completeTask(
    taskId: string,
    actualHours: number,
    questionsCompleted: number,
    accuracy: number,
    reflection: string
  ): Promise<{
    message: string;
    taskId: string;
    completionRecord: {
      date: string;
      duration: string;
      accuracy: string;
    };
  }> {
    const task = await this.client.completeTask(taskId);
    const updatedTask = await this.client.updateTask({
      task_id: taskId,
      summary: reflection,
    });

    const completionRecord = {
      date: new Date().toISOString().split("T")[0],
      duration: `${actualHours}小时`,
      accuracy: `${Math.round(accuracy * 100)}%`,
    };

    logger.info(`Completed task ${taskId}`);

    return {
      message: "恭喜！任务已完成",
      taskId,
      completionRecord,
    };
  }
}