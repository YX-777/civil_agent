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

export class VectorRetriever {
  private config = getRAGConfig().vectorRetriever;

  async search(query: string, options?: { topK?: number; collection?: string }): Promise<VectorSearchResult[]> {
    const topK = options?.topK || this.config.topK;

    // 生成查询向量
    const embeddingService = getEmbeddingService();
    const queryVector = await embeddingService.generateEmbedding(query);

    // 搜索向量库
    const vectorDBService = getVectorDBService();
    const collection = options?.collection || "tech_knowledge";

    const results = await vectorDBService.search(collection, queryVector, topK);

    // 过滤低分结果并转换格式
    return results
      .filter((r: any) => r.distance !== undefined && 1 - r.distance >= this.config.minScore)
      .map((r: any) => ({
        id: r.id,
        content: r.metadata?.content || "",
        score: r.distance !== undefined ? 1 - r.distance : 0,
        metadata: r.metadata || {},
      }));
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