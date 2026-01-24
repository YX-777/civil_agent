/**
 * 完成任务工具
 */

import { logger } from "@civil-agent/core";
import { TaskManager } from "../client/task-manager";

export interface CompleteTaskArgs {
  taskId: string;
  actualHours: number;
  questionsCompleted: number;
  accuracy: number;
  reflection: string;
}

export class CompleteFeishuTaskTool {
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = new TaskManager();
  }

  async execute(args: CompleteTaskArgs): Promise<{
    success: boolean;
    data?: {
      message: string;
      taskId: string;
      completionRecord: {
        date: string;
        duration: string;
        accuracy: string;
      };
    };
    error?: string;
  }> {
    try {
      logger.info(`Completing task: ${args.taskId}`);

      const result = await this.taskManager.completeTask(
        args.taskId,
        args.actualHours,
        args.questionsCompleted,
        args.accuracy,
        args.reflection
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to complete task", err);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}