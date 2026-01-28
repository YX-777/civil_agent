/**
 * 备考经验检索器
 */

import axios from "axios";
import { BaseRetriever } from "./base-retriever";
import type { RAGSearchParams, RetrievalResult } from "@civil-agent/core";
import { bailianConfig } from "../config/bailian.config";

export class ExamExperienceRetriever extends BaseRetriever {
  private readonly collectionName = "exam_experience";

  /**
   * 检索备考经验
   */
  async retrieve(params: RAGSearchParams): Promise<RetrievalResult[]> {
    const { query, topK = 3, filters } = params;

    try {
      const apiFilters: any = {
        category: this.collectionName,
      };

      if (filters?.category) {
        apiFilters.subcategory = filters.category;
      }

      const response = await axios.post(
        `${bailianConfig.apiEndpoint}/knowledge-base/${bailianConfig.knowledgeBaseId}/search`,
        {
          query,
          top_k: topK,
          filters: apiFilters,
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
          tags: doc.metadata.tags,
        },
      }));

      const filtered = this.filterByScore(results, bailianConfig.minScore);
      const deduplicated = this.deduplicate(filtered);

      return deduplicated;
    } catch (error) {
      return [];
    }
  }

  /**
   * 批量上传备考经验文档
   */
  async uploadDocuments(docs: any[]): Promise<void> {
    // 实现批量上传文档到知识库的逻辑
    // 这里可以调用百炼的知识库上传 API
  }
}
