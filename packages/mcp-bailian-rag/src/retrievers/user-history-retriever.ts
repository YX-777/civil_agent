/**
 * 用户学习历史检索器
 */

import axios from "axios";
import { BaseRetriever } from "./base-retriever";
import type { RAGSearchParams, RetrievalResult } from "@civil-agent/core";
import { bailianConfig } from "../config/bailian.config";

export class UserHistoryRetriever extends BaseRetriever {
  private readonly collectionName = "user_learning_history";

  /**
   * 检索用户学习历史
   */
  async retrieve(params: RAGSearchParams): Promise<RetrievalResult[]> {
    const { query, topK = 3 } = params;

    try {
      // 调用百炼知识库搜索 API
      const response = await axios.post(
        `${bailianConfig.apiEndpoint}/knowledge-base/${bailianConfig.knowledgeBaseId}/search`,
        {
          query,
          top_k: topK,
          filters: {
            category: this.collectionName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${bailianConfig.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const results: RetrievalResult[] = response.data.documents.map((doc: any) => ({
        content: doc.content,
        metadata: {
          source: doc.metadata.source,
          category: doc.metadata.category,
          timestamp: doc.metadata.timestamp,
          score: doc.score,
        },
      }));

      // 过滤和去重
      const filtered = this.filterByScore(results, bailianConfig.minScore);
      const deduplicated = this.deduplicate(filtered);

      return deduplicated;
    } catch (error) {
      console.error("User history retrieval failed:", error);
      throw new Error(`Failed to retrieve user history: ${error}`);
    }
  }

  /**
   * 添加用户学习记录
   */
  async addRecord(userId: string, record: any): Promise<void> {
    // 实现添加记录到知识库的逻辑
    // 这里可以调用百炼的知识库上传 API
  }
}
