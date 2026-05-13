/**
 * LlamaIndex 风格的向量检索器
 *
 * 实现 BaseRetriever 接口，内部委托现有的 VectorRetriever（chromadb SDK）。
 *
 * - 这是"Vector 检索这一路"在 LlamaIndex 标准接口下的实现
 * - 用 TextNode + NodeWithScore 作为统一中间数据格式
 * - 未来想换成 LlamaIndex 自带 ChromaVectorStore 只要替换这一个类
 */

import { BaseRetriever, TextNode } from "llamaindex";
import type { QueryBundle, NodeWithScore } from "llamaindex";
import { VectorRetriever as RawVectorRetriever } from "../../retrievers/vector-retriever";

export interface LlamaVectorRetrieverOptions {
  topK?: number;
  category?: string;
}

export class LlamaVectorRetriever extends BaseRetriever {
  private rawRetriever = new RawVectorRetriever();
  private topK: number;
  private category?: string;

  constructor(options?: LlamaVectorRetrieverOptions) {
    super();
    this.topK = options?.topK ?? 20;
    this.category = options?.category;
  }

  async _retrieve(params: QueryBundle): Promise<NodeWithScore[]> {
    const query = typeof params.query === "string" ? params.query : "";
    if (!query) return [];

    console.log("[LlamaIndex/VectorRetriever] retrieving:", query);

    const filter = this.category ? { category: this.category } : undefined;
    const raw = await this.rawRetriever.search(query, { topK: this.topK, filter });

    console.log("[LlamaIndex/VectorRetriever] hits:", raw.length);

    return raw.map((r) => ({
      node: new TextNode({
        id_: r.id,
        text: r.content,
        metadata: r.metadata || {},
      }),
      score: r.score,
    }));
  }
}
