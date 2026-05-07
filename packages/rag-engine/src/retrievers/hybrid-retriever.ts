/**
 * 混合检索器 - RRF 融合 + 重排 + 三级策略
 */

import { VectorRetriever } from "./vector-retriever";
import { BM25Retriever } from "./bm25-retriever";
import { BGEM3Reranker } from "../reranker/bge-m3-reranker";
import { ThreeTierStrategy, TieredResponse } from "../strategies/three-tier-strategy";
import { getRAGConfig } from "../config/rag.config";

export interface RetrieveOptions {
  topK?: number;           // 返回多少条结果
  category?: string;       // 分类过滤：agent/rag/langchain/llm
  rerankTopK?: number;     // 重排后返回多少条
  skipRerank?: boolean;    // 跳过重排（性能优化）
  minScore?: number;       // 最小分数阈值
}

export interface HybridSearchResult {
  tier: "precise" | "candidates" | "expand" | "fallback";
  answer?: string;
  candidates?: Array<{ content: string; score: number; source: string }>;
  allResults: Array<{ id: string; content: string; score: number; metadata: Record<string, any> }>;
  message: string;
  promptForLLM: string;
  retrievalSource?: "hybrid" | "vector_only" | "bm25_only" | "fallback";  // 检索来源标识
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

  async retrieve(query: string, options?: RetrieveOptions): Promise<HybridSearchResult> {
    // 合并默认配置和传入参数
    const effectiveOptions = {
      topK: options?.topK ?? this.config.vectorRetriever.topK,
      category: options?.category,
      rerankTopK: options?.rerankTopK ?? this.config.reranker.topK,
      skipRerank: options?.skipRerank ?? false,
      minScore: options?.minScore ?? this.config.vectorRetriever.minScore,
    };

    // 构建 ChromaDB where filter
    const filter = effectiveOptions.category
      ? { category: effectiveOptions.category }
      : undefined;

    // Step 1: 并行执行向量 + BM25 检索（带分类过滤）
    console.log("[HybridRetriever] 开始检索, query:", query);
    console.log("[HybridRetriever] options:", effectiveOptions);
    console.log("[HybridRetriever] filter:", filter);

    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorRetriever.search(query, {
        topK: effectiveOptions.topK,
        filter
      }).catch(e => {
        console.error("[HybridRetriever] VectorRetriever error:", e);
        return [];
      }),
      this.bm25Retriever.search(query, {
        topK: effectiveOptions.topK,
        filter
      }).catch(e => {
        console.error("[HybridRetriever] BM25Retriever error:", e);
        return [];
      }),
    ]);

    console.log("[HybridRetriever] VectorResults count:", vectorResults.length);
    console.log("[HybridRetriever] BM25Results count:", bm25Results.length);

    // Step 2: 检查是否有结果
    if (vectorResults.length === 0 && bm25Results.length === 0) {
      return {
        tier: "fallback",
        allResults: [],
        message: "未找到相关知识",
        promptForLLM: `用户问题：${query}\n本地知识库中没有找到相关知识。`,
        retrievalSource: "fallback",
      };
    }

    // Step 3: RRF 融合
    const fusedResults = this.rrfFusion(vectorResults, bm25Results);

    // Step 4: BGE-M3 重排（可选）
    const rerankedResults = effectiveOptions.skipRerank
      ? fusedResults.slice(0, effectiveOptions.rerankTopK)
      : await this.reranker.rerank(query, fusedResults, effectiveOptions.rerankTopK);

    // Step 5: 应用最小分数过滤
    const filteredResults = rerankedResults.filter(
      r => r.score >= effectiveOptions.minScore
    );

    // Step 6: 三级策略分类
    const tieredResponse = this.threeTierStrategy.classify(filteredResults, query);

    // Step 7: 生成 LLM prompt
    const promptForLLM = this.threeTierStrategy.buildPromptForLLM(tieredResponse, query);

    // 确定检索来源
    let retrievalSource: "hybrid" | "vector_only" | "bm25_only" = "hybrid";
    if (vectorResults.length > 0 && bm25Results.length === 0) {
      retrievalSource = "vector_only";
    } else if (bm25Results.length > 0 && vectorResults.length === 0) {
      retrievalSource = "bm25_only";
    }

    return {
      tier: tieredResponse.tier,
      answer: tieredResponse.answer,
      candidates: tieredResponse.candidates,
      allResults: filteredResults,
      message: tieredResponse.message,
      promptForLLM,
      retrievalSource,
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