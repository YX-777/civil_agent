import { createHash } from "crypto";
import { Article } from "../types";

/**
 * 内存去重：基于 content 前 500 字符的 md5
 *
 * 不查 ChromaDB（chroma 没有 by-metadata 高效检索接口，且我们用 sourceUrl/title 拼 id，
 * 重复入库会被 chroma 本身的 id 唯一约束兜底）
 */
export class ArticleDeduper {
  private readonly seen = new Set<string>();

  /**
   * 计算指纹：基于 content 头部
   */
  private fingerprint(article: Article): string {
    const sample = (article.content || "").slice(0, 500).replace(/\s+/g, "");
    return createHash("md5").update(sample).digest("hex");
  }

  /**
   * 检查并标记。返回 true 表示通过（非重复）
   */
  check(article: Article): boolean {
    const fp = this.fingerprint(article);
    if (this.seen.has(fp)) return false;
    this.seen.add(fp);
    return true;
  }

  /**
   * 给文章生成稳定 id（用于 ChromaDB add 时去重）
   * 基于 source + content 头 hash，保证幂等
   */
  buildId(article: Article): string {
    const fp = this.fingerprint(article);
    const src = (article.source || "unknown").replace(/[^a-z0-9]/gi, "");
    return `art_${src}_${fp.slice(0, 12)}`;
  }
}
