/**
 * MCP 工具：上传文档到知识库
 */

import type { MCPToolDefinition, MCPToolResponse } from "@civil-agent/core";
import axios from "axios";
import { bailianConfig } from "../config/bailian.config";

/**
 * 上传文档工具
 */
export class UploadDocumentTool {
  /**
   * 工具定义
   */
  static getDefinition(): MCPToolDefinition {
    return {
      name: "upload_document",
      description: "上传文档到百炼知识库",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "文档文件路径",
          },
          category: {
            type: "string",
            description: "文档类别",
            enum: ["user_history", "exam_experience"],
          },
          metadata: {
            type: "object",
            description: "附加元数据",
          },
        },
        required: ["filePath", "category"],
      },
    };
  }

  /**
   * 执行上传
   */
  async execute(params: {
    filePath: string;
    category: string;
    metadata?: Record<string, any>;
  }): Promise<MCPToolResponse> {
    try {
      const { filePath, category, metadata = {} } = params;

      // 读取文件内容
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const fileContent = await fs.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath);

      // 构建文档元数据
      const documentMetadata = {
        ...metadata,
        category,
        source: fileName,
        timestamp: new Date().toISOString(),
      };

      // 调用百炼 API 上传文档
      const response = await axios.post(
        `${bailianConfig.apiEndpoint}/knowledge-base/${bailianConfig.knowledgeBaseId}/documents`,
        {
          documents: [
            {
              content: fileContent,
              metadata: documentMetadata,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${bailianConfig.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const documentId = response.data.document_ids?.[0] || `doc-${Date.now()}`;

      return {
        success: true,
        data: {
          message: "文档上传成功",
          documentId,
          fileName,
          category,
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
