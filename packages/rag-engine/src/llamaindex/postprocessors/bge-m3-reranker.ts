/**
 * BGE-M3 NodePostprocessor
 *
 * 实现 LlamaIndex BaseNodePostprocessor 接口，把现有 BGEM3Reranker（阿里云
 * 百炼 gte-rerank API）接入 QueryEngine 流水线作为"二次筛选"环节。
 *
 * - LlamaIndex 的 NodePostprocessor 是检索后的可插拔加工层
 * - 实际调用阿里云百炼 gte-rerank 模型做相关性重排
 * - 失败自动降级到原始向量分数（不影响主流程）
 */

import { MetadataMode } from "llamaindex";
import type { BaseNodePostprocessor, NodeWithScore } from "llamaindex";
import { BGEM3Reranker } from "../../reranker/bge-m3-reranker";

export interface BgeM3NodePostprocessorOptions {
  topK?: number;
}

export class BgeM3NodePostprocessor implements BaseNodePostprocessor {
  private reranker = new BGEM3Reranker();
  private topK?: number;

  constructor(options?: BgeM3NodePostprocessorOptions) {
    this.topK = options?.topK;
  }

  async postprocessNodes(
    nodes: NodeWithScore[],
    query?: any
  ): Promise<NodeWithScore[]> {
    if (!nodes.length) return [];

    const queryStr =
      typeof query === "string"
        ? query
        : typeof query?.query === "string"
        ? query.query
        : "";

    if (!queryStr) {
      console.warn("[LlamaIndex/BGE-M3] 无 query 文本，跳过 rerank");
      return nodes;
    }

    console.log(`[LlamaIndex/BGE-M3] 开始重排 ${nodes.length} 个候选`);

    // 准备 rerank 输入
    const candidates = nodes.map((nws) => ({
      id: nws.node.id_,
      content: nws.node.getContent(MetadataMode.NONE),
      metadata: { ...(nws.node.metadata || {}), originalScore: nws.score },
    }));

    const reranked = await this.reranker.rerank(queryStr, candidates, this.topK);

    // 按 reranked 顺序重组 NodeWithScore，保留原 node 引用，更新 score
    const nodeMap = new Map(nodes.map((nws) => [nws.node.id_, nws.node]));
    const result: NodeWithScore[] = [];
    for (const r of reranked) {
      const node = nodeMap.get(r.id);
      if (node) result.push({ node, score: r.score });
    }

    console.log(`[LlamaIndex/BGE-M3] 重排后保留 ${result.length} 条`);
    return result;
  }
}
