/**
 * 统一文章 schema
 * 所有 adapter 输出这种结构，pipeline 和 persister 只认这个
 */
export interface Article {
  /** 标题（必填） */
  title: string;
  /** 正文，纯文本或 markdown，去 HTML 标签后 */
  content: string;
  /** 来源标识：devto / ruanyf-weekly / awesome / infoq-summary / ... */
  source: string;
  /** 原始 URL（可选） */
  sourceUrl?: string;
  /** 分类：frontend / backend / ai / general */
  category?: string;
  /** 发布时间 ISO 字符串 */
  publishedAt?: string;
  /** 作者 */
  author?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * 采集器 interface — 所有 adapter 实现它
 */
export interface IContentAdapter {
  /** 来源名 */
  readonly source: string;
  /** 拉取，返回 Article[] */
  fetch(options: FetchOptions): Promise<Article[]>;
}

export interface FetchOptions {
  /** 每个 adapter 上限 */
  limit?: number;
  /** 启用调试日志 */
  verbose?: boolean;
}

/**
 * Pipeline 入库阶段统计
 */
export interface IngestStats {
  source: string;
  fetched: number;
  filtered: number;       // 通过 filter 的
  deduped: number;        // 通过 dedup 的
  persisted: number;      // 成功入库的
  failed: number;
}
