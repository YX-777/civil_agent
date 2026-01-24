/**
 * 查询任务工具
 */

import { logger } from "@civil-agent/core";
import { TaskManager } from "../client/task-manager";

export interface QueryTasksArgs {
  dateRange: string;
  status: string;
  module: string;
}

export class QueryFeishuTasksTool {
  private taskManager: TaskManager;

  constructor() {
    this.taskManager = new TaskManager();
  }

  async execute(args: QueryTasksArgs): Promise<{
    success: boolean;
    data?: {
      total: number;
      completed: number;
      inProgress: number;
      tasks: Array<{
        id: string;
        title: string;
        status: string;
        progress: number;
        dueDate: string;
      }>;
    };
    error?: string;
  }> {
    try {
      logger.info(
        `Querying tasks: dateRange=${args.dateRange}, status=${args.status}, module=${args.module}`
      );

      const result = await this.taskManager.queryTasks(
        args.dateRange,
        args.status,
        args.module
      );

      const tasks = result.tasks.map((task) => ({
        id: task.task_id,
        title: task.title,
        status: task.status,
        progress: task.status === "completed" ? 100 : 0,
        dueDate: task.due_date,
      }));

      return {
        success: true,
        data: {
          total: result.total,
          completed: result.completed,
          inProgress: result.inProgress,
          tasks,
        },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to query tasks", err);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}