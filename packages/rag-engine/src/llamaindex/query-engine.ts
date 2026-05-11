/**
 * LlamaIndex Query Engine 工厂
 *
 * 把 HybridFusionRetriever（Vector + BM25 + RRF） + BgeM3NodePostprocessor（重排）
 * + ThreeTierSynthesizer（三级响应合成）串成一条标准 RAG 流水线。
 *
 * 这是简历中"基于 LlamaIndex 搭建混合分层 RAG"的代码落点。
 *
 * 面试讲法：
 * - 整体架构对应 LlamaIndex 的 Retriever → Postprocessor → Synthesizer 三层
 * - 每一层都接的是 LlamaIndex 标准接口，组件可插拔
 * - 单例 + 配置化，避免每次请求重新建索引
 */

import { MetadataMode } from "llamaindex";
import type { NodeWithScore } from "llamaindex";
import { HybridFusionRetriever } from "./retrievers/hybrid-fusion-retriever";
import { BgeM3NodePostprocessor } from "./postprocessors/bge-m3-reranker";
import {
  ThreeTierSynthesizer,
  type ThreeTierSynthesizeResult,
} from "./synthesizers/three-tier-synthesizer";
import { ThreeTierStrategy } from "../strategies/three-tier-strategy";

export interface LlamaIndexQueryEngineOptions {
  topK?: number;          // Retriever 返回 topK
  rerankTopK?: number;    // Reranker 保留 topK
  category?: string;      // 分类过滤
}

export interface LlamaIndexQueryParams {
  query: string;
  topK?: number;
  rerankTopK?: number;
  category?: string;
}

export interface LlamaIndexQueryResult {
  message: { content: string };
  sourceNodes: NodeWithScore[];
  tier: "precise" | "candidates" | "expand" | "fallback";
  promptForLLM: string;
  retrievalSource: "hybrid" | "vector_only" | "bm25_only" | "fallback";
}

/**
 * 只走检索 + 重排 + 三级策略 prompt 构建，不调 LLM。
 * 用于上游需要把 RAG context 和其它上下文（如四阶记忆）合并后再统一调 LLM 的场景。
 */
export interface LlamaIndexRetrieveResult {
  sourceNodes: NodeWithScore[];
  tier: "precise" | "candidates" | "expand" | "fallback";
  promptForLLM: string;
  retrievalSource: "hybrid" | "vector_only" | "bm25_only" | "fallback";
}

export class LlamaIndexQueryEngine {
  private defaultOptions: Required<LlamaIndexQueryEngineOptions>;
  private synthesizer = new ThreeTierSynthesizer();
  private threeTierStrategy = new ThreeTierStrategy();

  // 缓存不同 category 配置的 retriever，避免反复重建 BM25 索引
  private retrieverCache = new Map<string, HybridFusionRetriever>();
  private postprocessorCache = new Map<string, BgeM3NodePostprocessor>();

  constructor(options?: LlamaIndexQueryEngineOptions) {
    this.defaultOptions = {
      topK: options?.topK ?? 20,
      rerankTopK: options?.rerankTopK ?? 5,
      category: options?.category ?? "",
    };
  }

  /**
   * 只走检索 + 重排 + 三级策略 prompt 构建，不调 LLM。
   * 适合上游需要把 RAG context 与其它上下文（如四阶记忆）合并后再统一调 LLM 的场景。
   */
  async retrieveOnly(params: LlamaIndexQueryParams): Promise<LlamaIndexRetrieveResult> {
    const topK = params.topK ?? this.defaultOptions.topK;
    const rerankTopK = params.rerankTopK ?? this.defaultOptions.rerankTopK;
    const category = params.category ?? this.defaultOptions.category;

    console.log("\n" + "█".repeat(60));
    console.log(
      `[LlamaIndex/QueryEngine] retrieveOnly query="${params.query}" topK=${topK} rerankTopK=${rerankTopK} category="${category || "*"}"`
    );
    console.log("█".repeat(60));

    const retrieverKey = `${category}|${topK}`;
    let retriever = this.retrieverCache.get(retrieverKey);
    if (!retriever) {
      retriever = new HybridFusionRetriever({
        topK,
        category: category || undefined,
      });
      this.retrieverCache.set(retrieverKey, retriever);
    }

    let postprocessor = this.postprocessorCache.get(String(rerankTopK));
    if (!postprocessor) {
      postprocessor = new BgeM3NodePostprocessor({ topK: rerankTopK });
      this.postprocessorCache.set(String(rerankTopK), postprocessor);
    }

    const candidates = await retriever.retrieve({ query: params.query });
    let retrievalSource: LlamaIndexRetrieveResult["retrievalSource"] =
      candidates.length > 0 ? "hybrid" : "fallback";

    const reranked = await postprocessor.postprocessNodes(candidates, params.query);

    // 用三级策略构建 prompt（不调 LLM）
    const tieredInput = reranked.map((nws) => ({
      id: nws.node.id_,
      content: nws.node.getContent(MetadataMode.NONE),
      score: nws.score ?? 0,
      metadata: nws.node.metadata || {},
    }));
    const tiered = this.threeTierStrategy.classify(tieredInput, params.query);
    const promptForLLM = this.threeTierStrategy.buildPromptForLLM(tiered, params.query);

    if (reranked.length === 0) retrievalSource = "fallback";

    console.log(
      `[LlamaIndex/QueryEngine] retrieveOnly tier=${tiered.tier} sourceNodes=${reranked.length} retrievalSource=${retrievalSource}`
    );
    console.log("█".repeat(60) + "\n");

    return {
      sourceNodes: reranked,
      tier: tiered.tier,
      promptForLLM,
      retrievalSource,
    };
  }

  /**
   * 完整流水线：检索 + 重排 + 三级策略 + LLM 生成。
   */
  async query(params: LlamaIndexQueryParams): Promise<LlamaIndexQueryResult> {
    const partial = await this.retrieveOnly(params);

    const synthesized: ThreeTierSynthesizeResult = await this.synthesizer.synthesize({
      query: params.query,
      nodes: partial.sourceNodes,
    });

    return {
      message: { content: synthesized.response.response },
      sourceNodes: partial.sourceNodes,
      tier: synthesized.tier,
      promptForLLM: synthesized.promptForLLM,
      retrievalSource: partial.retrievalSource,
    };
  }
}

let singleton: LlamaIndexQueryEngine | null = null;

export function getLlamaIndexQueryEngine(): LlamaIndexQueryEngine {
  if (!singleton) {
    singleton = new LlamaIndexQueryEngine();
  }
  return singleton;
}

export function createLlamaIndexQueryEngine(
  options?: LlamaIndexQueryEngineOptions
): LlamaIndexQueryEngine {
  return new LlamaIndexQueryEngine(options);
}
