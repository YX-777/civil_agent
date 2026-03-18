/**
 * 小红书 MCP 客户端
 * 使用 LangChain MCP 适配器 - MultiServerMCPClient
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export interface XiaohongshuMCPClientOptions {
  url?: string;
}

export class XiaohongshuMCPClient {
  private client: MultiServerMCPClient;
  private serverName: string;
  private initialized: boolean = false;

  constructor(options: XiaohongshuMCPClientOptions = {}) {
    const url = options.url || "http://localhost:18060/mcp";
    this.serverName = "xiaohongshu";

    this.client = new MultiServerMCPClient({
      mcpServers: {
        xiaohongshu: {
          url: url
        }
      }
    });
  }

  async getTools() {
    if (!this.initialized) {
      await this.initialize();
    }

    const tools = await this.client.getTools([this.serverName]);
    return tools;
  }

  private async initialize() {
    await this.client.initializeConnections();
    this.initialized = true;
  }

  async close() {
    await this.client.close();
    this.initialized = false;
  }

  async listResources() {
    if (!this.initialized) {
      await this.initialize();
    }
    return await this.client.listResources([this.serverName]);
  }

  async readResource(uri: string) {
    if (!this.initialized) {
      await this.initialize();
    }
    return await this.client.readResource(this.serverName, uri);
  }
}

let xiaohongshuMCPClientInstance: XiaohongshuMCPClient | null = null;

export function getXiaohongshuMCPClient(): XiaohongshuMCPClient {
  if (!xiaohongshuMCPClientInstance) {
    xiaohongshuMCPClientInstance = new XiaohongshuMCPClient();
  }
  return xiaohongshuMCPClientInstance;
}
