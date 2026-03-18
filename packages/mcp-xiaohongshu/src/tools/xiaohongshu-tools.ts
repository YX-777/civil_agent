/**
 * 小红书工具
 */

import { getXiaohongshuMCPClient } from "../client/xiaohongshu-client.js";

let cachedTools: any[] | null = null;

export async function getXiaohongshuTools() {
  if (cachedTools) {
    return cachedTools;
  }

  const client = getXiaohongshuMCPClient();
  const tools = await client.getTools();
  cachedTools = tools;
  return tools;
}

export function clearXiaohongshuToolsCache() {
  cachedTools = null;
}
