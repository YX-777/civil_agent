/**
 * 飞书 API 客户端
 */

import axios, { AxiosInstance } from "axios";
import { logger } from "@civil-agent/core";
import { getFeishuConfig } from "../config/feishu.config";

export interface FeishuTask {
  task_id: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  parent_task_id?: string;
  subtasks?: FeishuTask[];
}

export interface CreateTaskParams {
  task_list_id: string;
  title: string;
  summary?: string;
  priority?: string;
  due_date?: string;
  parent_task_id?: string;
}

export interface UpdateTaskParams {
  task_id: string;
  title?: string;
  summary?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  completed_at?: string;
}

export interface ListTasksParams {
  task_list_id: string;
  page_size?: number;
  page_token?: string;
  status?: string;
}

export class FeishuClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    const config = getFeishuConfig();
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const config = getFeishuConfig();

    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        config.tenantAccessTokenEndpoint,
        {
          app_id: config.appId,
          app_secret: config.appSecret,
        }
      );

      this.accessToken = response.data.tenant_access_token;
      this.tokenExpiry = Date.now() + (response.data.expire - 60) * 1000;

      logger.info("Successfully obtained Feishu access token");
      return this.accessToken!;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to get Feishu access token", err);
      throw err;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async createTask(params: CreateTaskParams): Promise<FeishuTask> {
    const headers = await this.getHeaders();

    try {
      const response = await this.client.post("/tasks", params, { headers });
      logger.info(`Created task: ${params.title}`);
      return response.data.task;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to create task: ${params.title}`, err);
      throw err;
    }
  }

  async getTask(taskId: string): Promise<FeishuTask> {
    const headers = await this.getHeaders();

    try {
      const response = await this.client.get(`/tasks/${taskId}`, { headers });
      return response.data.task;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to get task: ${taskId}`, err);
      throw err;
    }
  }

  async updateTask(params: UpdateTaskParams): Promise<FeishuTask> {
    const headers = await this.getHeaders();

    try {
      const response = await this.client.patch(
        `/tasks/${params.task_id}`,
        {
          title: params.title,
          summary: params.summary,
          status: params.status,
          priority: params.priority,
          due_date: params.due_date,
          completed_at: params.completed_at,
        },
        { headers }
      );
      logger.info(`Updated task: ${params.task_id}`);
      return response.data.task;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to update task: ${params.task_id}`, err);
      throw err;
    }
  }

  async listTasks(params: ListTasksParams): Promise<{
    tasks: FeishuTask[];
    page_token: string;
    has_more: boolean;
  }> {
    const headers = await this.getHeaders();

    try {
      const response = await this.client.get("/tasks", {
        headers,
        params: {
          task_list_id: params.task_list_id,
          page_size: params.page_size || 50,
          page_token: params.page_token,
          status: params.status,
        },
      });
      return response.data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to list tasks", err);
      throw err;
    }
  }

  async completeTask(taskId: string): Promise<FeishuTask> {
    return this.updateTask({
      task_id: taskId,
      status: "completed",
      completed_at: new Date().toISOString(),
    });
  }
}