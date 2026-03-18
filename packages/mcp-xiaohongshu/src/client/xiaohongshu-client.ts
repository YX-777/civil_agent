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

  private async getToolByName(name: string) {
    const tools = await this.getTools();
    const tool = tools.find((t: any) => t.name === name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return tool;
  }

  private parseToolResult(result: any): any {
    if (result == null) return result;
    if (typeof result !== "string") return result;

    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }

  async invokeTool(name: string, args: Record<string, any>) {
    const tool = await this.getToolByName(name);
    const result = await tool.invoke(args);
    return this.parseToolResult(result);
  }

  async checkLoginStatus() {
    return this.invokeTool("check_login_status", {});
  }

  async getLoginQrcode() {
    return this.invokeTool("get_login_qrcode", {});
  }

  async listFeeds(page: number = 1) {
    return this.invokeTool("list_feeds", { page });
  }

  async searchFeeds(
    keyword: string,
    options: {
      sort_by?: string;
      note_type?: string;
      publish_time?: string;
      search_scope?: string;
      location?: string;
    } = {}
  ) {
    const filters = Object.fromEntries(
      Object.entries(options).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );

    return this.invokeTool("search_feeds", {
      keyword,
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
    });
  }

  async getFeedDetail(
    feedId: string,
    xsecToken: string,
    options: {
      load_all_comments?: boolean;
      limit?: number;
      click_more_replies?: boolean;
      reply_limit?: number;
      scroll_speed?: "slow" | "normal" | "fast";
    } = {}
  ) {
    return this.invokeTool("get_feed_detail", {
      feed_id: feedId,
      xsec_token: xsecToken,
      ...options,
    });
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
