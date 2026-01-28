/**
 * 百炼 RAG MCP 服务器入口
 */

import { startMCPServer } from "./server.js";
import { logger } from "@civil-agent/core";

async function main() {
  try {
    await startMCPServer();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to start MCP server:", err);
    process.exit(1);
  }
}

main();
