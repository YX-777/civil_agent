/**
 * 小红书每周同步任务
 * 流程：检查登录 -> 关键词搜索 -> 拉取详情正文 -> 去重入库
 */

import { logger } from "@civil-agent/core";
import { getXiaohongshuMCPClient } from "@civil-agent/mcp-xiaohongshu";
import { getPrismaClient, initializeDatabase, getXhsSyncService } from "@civil-agent/database";

export interface WeeklyXhsSyncJobData {
  limit?: number;
  page?: number;
}

const DEFAULT_KEYWORDS = ["杭州考公", "浙江省考", "杭州事业单位考试"];
const DETAIL_RETRY_DELAYS_MS = [4000, 8000];
const MCP_CALL_INTERVAL_MS = Math.max(0, Number(process.env.XHS_MCP_CALL_INTERVAL_MS ?? 3000));
type DetailFailCategory = "access_denied" | "transient" | "parse_empty" | "unknown";

function isLoggedIn(result: any): boolean {
  const text = typeof result === "string" ? result : JSON.stringify(result);
  if (text.includes("未登录") || text.toLowerCase().includes("not logged in")) {
    return false;
  }
  if (text.includes("已登录") || text.toLowerCase().includes("logged in")) {
    return true;
  }
  return false;
}

function extractFeeds(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.feeds)) return result.data.feeds;
  if (Array.isArray(result?.feeds)) return result.feeds;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function collectTextByKeys(input: any, keys: string[], out: string[], depth = 0): void {
  if (input == null || depth > 5) return;

  if (typeof input === "string") return;

  if (Array.isArray(input)) {
    for (const item of input) {
      collectTextByKeys(item, keys, out, depth + 1);
    }
    return;
  }

  if (typeof input !== "object") return;

  for (const [k, v] of Object.entries(input)) {
    const lk = k.toLowerCase();
    if (typeof v === "string" && keys.some((key) => lk.includes(key)) && v.trim().length > 0) {
      out.push(v.trim());
    } else {
      collectTextByKeys(v, keys, out, depth + 1);
    }
  }
}

