/**
 * RAG Engine 入口
 */

export { VectorRetriever } from "./retrievers/vector-retriever";
export { BM25Retriever } from "./retrievers/bm25-retriever";
export { HybridRetriever, RetrieveOptions, HybridSearchResult } from "./retrievers/hybrid-retriever";
export { BGEM3Reranker, RerankResult } from "./reranker/bge-m3-reranker";
export { ThreeTierStrategy, TieredResponse } from "./strategies/three-tier-strategy";
export { getRAGConfig, DEFAULT_RAG_CONFIG } from "./config/rag.config";
export { initializeKnowledgeBase, ALL_KNOWLEDGE } from "./scripts/init-knowledge-base";

// LlamaIndex 适配层（推荐入口）
export {
  DashScopeEmbedding,
  LlamaVectorRetriever,
  LlamaBM25Retriever,
  HybridFusionRetriever,
  BgeM3NodePostprocessor,
  ThreeTierSynthesizer,
  LlamaIndexQueryEngine,
  createLlamaIndexQueryEngine,
  getLlamaIndexQueryEngine,
} from "./llamaindex";
export type {
  LlamaIndexQueryEngineOptions,
  LlamaIndexQueryParams,
  LlamaIndexQueryResult,
  LlamaIndexRetrieveResult,
} from "./llamaindex";

// 单例 HybridRetriever（保留备用，generalQANode 已切到 LlamaIndex QueryEngine）
import { HybridRetriever } from "./retrievers/hybrid-retriever";

let hybridRetrieverInstance: HybridRetriever | null = null;

export function getHybridRetriever(): HybridRetriever {
  if (!hybridRetrieverInstance) {
    hybridRetrieverInstance = new HybridRetriever();
  }
  return hybridRetrieverInstance;
}