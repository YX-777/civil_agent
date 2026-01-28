/**
 * HTTP 服务器包装器
 * 将 MCP 工具通过 HTTP API 暴露
 */

import dotenv from "dotenv";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { SearchKnowledgeTool } from "./tools/search-knowledge.js";
import { UploadDocumentTool } from "./tools/upload-document.js";
import { logger } from "@civil-agent/core";
import { bailianConfig, validateBailianConfig } from "./config/bailian.config.js";

dotenv.config();

const PORT = process.env.PORT || 3002;

logger.info("Bailian config loaded", {
  apiEndpoint: bailianConfig.apiEndpoint,
  apiKey: bailianConfig.apiKey ? "***" : "NOT_SET",
  knowledgeBaseId: bailianConfig.knowledgeBaseId || "NOT_SET",
  defaultTopK: bailianConfig.defaultTopK,
  minScore: bailianConfig.minScore,
});

try {
  validateBailianConfig();
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.warn("Bailian config validation failed", err);
}

const searchKnowledgeTool = new SearchKnowledgeTool();
const uploadDocumentTool = new UploadDocumentTool();

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || "/";
  const method = req.method || "GET";

  logger.info(`${method} ${url}`);

  if (url === "/health" && method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "mcp-bailian-rag" }));
    return;
  }

  if (url.startsWith("/api/tools/") && method === "POST") {
    const toolName = url.replace("/api/tools/", "");

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const parameters = JSON.parse(body);
        let result;

        switch (toolName) {
          case "search_knowledge":
            result = await searchKnowledgeTool.execute(parameters);
            break;
          case "upload_document":
            result = await uploadDocumentTool.execute(parameters);
            break;
          default:
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Unknown tool: ${toolName}` }));
            return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Tool execution failed: ${toolName}`, err);

        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: false,
          error: err.message,
        }));
      }
    });

    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

export function startHTTPServer(): void {
  const server = createServer(handleRequest);

  server.listen(PORT, () => {
    logger.info(`HTTP 服务器已启动，监听端口 ${PORT}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startHTTPServer();
}