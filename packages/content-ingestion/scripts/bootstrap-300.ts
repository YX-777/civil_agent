/**
 * 一键补量
 *
 * 依次跑多个 adapter，扩展 ChromaDB tech_knowledge collection。
 * 失败不中断 —— 单个 adapter 挂了不影响其他。
 *
 * 来源调整（2026-05）：
 * - 去掉 ruanyf 阮一峰博客（非技术内容混杂）
 * - 新增 hf-blog / langchain-blog（AI/Agent/LLM 一手内容，链接 100% 准确）
 */
import { DevtoAdapter } from "../src/adapters/devto-adapter";
import { RuanyfWeeklyAdapter } from "../src/adapters/ruanyf-weekly-adapter";
import { GithubAwesomeAdapter } from "../src/adapters/github-awesome-adapter";
import { HuggingFaceBlogAdapter } from "../src/adapters/huggingface-blog-adapter";
import { LangChainBlogAdapter } from "../src/adapters/langchain-blog-adapter";
import { persistArticles } from "../src/persister";
import { IngestStats } from "../src/types";

interface AdapterJob {
  name: string;
  adapter: { fetch: (o: any) => Promise<any[]> };
  limit: number;
  filter?: any;
}

const JOBS: AdapterJob[] = [
  // —— AI/Agent/LLM 主题（高质量、链接 100% 准确）——
  { name: "hf-blog", adapter: new HuggingFaceBlogAdapter(), limit: 80,
    filter: { minLength: 300, maxLength: 30000, requireKeyword: false } },
  { name: "langchain-blog", adapter: new LangChainBlogAdapter(), limit: 80,
    filter: { minLength: 300, maxLength: 30000, requireKeyword: false } },
  // —— 通用技术内容 ——
  { name: "weekly", adapter: new RuanyfWeeklyAdapter(), limit: 60,
    filter: { minLength: 500, maxLength: 20000, requireKeyword: true } },
  { name: "awesome", adapter: new GithubAwesomeAdapter(), limit: 80,
    filter: { minLength: 500, maxLength: 20000, requireKeyword: false } },
  { name: "devto", adapter: new DevtoAdapter(), limit: 60,
    filter: { minLength: 300, maxLength: 30000, requireKeyword: true } },
];

async function main() {
  const allStats: IngestStats[] = [];
  console.log(`\n🚀 TechMate 知识库 bootstrap 启动`);
  console.log(`目标：扩展 tech_knowledge collection 至 250+ 条\n`);

  for (const job of JOBS) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📥 [${job.name}] limit=${job.limit}`);
    console.log(`${"─".repeat(60)}`);

    const t0 = Date.now();
    try {
      const articles = await job.adapter.fetch({ limit: job.limit, verbose: false });
      console.log(`  fetched ${articles.length} articles in ${((Date.now() - t0)/1000).toFixed(1)}s`);

      if (articles.length === 0) {
        allStats.push({ source: job.name, fetched: 0, filtered: 0, deduped: 0, persisted: 0, failed: 0 });
        continue;
      }

      const stats = await persistArticles(job.name, articles, {
        filter: job.filter,
        verbose: false,
      });
      console.log(`  → persisted ${stats.persisted}, filtered out ${stats.fetched - stats.filtered}, dup ${stats.filtered - stats.deduped}, failed ${stats.failed}`);
      allStats.push(stats);
    } catch (err: any) {
      console.error(`  ❌ [${job.name}] failed: ${err?.message || err}`);
      allStats.push({ source: job.name, fetched: 0, filtered: 0, deduped: 0, persisted: 0, failed: 1 });
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`📊 汇总`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  source       fetched  filtered  deduped  persisted  failed`);
  let totalPersisted = 0;
  for (const s of allStats) {
    console.log(`  ${s.source.padEnd(12)} ${String(s.fetched).padStart(7)}  ${String(s.filtered).padStart(8)}  ${String(s.deduped).padStart(7)}  ${String(s.persisted).padStart(9)}  ${String(s.failed).padStart(6)}`);
    totalPersisted += s.persisted;
  }
  console.log(`\n  ✅ 总计入库 ${totalPersisted} 条 chunks`);
}

main().catch((err) => {
  console.error("bootstrap failed:", err);
  process.exit(1);
});
