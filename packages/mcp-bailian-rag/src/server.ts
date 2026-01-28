/**
 * MCP 服务器配置
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SearchKnowledgeTool } from "./tools/search-knowledge.js";
import { UploadDocumentTool } from "./tools/upload-document.js";
import { logger } from "@civil-agent/core";
import { validateBailianConfig } from "./config/bailian.config.js";

/**
 * 创建 MCP 服务器
 */
export function createMCPServer(): Server {
  // 验证配置
  validateBailianConfig();

  // 创建服务器实例
  const server = new Server(
    {
      name: "@civil-agent/mcp-bailian-rag",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        SearchKnowledgeTool.getDefinition(),
        UploadDocumentTool.getDefinition(),
      ],
    };
  });

  // 创建工具实例
  const searchKnowledgeTool = new SearchKnowledgeTool();
  const uploadDocumentTool = new UploadDocumentTool();

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`, args);

    try {
      let result;

      switch (name) {
        case "search_knowledge":
          result = await searchKnowledgeTool.execute(args as any);
          break;
        case "upload_document":
          result = await uploadDocumentTool.execute(args as any);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Tool execution failed: ${name}`, err);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: err.message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * 启动 MCP 服务器
 */
export async function startMCPServer(): Promise<void> {
  const server = createMCPServer();

  // 使用 stdio 传输（适合 Claude Desktop）
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("百炼 RAG MCP 服务器已启动");
}
