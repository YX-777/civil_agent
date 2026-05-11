/**
 * LlamaIndex 风格的 BM25 检索器
 *
 * 实现 BaseRetriever 接口，内部委托现有的 BM25Retriever（natural + 中文字符切分）。
 *
 * 关键修复：原 BM25Retriever 的 loadFromVectorCollection 是空实现，导致索引从未
 * 建立，HybridRetriever 长期跑在 vector_only 模式。这里在首次检索前 lazy 从
 * ChromaDB 拉取全量文档调用 buildIndex，让 BM25 真正干活。
 *
 * 面试讲法：
 * - LlamaIndex TS 版本没有内置中文 BM25 支持，所以自实现并接入 BaseRetriever
 * - 索引构建走 lazy 模式：首次调用时从 ChromaDB collection 拉全量数据
 * - 单例 + ensureIndexReady 保证只 build 一次
 */

import { BaseRetriever, TextNode } from "llamaindex";
import type { QueryBundle, NodeWithScore } from "llamaindex";
import { BM25Retriever as RawBM25Retriever } from "../../retrievers/bm25-retriever";
import { getVectorDBService } from "@tech-mate/database";

export interface LlamaBM25RetrieverOptions {
  topK?: number;
  category?: string;
  collection?: string; // 默认 tech_knowledge
}

export class LlamaBM25Retriever extends BaseRetriever {
  private rawRetriever = new RawBM25Retriever();
  private topK: number;
  private category?: string;
  private collection: string;
  private indexReady = false;
  private indexBuilding: Promise<void> | null = null;

  constructor(options?: LlamaBM25RetrieverOptions) {
    super();
    this.topK = options?.topK ?? 20;
    this.category = options?.category;
    this.collection = options?.collection ?? "tech_knowledge";
  }

  /**
   * Lazy 初始化 BM25 索引：从 ChromaDB collection 拉取全量文档，调用 buildIndex。
   * 多次调用安全（用 Promise 锁防并发重复构建）。
   */
  private async ensureIndexReady(): Promise<void> {
    if (this.indexReady) return;
    if (this.indexBuilding) return this.indexBuilding;

    this.indexBuilding = (async () => {
      console.log(`[LlamaIndex/BM25Retriever] 首次使用，从 ${this.collection} 拉取全量文档构建索引...`);
      const t0 = Date.now();
      const vectorDB = getVectorDBService();
      const docs = await vectorDB.getAllDocuments(this.collection);

      // 过滤空文档（避免 buildIndex 时分词得到空 token）
      const validDocs = docs.filter((d) => d.content && d.content.trim().length > 0);

      await this.rawRetriever.buildIndex(
        validDocs.map((d) => ({
          id: d.id,
          content: d.content,
          metadata: d.metadata,
        }))
      );

      this.indexReady = true;
      console.log(
        `[LlamaIndex/BM25Retriever] BM25 索引构建完成，${validDocs.length} 篇文档，耗时 ${Date.now() - t0}ms`
      );
    })();

    try {
      await this.indexBuilding;
    } finally {
      this.indexBuilding = null;
    }
  }

  async _retrieve(params: QueryBundle): Promise<NodeWithScore[]> {
    const query = typeof params.query === "string" ? params.query : "";
    if (!query) return [];

    await this.ensureIndexReady();

    console.log("[LlamaIndex/BM25Retriever] retrieving:", query);

    const filter = this.category ? { category: this.category } : undefined;
    const raw = await this.rawRetriever.search(query, { topK: this.topK, filter });

    console.log("[LlamaIndex/BM25Retriever] hits:", raw.length);

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
