/**
 * 创建任务工具
 */

import { logger } from "@civil-agent/core";
import { TaskManager } from "../client/task-manager";

export interface CreateTaskArgs {
  module: string;
  type: string;
  quantity: number;
  difficulty: string;
  dueDays: number;
  priority: string;
  autoBreakdown: boolean;
}

export class CreateFeishuTaskTool {
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = new TaskManager();
  }

  async execute(args: CreateTaskArgs): Promise<{
    success: boolean;
    data?: {
      taskId: string;
      taskUrl: string;
      summary: {
        totalTasks: number;
        subtasks: Array<{
          title: string;
          dueDate: string;
          quantity: number;
        }>;
      };
    };
    error?: string;
  }> {
    try {
      logger.info(`Creating task: ${args.module} - ${args.type} ${args.quantity}题`);

      const result = await this.taskManager.createTaskWithBreakdown(args);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to create task", err);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}