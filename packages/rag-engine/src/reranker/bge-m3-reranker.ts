/**
 * 阿里云百炼 Rerank API 重排器
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

  async rerank(
    query: string,
    candidates: Array<{ id: string; content: string; metadata: Record<string, any> }>,
    topK?: number
  ): Promise<RerankResult[]> {
    if (!candidates.length) return [];

    const effectiveTopK = topK ?? this.config.topK;

    // 过滤空文档（阿里云 Rerank API 不接受空字符串）
    const validCandidates = candidates.filter(c => c.content && c.content.trim().length > 0);
    if (!validCandidates.length) {
      console.warn("[Reranker] 无有效文档，跳过重排");
      return candidates.slice(0, effectiveTopK).map(c => ({
        id: c.id,
        content: c.content,
        score: c.metadata?.score || 0.5,
        metadata: c.metadata,
      }));
    }

    // 使用阿里云百炼的 rerank API
    // 参考: https://help.aliyun.com/document_detail/2782579.html
    try {
      console.log("[Reranker] 正在调用百炼 Rerank API...");
      console.log("[Reranker] 文档数:", validCandidates.length);

      const response = await axios.post(
        this.config.endpoint,
        {
          model: "gte-rerank",  // 阿里云支持的模型
          input: {
            query,
            documents: validCandidates.map(c => c.content),
          },
          parameters: {
            top_n: effectiveTopK,
            return_documents: false,
          },
        },
        {
          headers: {
            "Authorization": `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      // 解析重排结果 - 百炼返回格式: { output: { results: [{ index, relevance_score }] } }
      const rerankResults = response.data?.output?.results || response.data?.results || [];
      console.log("[Reranker] 重排成功，返回结果数:", rerankResults.length);

      return validCandidates
        .map((c, i) => {
          const rerankItem = rerankResults.find((r: any) => r.index === i);
          return {
            id: c.id,
            content: c.content,
            score: rerankItem?.relevance_score || c.metadata?.score || 0.5,
            metadata: c.metadata,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, effectiveTopK);
    } catch (error: unknown) {
      // 重排失败时，降级使用向量分数
      if (axios.isAxiosError(error)) {
        console.warn("[Reranker] API 调用失败:", error.response?.data?.message || error.message);
      } else {
        console.warn("[Reranker] 未知错误:", error);
      }

      // 降级：按向量分数排序
      console.log("[Reranker] 降级使用向量分数排序");
      return validCandidates
        .map(c => ({
          id: c.id,
          content: c.content,
          score: c.metadata?.score || 0.5,
          metadata: c.metadata,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, effectiveTopK);
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