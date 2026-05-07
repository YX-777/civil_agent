/**
 * Chroma 向量检索器
 */

import { getVectorDBService, getEmbeddingService } from "@civil-agent/database";
import { getRAGConfig } from "../config/rag.config";

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface VectorSearchOptions {
  topK?: number;
  collection?: string;
  filter?: Record<string, any>;  // ChromaDB where filter（如 { category: "agent" }）
}

export class VectorRetriever {
  private config = getRAGConfig().vectorRetriever;

  async search(query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const topK = options?.topK || this.config.topK;
    console.log("[VectorRetriever] Searching for:", query);
    console.log("[VectorRetriever] Options:", options);

    // 生成查询向量
    const embeddingService = getEmbeddingService();
    console.log("[VectorRetriever] Generating embedding...");
    const queryVector = await embeddingService.generateEmbedding(query);
    console.log("[VectorRetriever] Embedding generated, length:", queryVector?.length);

    // 搜索向量库
    const vectorDBService = getVectorDBService();
    const collection = options?.collection || "tech_knowledge";
    const filter = options?.filter;  // 分类过滤
    console.log("[VectorRetriever] Searching collection:", collection, "with filter:", filter);

    const results = await vectorDBService.search(collection, queryVector, topK, filter);
    console.log("[VectorRetriever] Raw results from VectorDB:", results?.length, "items");

    // 过滤低分结果并转换格式
    const filteredResults = results
      .filter((r: any) => r.distance !== undefined && 1 - r.distance >= this.config.minScore)
      .map((r: any) => ({
        id: r.id,
        content: r.content || "",  // 直接从 VectorSearchResult.content 获取
        score: r.distance !== undefined ? 1 - r.distance : 0,
        metadata: r.metadata || {},
      }));
    console.log("[VectorRetriever] Filtered results:", filteredResults.length, "items");

    return filteredResults;
  }

  async addDocument(content: string, metadata: Record<string, any>): Promise<string> {
    const embeddingService = getEmbeddingService();
    const vector = await embeddingService.generateEmbedding(content);

    const vectorDBService = getVectorDBService();
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await vectorDBService.addEmbedding("tech_knowledge", id, vector, {
      content,
      ...metadata,
    });

    return id;
  }

  async addBatchDocuments(documents: Array<{ content: string; metadata: Record<string, any> }>): Promise<string[]> {
    const embeddingService = getEmbeddingService();
    const vectors = await embeddingService.generateBatchEmbeddings(
      documents.map(d => d.content)
    );

    const vectorDBService = getVectorDBService();
    const ids = documents.map(() => `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    await vectorDBService.addBatchEmbeddings("tech_knowledge", vectors.map((v, i) => ({
      id: ids[i],
      vector: v,
      metadata: {
        content: documents[i].content,
        ...documents[i].metadata,
      },
    })));

    return ids;
  }
}