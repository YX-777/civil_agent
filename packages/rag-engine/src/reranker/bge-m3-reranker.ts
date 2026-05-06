/**
 * BGE-M3 重排器 (远程 API 调用)
 */

import axios from "axios";
import { getRAGConfig } from "../config/rag.config";

export interface RerankResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export class BGEM3Reranker {
  private config = getRAGConfig().reranker;

  async rerank(query: string, candidates: Array<{ id: string; content: string; metadata: Record<string, any> }>): Promise<RerankResult[]> {
    if (!candidates.length) return [];

    // 使用百炼平台的 rerank API
    try {
      const response = await axios.post(
        this.config.endpoint,
        {
          model: "bge-rerank-v2",
          query,
          documents: candidates.map(c => c.content),
          top_n: this.config.topK,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // 解析重排结果
      const rerankScores = response.data?.results || [];

      return candidates
        .map((c, i) => {
          const rerankItem = rerankScores.find((r: any) => r.index === i);
          return {
            id: c.id,
            content: c.content,
            score: rerankItem?.relevance_score || c.metadata?.score || 0.5,
            metadata: c.metadata,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.topK);
    } catch (error) {
      // 重排失败时，返回原始候选，按向量分数排序
      console.warn("Rerank API failed, falling back to vector scores:", error);
      return candidates
        .map(c => ({
          id: c.id,
          content: c.content,
          score: c.metadata?.score || 0.5,
          metadata: c.metadata,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.topK);
    }
  }

  // 模拟重排（当 API 不可用时）
  async mockRerank(query: string, candidates: Array<{ id: string; content: string; metadata: Record<string, any> }>): Promise<RerankResult[]> {
    // 简单的关键词匹配评分
    const queryTerms = query.toLowerCase().split(/\s+/);

    return candidates
      .map(c => {
        const contentLower = c.content.toLowerCase();
        const matchCount = queryTerms.filter(term => contentLower.includes(term)).length;
        const baseScore = c.metadata?.score || 0.5;
        const boost = matchCount / queryTerms.length * 0.3;

        return {
          id: c.id,
          content: c.content,
          score: baseScore + boost,
          metadata: c.metadata,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }
}