/**
 * 检索器基类
 */

import type { RAGSearchParams, RetrievalResult } from "@civil-agent/core";

export abstract class BaseRetriever {
  /**
   * 检索方法
   */
  abstract retrieve(params: RAGSearchParams): Promise<RetrievalResult[]>;

  /**
   * 过滤低分结果
   */
  protected filterByScore(results: RetrievalResult[], minScore: number): RetrievalResult[] {
    return results.filter((r) => (r.metadata.score || 0) >= minScore);
  }

  /**
   * 去重
   */
  protected deduplicate(results: RetrievalResult[]): RetrievalResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.metadata.source}-${r.content.slice(0, 50)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
