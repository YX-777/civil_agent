/**
 * MCP 工具封装
 * 封装 MCP 服务器提供的工具调用
 */

import { logger } from "@civil-agent/core";

export interface MCPToolCallOptions {
  toolName: string;
  parameters: Record<string, any>;
  timeout?: number;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * MCP 工具客户端
 * 用于调用 MCP 服务器提供的工具
 */
export class MCPToolClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = "http://localhost:3002", timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * 调用 MCP 工具
   */
  async callTool(options: MCPToolCallOptions): Promise<MCPToolResult> {
    const { toolName, parameters, timeout = this.timeout } = options;

    logger.info(`Calling MCP tool: ${toolName}`, parameters);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.baseUrl}/api/tools/${toolName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parameters),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`MCP tool call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      logger.info(`MCP tool ${toolName} succeeded`, result as Record<string, any>);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`MCP tool ${toolName} failed`, err);

      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * 搜索知识库
   */
  async searchKnowledge(params: {
    query: string;
    category?: string;
    topK?: number;
  }): Promise<MCPToolResult> {
    return this.callTool({
      toolName: "search_knowledge",
      parameters: params,
    });
  }

  /**
   * 上传文档
   */
  async uploadDocument(params: {
    filePath: string;
    category: string;
    metadata?: Record<string, any>;
  }): Promise<MCPToolResult> {
    return this.callTool({
      toolName: "upload_document",
      parameters: params,
    });
  }
}

/**
 * 单例 MCP 工具客户端
 */
let mcpToolClientInstance: MCPToolClient | null = null;

export function getMCPToolClient(): MCPToolClient {
  if (!mcpToolClientInstance) {
    const baseUrl = process.env.MCP_BAILIAN_RAG_URL || "http://localhost:3002";
    mcpToolClientInstance = new MCPToolClient(baseUrl);
  }
  return mcpToolClientInstance;
}