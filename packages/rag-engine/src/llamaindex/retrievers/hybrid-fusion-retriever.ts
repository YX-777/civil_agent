/**
 * 混合融合检索器（Vector + BM25 → RRF）
 *
 * 实现 BaseRetriever 接口，组合 LlamaVectorRetriever 和 LlamaBM25Retriever，
 * 用 Reciprocal Rank Fusion (RRF) 把两路结果融合为一个排序列表。
 *
 * 面试讲法：
 * - RRF 公式：rrf_score = 1 / (k + rank + 1)，k=60 是业界常用值
 * - 优点：不需要调权重，分数自动归一化，对不同尺度分数容错
 * - 与直接加权对比：直接加权要解决两路分数尺度不同的问题（Vector 0-1，BM25 可能 10+），RRF 只看排名规避了这点
 */

import { BaseRetriever } from "llamaindex";
import type { QueryBundle, NodeWithScore } from "llamaindex";
import { LlamaVectorRetriever } from "./vector-retriever";
import { LlamaBM25Retriever } from "./bm25-retriever";

export interface HybridFusionRetrieverOptions {
  topK?: number;
  category?: string;
  rrfK?: number; // RRF 常数，默认 60
}

export class HybridFusionRetriever extends BaseRetriever {
  private vectorRetriever: LlamaVectorRetriever;
  private bm25Retriever: LlamaBM25Retriever;
  private topK: number;
  private rrfK: number;

  constructor(options?: HybridFusionRetrieverOptions) {
    super();
    this.topK = options?.topK ?? 20;
    this.rrfK = options?.rrfK ?? 60;
    this.vectorRetriever = new LlamaVectorRetriever({
      topK: this.topK,
      category: options?.category,
    });
    this.bm25Retriever = new LlamaBM25Retriever({
      topK: this.topK,
      category: options?.category,
    });
  }

  async _retrieve(params: QueryBundle): Promise<NodeWithScore[]> {
    console.log("\n" + "=".repeat(60));
    console.log("[LlamaIndex/HybridFusion] 开始并行检索:", params.query);

    // 并行执行两路检索，单路失败不影响整体
    const [vectorNodes, bm25Nodes] = await Promise.all([
      this.vectorRetriever.retrieve(params).catch((e) => {
        console.warn("[LlamaIndex/HybridFusion] Vector path failed:", e);
        return [] as NodeWithScore[];
      }),
      this.bm25Retriever.retrieve(params).catch((e) => {
        console.warn("[LlamaIndex/HybridFusion] BM25 path failed:", e);
        return [] as NodeWithScore[];
      }),
    ]);

    console.log(
      `[LlamaIndex/HybridFusion] vector=${vectorNodes.length} bm25=${bm25Nodes.length}`
    );

    if (vectorNodes.length === 0 && bm25Nodes.length === 0) {
      console.log("[LlamaIndex/HybridFusion] 两路均无结果");
      console.log("=".repeat(60));
      return [];
    }

    // RRF 融合
    const k = this.rrfK;
    const scoreMap = new Map<string, { node: NodeWithScore["node"]; rrf: number }>();

    const accumulate = (nodes: NodeWithScore[]) => {
      nodes.forEach((nws, rank) => {
        const id = nws.node.id_;
        const contribution = 1 / (k + rank + 1);
        const existing = scoreMap.get(id);
        if (existing) {
          existing.rrf += contribution;
        } else {
          scoreMap.set(id, { node: nws.node, rrf: contribution });
        }
      });
    };

    accumulate(vectorNodes);
    accumulate(bm25Nodes);

    const fused: NodeWithScore[] = Array.from(scoreMap.entries())
      .map(([_, v]) => ({ node: v.node, score: v.rrf }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, this.topK);

    console.log(`[LlamaIndex/HybridFusion] RRF 融合后保留 ${fused.length} 条`);
    console.log("=".repeat(60));

    return fused;
  }
}
