/**
 * CLI 入口
 *
 * 用法：
 *   pnpm --filter @tech-mate/content-ingestion ingest -- --source devto --limit 30
 *   pnpm --filter @tech-mate/content-ingestion ingest -- --source ruanyf --limit 20
 *   pnpm --filter @tech-mate/content-ingestion ingest -- --source weekly --limit 50
 *   pnpm --filter @tech-mate/content-ingestion ingest -- --source awesome --limit 80
 *   pnpm --filter @tech-mate/content-ingestion ingest -- --source devto --limit 30 --dry-run --verbose
 */
import { IContentAdapter } from "./types";
import { DevtoAdapter } from "./adapters/devto-adapter";
import { RuanyfAdapter } from "./adapters/ruanyf-adapter";
import { RuanyfWeeklyAdapter } from "./adapters/ruanyf-weekly-adapter";
import { GithubAwesomeAdapter } from "./adapters/github-awesome-adapter";
import { persistArticles } from "./persister";

function parseArgs(): { source: string; limit: number; dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2);
  let source = "";
  let limit = 30;
  let dryRun = false;
  let verbose = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--source") source = args[++i];
    else if (a === "--limit") limit = parseInt(args[++i] || "30", 10);
    else if (a === "--dry-run") dryRun = true;
    else if (a === "--verbose" || a === "-v") verbose = true;
  }
  return { source, limit, dryRun, verbose };
}

function buildAdapter(source: string): IContentAdapter | null {
  switch (source) {
    case "devto": return new DevtoAdapter();
    case "ruanyf": return new RuanyfAdapter();
    case "weekly": return new RuanyfWeeklyAdapter();
    case "awesome": return new GithubAwesomeAdapter();
    default: return null;
  }
}

async function main() {
  const { source, limit, dryRun, verbose } = parseArgs();
  if (!source) {
    console.error("Usage: ingest --source <devto|ruanyf|weekly|awesome> [--limit N] [--dry-run] [--verbose]");
    process.exit(1);
  }

  const adapter = buildAdapter(source);
  if (!adapter) {
    console.error(`Unknown source: ${source}`);
    process.exit(1);
  }

  console.log(`\n=== Ingest from ${source} (limit=${limit}${dryRun ? ", DRY-RUN" : ""}) ===`);
  const t0 = Date.now();
  const articles = await adapter.fetch({ limit, verbose });
  console.log(`[fetch] got ${articles.length} articles in ${Date.now() - t0}ms`);

  if (articles.length === 0) {
    console.log("[done] nothing to persist");
    return;
  }

  const stats = await persistArticles(source, articles, {
    dryRun,
    verbose,
    filter: source === "awesome"
      ? { minLength: 500, maxLength: 20000, requireKeyword: false } // awesome README 段落更长，且本身就是技术 list
      : source === "weekly"
      ? { minLength: 500, maxLength: 20000, requireKeyword: true }
      : { minLength: 300, maxLength: 30000, requireKeyword: true },
  });

  console.log(`\n[done] source=${source}`);
  console.log(`  fetched   = ${stats.fetched}`);
  console.log(`  filtered  = ${stats.filtered}  (passed filter)`);
  console.log(`  deduped   = ${stats.deduped}   (passed dedup)`);
  console.log(`  persisted = ${stats.persisted}`);
  console.log(`  failed    = ${stats.failed}`);
}

main().catch((err) => {
  console.error("CLI failed:", err);
  process.exit(1);
});
