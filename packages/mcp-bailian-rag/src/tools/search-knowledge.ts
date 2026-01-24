/**
 * MCP 工具：搜索知识库
 */

import type { MCPToolDefinition, MCPToolResponse } from "@civil-agent/core";
import { UserHistoryRetriever } from "../retrievers/user-history-retriever";
import { ExamExperienceRetriever } from "../retrievers/exam-experience-retriever";

/**
 * 搜索知识库工具
 */
export class SearchKnowledgeTool {
  private userHistoryRetriever: UserHistoryRetriever;
  private examExperienceRetriever: ExamExperienceRetriever;

  constructor() {
    this.userHistoryRetriever = new UserHistoryRetriever();
    this.examExperienceRetriever = new ExamExperienceRetriever();
  }

  /**
   * 工具定义
   */
  static getDefinition(): MCPToolDefinition {
    return {
      name: "search_knowledge",
      description: "搜索考公知识库，包括用户学习历史和备考经验",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索查询",
          },
          category: {
            type: "string",
            description: "知识库类别（user_history 或 exam_experience）",
            enum: ["user_history", "exam_experience", "all"],
          },
          topK: {
            type: "number",
            description: "返回结果数量（默认3）",
          },
        },
        required: ["query"],
      },
    };
  }

  /**
   * 执行搜索
   */
  async execute(params: {
    query: string;
    category?: string;
    topK?: number;
  }): Promise<MCPToolResponse> {
    try {
      const { query, category = "all", topK = 3 } = params;

      let results: any[] = [];

      // 根据类别选择检索器
      if (category === "user_history" || category === "all") {
        const historyResults = await this.userHistoryRetriever.retrieve({
          query,
          topK: Math.ceil(topK / 2),
        });
        results = results.concat(
          historyResults.map((r) => ({ ...r, category: "user_history" }))
        );
      }

      if (category === "exam_experience" || category === "all") {
        const experienceResults = await this.examExperienceRetriever.retrieve({
          query,
          topK: Math.ceil(topK / 2),
        });
        results = results.concat(
          experienceResults.map((r) => ({ ...r, category: "exam_experience" }))
        );
      }

      // 按分数排序
      results.sort((a, b) => (b.metadata.score || 0) - (a.metadata.score || 0));

      // 取 topK
      results = results.slice(0, topK);

      return {
        success: true,
        data: {
          results,
          count: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
