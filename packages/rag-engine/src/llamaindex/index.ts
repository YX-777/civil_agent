/**
 * LlamaIndex 适配层入口
 *
 * 把现有 RAG 组件（VectorRetriever / BM25 / BGE-M3 Reranker / ThreeTierStrategy）
 * 用 LlamaIndex 标准接口重新封装，对外提供一个统一的 QueryEngine。
 */

export { DashScopeEmbedding } from "./embeddings/dashscope-embedding";

export { LlamaVectorRetriever } from "./retrievers/vector-retriever";
export { LlamaBM25Retriever } from "./retrievers/bm25-retriever";
export { HybridFusionRetriever } from "./retrievers/hybrid-fusion-retriever";

export { BgeM3NodePostprocessor } from "./postprocessors/bge-m3-reranker";
export { ThreeTierSynthesizer } from "./synthesizers/three-tier-synthesizer";

export {
  LlamaIndexQueryEngine,
  createLlamaIndexQueryEngine,
  getLlamaIndexQueryEngine,
} from "./query-engine";
export type {
  LlamaIndexQueryEngineOptions,
  LlamaIndexQueryParams,
  LlamaIndexQueryResult,
  LlamaIndexRetrieveResult,
} from "./query-engine";
