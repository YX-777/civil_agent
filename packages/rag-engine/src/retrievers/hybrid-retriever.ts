/**
 * 混合检索器 - RRF 融合 + 重排 + 三级策略
 */

import { VectorRetriever } from "./vector-retriever";
import { BM25Retriever } from "./bm25-retriever";
import { BGEM3Reranker } from "../reranker/bge-m3-reranker";
import { ThreeTierStrategy, TieredResponse } from "../strategies/three-tier-strategy";
import { getRAGConfig } from "../config/rag.config";

export interface HybridSearchResult {
  tier: "precise" | "candidates" | "expand" | "fallback";
  answer?: string;
  candidates?: Array<{ content: string; score: number; source: string }>;
  allResults: Array<{ id: string; content: string; score: number; metadata: Record<string, any> }>;
  message: string;
  promptForLLM: string;
}

export class HybridRetriever {
  private vectorRetriever = new VectorRetriever();
  private bm25Retriever = new BM25Retriever();
  private reranker = new BGEM3Reranker();
  private threeTierStrategy = new ThreeTierStrategy();
  private config = getRAGConfig();

  // Reciprocal Rank Fusion (RRF) 融合算法
  private rrfFusion(
    vectorResults: Array<{ id: string; content: string; score: number; metadata: Record<string, any> }>,
    bm25Results: Array<{ id: string; content: string; score: number; metadata: Record<string, any> }>,
    k: number = 60
  ): Array<{ id: string; content: string; score: number; metadata: Record<string, any> }> {
    const scores = new Map<string, { content: string; metadata: Record<string, any>; rrfScore: number }>();

    // 向量检索排名贡献
    vectorResults.forEach((r, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = scores.get(r.id);
      if (existing) {
        existing.rrfScore += rrfScore;
      } else {
        scores.set(r.id, { content: r.content, metadata: r.metadata, rrfScore });
      }
    });

    // BM25 检索排名贡献
    bm25Results.forEach((r, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = scores.get(r.id);
      if (existing) {
        existing.rrfScore += rrfScore;
      } else {
        scores.set(r.id, { content: r.content, metadata: r.metadata, rrfScore });
      }
    });

    // 按融合分数排序
    const fused = Array.from(scores.entries())
      .map(([id, data]) => ({
        id,
        content: data.content,
        score: data.rrfScore,
        metadata: data.metadata,
      }))
      .sort((a, b) => b.score - a.score);

    return fused;
  }

  async retrieve(query: string): Promise<HybridSearchResult> {
    // Step 1: 并行执行向量 + BM25 检索
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorRetriever.search(query, { topK: this.config.vectorRetriever.topK }),
      this.bm25Retriever.search(query, { topK: this.config.bm25Retriever.topK }),
    ]);

    // Step 2: RRF 融合
    const fusedResults = this.rrfFusion(vectorResults, bm25Results);

    // Step 3: BGE-M3 重排
    const rerankedResults = await this.reranker.rerank(query, fusedResults);

    // Step 4: 三级策略分类
    const tieredResponse = this.threeTierStrategy.classify(rerankedResults, query);

    // Step 5: 生成 LLM prompt
    const promptForLLM = this.threeTierStrategy.buildPromptForLLM(tieredResponse, query);

    return {
      tier: tieredResponse.tier,
      answer: tieredResponse.answer,
      candidates: tieredResponse.candidates,
      allResults: rerankedResults,
      message: tieredResponse.message,
      promptForLLM,
    };
  }

  // 直接调用百炼 API 的简化版 LLM 调用
  async generateAnswer(query: string, prompt: string): Promise<string> {
    const apiKey = this.config.reranker.apiKey;

    const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3.6-plus",
        messages: [
          { role: "system", content: "你是 TechMate 技术学习助手，专注于前端开发技术。必须使用技术词汇：React、TypeScript、JavaScript、CSS、Node.js。禁止使用考公、行测、申论等词汇。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "抱歉，无法生成回答。";
  }

  // 完整的检索+生成流程
  async retrieveAndGenerate(query: string): Promise<{ answer: string; sources: string[]; tier: string }> {
    const retrievalResult = await this.retrieve(query);
    const answer = await this.generateAnswer(query, retrievalResult.promptForLLM);

    const sources = retrievalResult.allResults
      .slice(0, 3)
      .map(r => r.metadata?.source || r.metadata?.title || "本地知识库");

    return {
      answer,
      sources,
      tier: retrievalResult.tier,
    };
  }
}