function dedupeStrings(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.replace(/\s+/g, " ").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

function extractDetailContent(detail: any): string {
  const lines: string[] = [];

  const commonPaths = [
    detail?.noteCard?.desc,
    detail?.noteCard?.description,
    detail?.note_card?.desc,
    detail?.data?.noteCard?.desc,
    detail?.data?.note?.desc,
    detail?.note?.desc,
    detail?.desc,
    detail?.content,
  ];

  for (const p of commonPaths) {
    if (typeof p === "string" && p.trim().length > 0) {
      lines.push(p.trim());
    }
  }

  collectTextByKeys(detail, ["desc", "content", "text"], lines);
  const merged = dedupeStrings(lines).join("\n");
  return merged.slice(0, 6000);
}

function isDetailUnavailableText(text: string): boolean {
  if (!text) return false;
  return (
    text.includes("Sorry, This Page Isn't Available Right Now") ||
    text.includes("请打开小红书App扫码查看") ||
    text.includes("笔记不可访问")
  );
}

function getCandidateId(feed: any): string | undefined {
  return feed?.id ?? feed?.postId ?? feed?.post_id ?? feed?.noteCard?.noteId ?? feed?.noteCard?.id;
}

function getCandidateToken(feed: any): string | undefined {
  return feed?.xsecToken ?? feed?.xsec_token ?? feed?.noteCard?.xsecToken ?? feed?.noteCard?.xsec_token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMcpInvoker(client: ReturnType<typeof getXiaohongshuMCPClient>) {
  let lastCallAt = 0;

  return async function invokeMcp<T>(action: string, fn: () => Promise<T>): Promise<T> {
    if (MCP_CALL_INTERVAL_MS > 0 && lastCallAt > 0) {
      const elapsed = Date.now() - lastCallAt;
      const waitMs = MCP_CALL_INTERVAL_MS - elapsed;
      if (waitMs > 0) {
        logger.info("MCP call throttled", {
          action,
          waitMs,
          intervalMs: MCP_CALL_INTERVAL_MS,
        });
        await sleep(waitMs);
      }
    }

    try {
      return await fn();
    } finally {
      lastCallAt = Date.now();
    }
  };
}

function isRetryableDetailError(message: string): boolean {
  const text = (message || "").toLowerCase();
  return (
    text.includes("sorry, this page isn't available right now") ||
    text.includes("请打开小红书app扫码查看") ||
    text.includes("笔记不可访问") ||
    text.includes("timeout") ||
    text.includes("net::err") ||
    text.includes("navigation")
  );
}

function classifyDetailError(message: string): DetailFailCategory {
  const text = (message || "").toLowerCase();

  if (
    text.includes("detail page unavailable from get_feed_detail") ||
    text.includes("sorry, this page isn't available right now") ||
    text.includes("请打开小红书app扫码查看") ||
    text.includes("笔记不可访问")
  ) {
    return "access_denied";
  }

  if (text.includes("timeout") || text.includes("net::err") || text.includes("navigation") || text.includes("fetch failed")) {
    return "transient";
  }

  if (text.includes("empty") || text.includes("inaccessible from get_feed_detail")) {
    return "parse_empty";
  }

  return "unknown";
}

async function fetchRetryCandidates(limit: number): Promise<any[]> {
  const prisma = getPrismaClient() as any;
  const rows = await prisma.xhsPost.findMany({
    where: {
      status: "detail_unavailable",
      xsecToken: {
        not: null,
      },
    },
    orderBy: {
      updatedAt: "asc",
    },
    take: limit,
  });
  const feeds: any[] = [];

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.contentRaw || "{}");
      feeds.push({
        ...parsed,
        id: parsed?.id ?? row.postId,
        xsecToken: parsed?.xsecToken ?? row.xsecToken,
        _retryFromHistory: true,
      });
    } catch {
      feeds.push({
        id: row.postId,
        postId: row.postId,
        xsecToken: row.xsecToken,
        title: row.title,
        authorName: row.authorName,
        _retryFromHistory: true,
      });
    }
  }

  return feeds;
}

