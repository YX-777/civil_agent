/**
 * 更新任务工具
 */

import { logger } from "@civil-agent/core";
import { TaskManager } from "../client/task-manager";

export interface UpdateTaskArgs {
  taskId: string;
  status: string;
  progress: number;
  note: string;
}

export class UpdateFeishuTaskTool {
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = new TaskManager();
  }

  async execute(args: UpdateTaskArgs): Promise<{
    success: boolean;
    data?: {
      message: string;
      taskId: string;
    };
    error?: string;
  }> {
    try {
      logger.info(`Updating task: ${args.taskId} to status ${args.status}`);

      const result = await this.taskManager.updateTask(
        args.taskId,
        args.status,
        args.progress,
        args.note
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to update task", err);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}