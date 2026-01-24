/**
 * MCP 服务器
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@civil-agent/core";
import { CreateFeishuTaskTool } from "./tools/create-task";
import { QueryFeishuTasksTool } from "./tools/query-tasks";
import { UpdateFeishuTaskTool } from "./tools/update-task";
import { CompleteFeishuTaskTool } from "./tools/complete-task";
import { validateFeishuConfig } from "./config/feishu.config";

const createTaskTool = new CreateFeishuTaskTool();
const queryTasksTool = new QueryFeishuTasksTool();
const updateTaskTool = new UpdateFeishuTaskTool();
const completeTaskTool = new CompleteFeishuTaskTool();

const server = new Server(
  {
    name: "@civil-agent/mcp-feishu-tasks",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_feishu_task",
        description:
          "创建飞书学习任务，支持自动分解子任务。适用于创建学习计划、安排练习任务等场景。",
        inputSchema: {
          type: "object",
          properties: {
            module: {
              type: "string",
              description: "学习模块，如：资料分析、数量关系、判断推理等",
            },
            type: {
              type: "string",
              description: "任务类型，如：练习、复习、模拟等",
            },
            quantity: {
              type: "number",
              description: "题目数量",
            },
            difficulty: {
              type: "string",
              description: "难度级别：easy、medium、hard",
              enum: ["easy", "medium", "hard"],
            },
            dueDays: {
              type: "number",
              description: "截止天数",
            },
            priority: {
              type: "string",
              description: "优先级：high、medium、low",
              enum: ["high", "medium", "low"],
            },
            autoBreakdown: {
              type: "boolean",
              description: "是否自动分解子任务",
            },
          },
          required: ["module", "type", "quantity", "difficulty", "dueDays", "priority", "autoBreakdown"],
        },
      },
      {
        name: "query_feishu_tasks",
        description:
          "查询飞书任务进度。适用于查看学习进度、任务完成情况等场景。",
        inputSchema: {
          type: "object",
          properties: {
            dateRange: {
              type: "string",
              description: "时间范围：today、week、month、all",
              enum: ["today", "week", "month", "all"],
            },
            status: {
              type: "string",
              description: "任务状态：all、in_progress、completed",
              enum: ["all", "in_progress", "completed"],
            },
            module: {
              type: "string",
              description: "学习模块，如：资料分析、数量关系等，all 表示所有模块",
            },
          },
          required: ["dateRange", "status", "module"],
        },
      },
      {
        name: "update_feishu_task",
        description:
          "更新飞书任务的进度和状态。适用于记录学习进度、更新任务状态等场景。",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "任务ID",
            },
            status: {
              type: "string",
              description: "任务状态：in_progress、completed",
              enum: ["in_progress", "completed"],
            },
            progress: {
              type: "number",
              description: "进度百分比（0-100）",
            },
            note: {
              type: "string",
              description: "备注信息",
            },
          },
          required: ["taskId", "status", "progress", "note"],
        },
      },
      {
        name: "complete_feishu_task",
        description:
          "标记任务为已完成，并记录学习数据。适用于完成学习任务、记录学习成果等场景。",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "任务ID",
            },
            actualHours: {
              type: "number",
              description: "实际学习时长（小时）",
            },
            questionsCompleted: {
              type: "number",
              description: "完成的题目数量",
            },
            accuracy: {
              type: "number",
              description: "正确率（0-1之间的小数）",
            },
            reflection: {
              type: "string",
              description: "学习反思和总结",
            },
          },
          required: ["taskId", "actualHours", "questionsCompleted", "accuracy", "reflection"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_feishu_task": {
        const result = await createTaskTool.execute(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "query_feishu_tasks": {
        const result = await queryTasksTool.execute(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "update_feishu_task": {
        const result = await updateTaskTool.execute(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "complete_feishu_task": {
        const result = await completeTaskTool.execute(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error executing tool ${name}`, err);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: err.message,
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const config = {
    appId: process.env.FEISHU_APP_ID || "",
    appSecret: process.env.FEISHU_APP_SECRET || "",
    tenantAccessTokenEndpoint:
      process.env.FEISHU_TENANT_ACCESS_TOKEN_ENDPOINT ||
      "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    apiBaseUrl:
      process.env.FEISHU_API_BASE_URL ||
      "https://open.feishu.cn/open-apis/task/v1",
    defaultTaskListId: process.env.FEISHU_DEFAULT_TASK_LIST_ID || "",
  };

  if (!validateFeishuConfig(config)) {
    logger.error("Invalid Feishu configuration");
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Feishu Tasks MCP server running on stdio");
}

main().catch((error) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error("Fatal error in main()", err);
  process.exit(1);
});