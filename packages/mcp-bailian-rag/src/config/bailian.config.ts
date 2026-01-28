/**
 * 阿里云百炼配置
 */

import dotenv from "dotenv";

dotenv.config();

export interface BailianConfig {
  apiEndpoint: string;
  apiKey: string;
  knowledgeBaseId: string;
  defaultTopK: number;
  minScore: number;
}

export const bailianConfig: BailianConfig = {
  apiEndpoint: process.env.BAILIAN_API_ENDPOINT || "https://dashscope.aliyuncs.com/api/v1",
  apiKey: process.env.BAILIAN_API_KEY || "",
  knowledgeBaseId: process.env.BAILIAN_KNOWLEDGE_BASE_ID || "",
  defaultTopK: parseInt(process.env.BAILIAN_DEFAULT_TOP_K || "3"),
  minScore: parseFloat(process.env.BAILIAN_MIN_SCORE || "0.6"),
};

/**
 * 验证百炼配置
 */
export function validateBailianConfig(): void {
  if (!bailianConfig.apiKey) {
    throw new Error("BAILIAN_API_KEY is required");
  }
  if (!bailianConfig.knowledgeBaseId) {
    throw new Error("BAILIAN_KNOWLEDGE_BASE_ID is required");
  }
}
