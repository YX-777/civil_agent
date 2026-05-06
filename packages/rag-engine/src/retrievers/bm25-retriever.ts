/**
 * BM25 关键词检索器
 */

import natural from "natural";
import { getRAGConfig } from "../config/rag.config";

export interface BM25SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

interface IndexedDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  tokens: string[];
  termFreq: Map<string, number>;
  docLength: number;
}

export class BM25Retriever {
  private config = getRAGConfig().bm25Retriever;
  private documents: IndexedDocument[] = [];
  private avgDocLength: number = 0;
  private docCount: number = 0;
  private docFreq: Map<string, number> = new Map();
  private tokenizer = new natural.WordTokenizer();

  // 简单的中文分词（按字符分割）
  private tokenizeChinese(text: string): string[] {
    // 中文字符单独分割，英文按词分割
    const chineseChars = text.match(/[一-龥]/g) || [];
    const englishWords = this.tokenizer.tokenize(text.replace(/[一-龥]/g, " ")) || [];
    return [...chineseChars, ...englishWords].filter(t => t.length > 0);
  }

  async buildIndex(documents: Array<{ id: string; content: string; metadata: Record<string, any> }>): Promise<void> {
    this.documents = documents.map(doc => {
      const tokens = this.tokenizeChinese(doc.content);
      const termFreq = new Map<string, number>();

      tokens.forEach(token => {
        termFreq.set(token, (termFreq.get(token) || 0) + 1);
      });

      return {
        ...doc,
        tokens,
        termFreq,
        docLength: tokens.length,
      };
    });

    this.docCount = this.documents.length;
    this.avgDocLength = this.documents.reduce((sum, d) => sum + d.docLength, 0) / this.docCount;

    // 计算文档频率
    this.docFreq.clear();
    this.documents.forEach(doc => {
      doc.termFreq.forEach((_, term) => {
        this.docFreq.set(term, (this.docFreq.get(term) || 0) + 1);
      });
    });
  }

  async search(query: string, options?: { topK?: number }): Promise<BM25SearchResult[]> {
    const topK = options?.topK || this.config.topK;
    const queryTokens = this.tokenizeChinese(query);

    const scores: Array<{ doc: IndexedDocument; score: number }> = [];

    for (const doc of this.documents) {
      let score = 0;

      for (const token of queryTokens) {
        const tf = doc.termFreq.get(token) || 0;
        if (tf === 0) continue;

        const df = this.docFreq.get(token) || 0;
        const idf = Math.log((this.docCount - df + 0.5) / (df + 0.5) + 1);

        // BM25 公式
        const tfNorm = (tf * (this.config.k1 + 1)) /
          (tf + this.config.k1 * (1 - this.config.b + this.config.b * doc.docLength / this.avgDocLength));

        score += idf * tfNorm;
      }

      if (score > 0) {
        scores.push({ doc, score });
      }
    }

    // 按分数排序
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map(s => ({
      id: s.doc.id,
      content: s.doc.content,
      score: s.score,
      metadata: s.doc.metadata,
    }));
  }

  // 从向量库加载文档到 BM25 索引
  async loadFromVectorCollection(collection: string): Promise<void> {
    // 这里需要从 database 包获取所有文档
    // 暂时用空实现，后续补充
  }
}