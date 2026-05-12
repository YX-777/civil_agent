import { getVectorDBService, getEmbeddingService } from "@tech-mate/database";
import { Article, IngestStats } from "./types";
import { ArticleFilter, FilterOptions } from "./pipeline/filter";
import { ArticleDeduper } from "./pipeline/deduper";
import { chunk } from "./pipeline/chunker";

/**
 * 写入 ChromaDB tech_knowledge collection
 * - 拒重：内存指纹 + ChromaDB id 唯一约束兜底
 * - 限流：embedding API 调用间隔 250ms（4 QPS，远低于 DashScope 60 QPS 上限）
 */

const COLLECTION = "tech_knowledge";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface PersistOptions {
  filter?: FilterOptions;
  /** 真实写库还是只 dry-run（打印不写） */
  dryRun?: boolean;
  /** embedding 调用间隔 */
  rateLimitMs?: number;
  verbose?: boolean;
}

export async function persistArticles(
  source: string,
  articles: Article[],
  opt: PersistOptions = {},
): Promise<IngestStats> {
  const stats: IngestStats = {
    source,
    fetched: articles.length,
    filtered: 0,
    deduped: 0,
    persisted: 0,
    failed: 0,
  };

  const filter = new ArticleFilter(opt.filter || {});
  const deduper = new ArticleDeduper();
  const verbose = opt.verbose ?? false;
  const rate = opt.rateLimitMs ?? 250;

  // 过滤 + 去重 + chunk 展开
  const toPersist: Article[] = [];
  for (const art of articles) {
    const verdict = filter.accept(art);
    if (!verdict.ok) {
      if (verbose) console.log(`  ✗ filtered: ${verdict.reason} — ${art.title.slice(0, 40)}`);
      continue;
    }
    stats.filtered++;

    if (!deduper.check(art)) {
      if (verbose) console.log(`  ✗ dup: ${art.title.slice(0, 40)}`);
      continue;
    }
    stats.deduped++;

    // chunk 长文
    const pieces = chunk(art);
    toPersist.push(...pieces);
  }

  if (opt.dryRun) {
    console.log(`[persist] DRY-RUN: ${source} would persist ${toPersist.length} chunks`);
    return stats;
  }

  // 真实写库
  const vectorService = getVectorDBService();
  const embeddingService = getEmbeddingService();
  await vectorService.initialize();

  for (const piece of toPersist) {
    try {
      const vector = await embeddingService.generateEmbedding(piece.content);
      const id = deduper.buildId(piece);
      await vectorService.addEmbedding(
        COLLECTION,
        id,
        vector,
        {
          title: piece.title,
          source: piece.source,
          source_url: piece.sourceUrl || "",
          category: piece.category || "general",
          author: piece.author || "",
          tags: (piece.tags || []).join(","),
          published_at: piece.publishedAt || "",
          ingested_at: new Date().toISOString(),
        },
        piece.content,
      );
      stats.persisted++;
      if (verbose) console.log(`  ✓ ${piece.title.slice(0, 50)}`);
    } catch (e: any) {
      stats.failed++;
      const msg = e?.message || String(e);
      // ChromaDB duplicate id 是预期的（幂等），不算 fail
      if (msg.toLowerCase().includes("already exists") || msg.includes("duplicate")) {
        if (verbose) console.log(`  ~ exists: ${piece.title.slice(0, 40)}`);
        stats.failed--; // 抵消
      } else {
        console.warn(`  ! persist failed: ${msg}`);
      }
    }
    if (rate > 0) await sleep(rate);
  }

  return stats;
}
