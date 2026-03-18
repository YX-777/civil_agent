/**
 * 小红书内容抓取工具
 * 集成小红书 MCP 客户端
 */

import { logger } from "@civil-agent/core";
import { getXiaohongshuTools as getXiaohongshuMCPTools } from "@civil-agent/mcp-xiaohongshu";

let xiaohongshuToolsCache: any[] | null = null;

export async function getXiaohongshuTools() {
  if (xiaohongshuToolsCache) {
    return xiaohongshuToolsCache;
  }

  const tools = await getXiaohongshuMCPTools();
  xiaohongshuToolsCache = tools;
  
  logger.info("小红书 MCP 工具已加载", {
    toolCount: tools.length,
    toolNames: tools.map((tool: any) => tool.name),
  });
  
  return tools;
}

export function clearXiaohongshuToolsCache() {
  xiaohongshuToolsCache = null;
}
