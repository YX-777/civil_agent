/**
 * DashScope Embedding 适配器
 *
 * 把现有 EmbeddingService 包装成 LlamaIndex 的 BaseEmbedding，
 * 让向量化能力以标准接口接入 QueryEngine。
 *
 * - 阿里云 text-embedding-v2 默认 1536 维
 * - 区分 document 和 query 两种 text_type，提高检索精度
 * - 实现 LlamaIndex BaseEmbedding 接口后，未来换 OpenAI / Cohere 只需替换实现类
 */

import { BaseEmbedding } from "llamaindex";
import { getEmbeddingService } from "@tech-mate/database";

export class DashScopeEmbedding extends BaseEmbedding {
  constructor() {
    super();
    // 阿里云 text-embedding-v2 单次批量上限 25
    this.embedBatchSize = 25;
    this.embedInfo = { dimensions: 1536 };

    // 重写批量方法：直接走 DashScope 批量 API
    this.getTextEmbeddings = async (texts: string[]): Promise<number[][]> => {
      if (!texts.length) return [];
      const service = getEmbeddingService();
      return service.generateBatchEmbeddings(texts);
    };
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const service = getEmbeddingService();
    return service.generateEmbedding(text);
  }

  // 重写 query embedding：利用 DashScope 的 text_type=query 区分
  async getQueryEmbedding(query: any): Promise<number[] | null> {
    const text = typeof query === "string" ? query : query?.text || "";
    if (!text) return null;
    const service = getEmbeddingService();
    return service.generateQueryEmbedding(text);
  }
}
