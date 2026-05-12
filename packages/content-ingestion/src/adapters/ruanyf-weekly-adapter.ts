import { Article, FetchOptions, IContentAdapter } from "../types";

/**
 * ruanyf/weekly GitHub 仓库 adapter
 *
 * 实现：
 * - 已知周刊期号是顺序递增的（issue-1.md, issue-2.md, ..., 当前最新 ~395）
 * - 跳过 GitHub Contents API（国内 DNS 易污染），直接通过 raw.githubusercontent.com CDN 枚举
 * - 从用户配置的"最新期号"倒推到 max-N 期
 *
 * 比 git clone / GitHub API 稳得多 —— 国内只有 raw CDN 是稳的。
 */

// jsdelivr CDN：国内稳定，raw.githubusercontent.com 常抽风的兜底
const RAW_BASE = "https://cdn.jsdelivr.net/gh/ruanyf/weekly@master/docs";
// 当前最新期号上限（每年涨 ~52 期，2026 年估算）。404 失败时自动跳过
const LATEST_ISSUE_NUMBER = 400;

async function fetchTextOrNull(url: string, timeoutMs = 20000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "TechMate-Ingestion/1.0" },
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractTitle(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class RuanyfWeeklyAdapter implements IContentAdapter {
  readonly source = "ruanyf-weekly";

  async fetch(options: FetchOptions = {}): Promise<Article[]> {
    const limit = options.limit ?? 50;
    const verbose = options.verbose ?? false;

    if (verbose) console.log(`[weekly] enumerate issue ${LATEST_ISSUE_NUMBER} down, target=${limit}`);

    const articles: Article[] = [];
    let consecutiveNotFound = 0;
    for (let n = LATEST_ISSUE_NUMBER; n > 0 && articles.length < limit; n--) {
      // 连续 10 个 404 就退出 — 说明已经低于最早期号
      if (consecutiveNotFound >= 10) {
        if (verbose) console.log(`[weekly] stop: ${consecutiveNotFound} consecutive 404s`);
        break;
      }
      const fileName = `issue-${n}.md`;
      const rawUrl = `${RAW_BASE}/${fileName}`;
      const md = await fetchTextOrNull(rawUrl);
      if (!md || md.length < 500) {
        consecutiveNotFound++;
        if (verbose && !md) console.log(`[weekly] miss issue-${n} (not found)`);
        continue;
      }
      consecutiveNotFound = 0;

      const title = extractTitle(md, `周刊第 ${n} 期`);
      articles.push({
        title,
        content: md,
        source: this.source,
        sourceUrl: `https://github.com/ruanyf/weekly/blob/master/docs/${fileName}`,
        category: "general",
        author: "阮一峰",
      });
      if (verbose) console.log(`[weekly] +${title.slice(0, 50)} (${md.length} chars)`);
      await sleep(120);
    }

    return articles;
  }
}
