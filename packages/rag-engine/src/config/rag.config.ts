/**
 * RAG Engine 配置
 */

export interface RAGConfig {
  vectorRetriever: {
    topK: number;
    minScore: number;
  };
  bm25Retriever: {
    topK: number;
    k1: number;  // BM25 参数
    b: number;   // BM25 参数
  };
  reranker: {
    topK: number;
    apiKey: string;
    endpoint: string;
  };
  threeTierStrategy: {
    tier1Threshold: number;  // 高置信 (>0.85)
    tier2Threshold: number;  // 中置信 (>0.6)
  };
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  vectorRetriever: {
    topK: 20,
    minScore: 0.3,
  },
  bm25Retriever: {
    topK: 20,
    k1: 1.5,
    b: 0.75,
  },
  reranker: {
    topK: 10,
    apiKey: process.env.DASHSCOPE_API_KEY || "",
    // 阿里云百炼 rerank API 原生端点（v1 完整路径）
    // 参考: https://help.aliyun.com/zh/model-studio/text-rerank-api
    endpoint: "https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank",
  },
  threeTierStrategy: {
    tier1Threshold: 0.85,
    tier2Threshold: 0.6,
  },
};

export function getRAGConfig(): RAGConfig {
  return DEFAULT_RAG_CONFIG;
}