async function fetchKeywordCandidates(
  page: number,
  limit: number,
  client: ReturnType<typeof getXiaohongshuMCPClient>,
  invokeMcp: <T>(action: string, fn: () => Promise<T>) => Promise<T>
): Promise<any[]> {
  const targetPerKeyword = Math.max(3, Math.ceil((limit * 2) / DEFAULT_KEYWORDS.length));
  const collected: any[] = [];
  const seenIds = new Set<string>();
  let successKeywordCount = 0;

  for (const keyword of DEFAULT_KEYWORDS) {
    let feeds: any[] = [];
    try {
      const searchResult = await invokeMcp("search_feeds", () =>
        client.searchFeeds(keyword, {
          sort_by: "综合",
          publish_time: "一周内",
          note_type: "不限",
        })
      );
      feeds = extractFeeds(searchResult).slice(0, targetPerKeyword);
      successKeywordCount += 1;
    } catch (error) {
      logger.warn("search_feeds failed for keyword, skip and continue", {
        keyword,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const feed of feeds) {
      const id = getCandidateId(feed);
      if (!id) continue;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      collected.push({
        ...feed,
        _keyword: keyword,
      });
    }
  }

  if (successKeywordCount === 0 || collected.length === 0) {
    throw new Error("All keyword searches failed or returned empty results");
  }

  return collected.slice(0, limit);
}

async function enrichWithDetailContent(
  feeds: any[],
  client: ReturnType<typeof getXiaohongshuMCPClient>,
  invokeMcp: <T>(action: string, fn: () => Promise<T>) => Promise<T>
): Promise<any[]> {
  const enriched: any[] = [];

  for (const feed of feeds) {
    const feedId = getCandidateId(feed);
    const xsecToken = getCandidateToken(feed);

    if (!feedId || !xsecToken) {
      enriched.push(feed);
      continue;
    }

    let lastError = "";
    let lastErrorCategory: DetailFailCategory = "unknown";
    let resolved = false;

    for (let attempt = 0; attempt <= DETAIL_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const detail = await invokeMcp("get_feed_detail", () => client.getFeedDetail(feedId, xsecToken));
        const detailContent = extractDetailContent(detail);
        const unavailable = isDetailUnavailableText(detailContent);

        if (!unavailable && detailContent.trim().length > 0) {
          enriched.push({
            ...feed,
            _detailRaw: detail,
            _detailText: detailContent,
          });
          resolved = true;
          break;
        }

        lastError = unavailable
          ? "detail page unavailable from get_feed_detail"
          : "detail content empty or inaccessible from get_feed_detail";
        lastErrorCategory = classifyDetailError(lastError);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastErrorCategory = classifyDetailError(lastError);
      }

      const retryable = isRetryableDetailError(lastError);
      if (attempt < DETAIL_RETRY_DELAYS_MS.length && retryable) {
        logger.warn("Fetch feed detail failed, will retry", {
          feedId,
          attempt: attempt + 1,
          delayMs: DETAIL_RETRY_DELAYS_MS[attempt],
          error: lastError,
        });
        await sleep(DETAIL_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      break;
    }

    if (!resolved) {
      logger.warn("Failed to fetch feed detail after retries, fallback to metadata-only", {
        feedId,
        error: lastError,
      });
      enriched.push({
        ...feed,
        _detailError: lastError || "detail content unavailable after retries",
        _detailErrorCategory: lastErrorCategory,
      });
    }
  }

  return enriched;
}

export async function weeklyXiaohongshuSyncJob(data: WeeklyXhsSyncJobData = {}): Promise<{
  runId: string;
  fetchedCount: number;
  insertedCount: number;
  dedupedPostIdCount: number;
  dedupedHashCount: number;
  invalidCount: number;
  failedCount: number;
}> {
  const limit = Math.max(1, Math.min(data.limit ?? 50, 200));
  const page = Math.max(1, data.page ?? 1);

  logger.info("Weekly xiaohongshu sync job started", { limit, page });

  await initializeDatabase({ skipVectorDB: true });
  const xhsSyncService = getXhsSyncService();
  const client = getXiaohongshuMCPClient();
  const invokeMcp = createMcpInvoker(client);

  try {
    const loginStatus = await invokeMcp("check_login_status", () => client.checkLoginStatus());
    if (!isLoggedIn(loginStatus)) {
      throw new Error(`Xiaohongshu MCP is not logged in: ${JSON.stringify(loginStatus)}`);
    }

    const retryCandidates = await fetchRetryCandidates(limit);
    const searchCandidates = await fetchKeywordCandidates(page, limit, client, invokeMcp);
    const candidates = [...retryCandidates, ...searchCandidates]
      .filter((feed, index, arr) => {
        const id = getCandidateId(feed);
        if (!id) return false;
        return arr.findIndex((x) => getCandidateId(x) === id) === index;
      })
      .slice(0, limit);

    logger.info("Prepared xhs candidates", {
      limit,
      retryCandidateCount: retryCandidates.length,
      searchCandidateCount: searchCandidates.length,
      finalCandidateCount: candidates.length,
    });

    const feeds = await enrichWithDetailContent(candidates, client, invokeMcp);
    const detailErrorBreakdown = feeds.reduce(
      (acc, feed) => {
        if (!feed?._detailError) return acc;
        const category = ((feed?._detailErrorCategory as DetailFailCategory) ||
          classifyDetailError(String(feed?._detailError ?? ""))) as DetailFailCategory;
        acc[category] += 1;
        return acc;
      },
      {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        unknown: 0,
      } as Record<DetailFailCategory, number>
    );

    const { runId, stats } = await xhsSyncService.ingestFeeds("weekly-xiaohongshu-sync", feeds, limit);

    logger.info("Weekly xiaohongshu sync job finished", {
      runId,
      ...stats,
      detailErrorBreakdown,
    });

    return {
      runId,
      ...stats,
    };
  } finally {
    await client.close();
  }
}
