/**
 * 小红书每周同步任务
 * 流程：检查登录 -> 关键词搜索 -> 拉取详情正文 -> 去重入库
 */

import { logger } from "@civil-agent/core";
import { getXiaohongshuMCPClient } from "@civil-agent/mcp-xiaohongshu";
import { getPrismaClient, initializeDatabase, getXhsSyncService } from "@civil-agent/database";
import {
  buildDetailRefreshQueries,
  classifyDetailError,
  extractDetailContent,
  isDetailUnavailableText,
  isRetryableDetailError,
  selectRefreshFeedCandidate,
  type DetailFailCategory,
} from "./xiaohongshu-detail";

export interface WeeklyXhsSyncJobData {
  limit?: number;
  page?: number;
}

const DEFAULT_KEYWORDS = ["杭州考公", "浙江省考", "杭州事业单位考试"];
const DETAIL_RETRY_DELAYS_MS = [4000, 8000];
// 整个同步任务共用一套 MCP 调用节流，尽量把风控风险收敛在任务层。
const MCP_CALL_INTERVAL_MS = Math.max(0, Number(process.env.XHS_MCP_CALL_INTERVAL_MS ?? 3000));

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
  // searchFeeds 返回结构有多种包装形式，这里统一拍平成 feed 数组给后续流程使用。
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.feeds)) return result.data.feeds;
  if (Array.isArray(result?.feeds)) return result.feeds;
  if (Array.isArray(result?.data)) return result.data;
  return [];
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
    // 统一从这里做节流，避免关键词搜索、详情抓取、回搜补救之间互相打满频率。
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

async function fetchRetryCandidates(limit: number): Promise<any[]> {
  const prisma = getPrismaClient() as any;
  // 每轮同步都会顺手把历史 detail_unavailable 样本再带一遍，
  // 这样不需要额外单独跑一个“失败补偿任务”也能持续尝试恢复。
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
  // 为了兼顾“覆盖多个关键词”和“单轮抓取量可控”，这里按关键词平均切分候选配额。
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
      // 这里把关键词写回 feed，后续入库和看板都能知道这条内容最初是由哪个词命中的。
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
    let currentFeed = feed;

    for (let attempt = 0; attempt <= DETAIL_RETRY_DELAYS_MS.length; attempt++) {
      // 每条候选的详情抓取逻辑是：
      // 直接取详情 -> 分类错误 -> lookup_miss 时回搜补 token -> 对可重试错误做有限退避。
      try {
        const currentFeedId = getCandidateId(currentFeed);
        const currentToken = getCandidateToken(currentFeed);
        if (!currentFeedId || !currentToken) {
          lastError = "feed_id or xsec_token missing before get_feed_detail";
          lastErrorCategory = classifyDetailError(lastError);
          break;
        }

        const detail = await invokeMcp("get_feed_detail", () => client.getFeedDetail(currentFeedId, currentToken));
        const detailContent = extractDetailContent(detail);
        const unavailable = isDetailUnavailableText(detailContent);

        if (!unavailable && detailContent.trim().length > 0) {
          enriched.push({
            ...currentFeed,
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

      // 某些搜索结果里的详情映射会失效，此时先基于标题/关键词重新搜一轮再重试详情。
      if (lastErrorCategory === "lookup_miss") {
        const refreshQueries = buildDetailRefreshQueries(currentFeed);
        for (const query of refreshQueries) {
          try {
            const searchResult = await invokeMcp("search_feeds_refresh", () =>
              client.searchFeeds(query, {
                sort_by: "综合",
                publish_time: "一周内",
                note_type: "不限",
              })
            );
            const matchedFeed = selectRefreshFeedCandidate(currentFeed, extractFeeds(searchResult));
            if (matchedFeed) {
              // 批量同步这里允许用匹配到的新 feed 覆盖 currentFeed，
              // 因为目标是“尽可能拿回正文”；而单条手动重试则会更严格校验原始 postId。
              currentFeed = {
                ...currentFeed,
                ...matchedFeed,
                _detailRefreshQuery: query,
              };
              lastError = "";
              break;
            }
          } catch (refreshError) {
            logger.warn("Refresh search for feed detail failed", {
              feedId,
              query,
              error: refreshError instanceof Error ? refreshError.message : String(refreshError),
            });
          }
        }
      }

      const retryable = isRetryableDetailError(lastError);
      if (attempt < DETAIL_RETRY_DELAYS_MS.length && retryable) {
        logger.warn("Fetch feed detail failed, will retry", {
          feedId: getCandidateId(currentFeed) ?? feedId,
          attempt: attempt + 1,
          delayMs: DETAIL_RETRY_DELAYS_MS[attempt],
          error: lastError,
          category: lastErrorCategory,
        });
        await sleep(DETAIL_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      break;
    }

    if (!resolved) {
      logger.warn("Failed to fetch feed detail after retries, fallback to metadata-only", {
        feedId: getCandidateId(currentFeed) ?? feedId,
        error: lastError,
      });
      enriched.push({
        ...currentFeed,
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

    // 一轮同步同时吃两类输入：
    // 1. 历史失败样本补偿
    // 2. 当前关键词搜索新增候选
    const retryCandidates = await fetchRetryCandidates(limit);
    const searchCandidates = await fetchKeywordCandidates(page, limit, client, invokeMcp);
    const candidates = [...retryCandidates, ...searchCandidates]
      .filter((feed, index, arr) => {
        const id = getCandidateId(feed);
        if (!id) return false;
        // 先按 postId 去重，避免同一轮里历史失败样本和新搜索结果重复入队。
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
        // 这里的 breakdown 主要给看板和日志使用，帮助判断失败是不是集中在某一类问题上。
        const category = ((feed?._detailErrorCategory as DetailFailCategory) ||
          classifyDetailError(String(feed?._detailError ?? ""))) as DetailFailCategory;
        if (acc[category] !== undefined) {
          acc[category] += 1;
        } else {
          acc.unknown += 1;
        }
        return acc;
      },
      {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        login_required: 0,
        invalid_param: 0,
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
