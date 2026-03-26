import { logger } from "@civil-agent/core";
import { getXiaohongshuMCPClient } from "@civil-agent/mcp-xiaohongshu";
import { getXhsPostRepository, getXhsSyncService } from "@civil-agent/database";
import {
  buildDetailRefreshQueries,
  classifyDetailError,
  extractDetailContent,
  isDetailUnavailableText,
  isRetryableDetailError,
  selectRefreshFeedCandidate,
  type DetailFailCategory,
} from "./xiaohongshu-detail";

const DETAIL_RETRY_DELAYS_MS = [4000, 8000];
// 所有 MCP 调用共用这一层节流，默认 3 秒，优先避免“重试太快反而更容易被风控”。
const MCP_CALL_INTERVAL_MS = Math.max(0, Number(process.env.XHS_MCP_CALL_INTERVAL_MS ?? 3000));

function getCandidateId(feed: any): string | undefined {
  return feed?.id ?? feed?.postId ?? feed?.post_id ?? feed?.noteCard?.noteId ?? feed?.noteCard?.id;
}

function getCandidateToken(feed: any): string | undefined {
  return feed?.xsecToken ?? feed?.xsec_token ?? feed?.noteCard?.xsecToken ?? feed?.noteCard?.xsec_token;
}

function extractFeeds(result: any): any[] {
  // searchFeeds 的返回结构在不同包装层下不完全一致，这里统一拍平成 feeds 数组。
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.feeds)) return result.data.feeds;
  if (Array.isArray(result?.feeds)) return result.feeds;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLoggedIn(result: any): boolean {
  // 登录检查兼容字符串和对象返回，尽量只做“已登录/未登录”二值判断，
  // 避免把底层返回结构耦合进上层重试流程。
  const text = typeof result === "string" ? result : JSON.stringify(result);
  if (text.includes("未登录") || text.toLowerCase().includes("not logged in")) {
    return false;
  }
  if (text.includes("已登录") || text.toLowerCase().includes("logged in")) {
    return true;
  }
  return false;
}

function createMcpInvoker(client: ReturnType<typeof getXiaohongshuMCPClient>) {
  let lastCallAt = 0;

  return async function invokeMcp<T>(action: string, fn: () => Promise<T>): Promise<T> {
    // 同一轮手动重试里，所有 MCP 请求都走这个节流器，避免 search/detail/check 登录连续打太快。
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

export async function retrySingleXhsPost(postId: string): Promise<{
  ok: boolean;
  status: "recovered" | "still_unavailable";
  category: DetailFailCategory | null;
  message: string;
}> {
  const repository = getXhsPostRepository();
  const syncService = getXhsSyncService();
  const row = await repository.findByPostId(postId);

  if (!row) {
    throw new Error(`xhs post not found: ${postId}`);
  }

  if (!row.xsecToken) {
    throw new Error(`xhs post missing xsecToken: ${postId}`);
  }

  let baseFeed: any;
  try {
    baseFeed = JSON.parse(row.contentRaw || "{}");
  } catch {
    baseFeed = {};
  }

  // 数据库里失败样本的 contentRaw 往往还保留着上一次抓取上下文，
  // 这里先尽量恢复成一个“可再次取详情”的 feed 结构。
  baseFeed = {
    ...baseFeed,
    id: getCandidateId(baseFeed) ?? row.postId,
    postId: row.postId,
    xsecToken: getCandidateToken(baseFeed) ?? row.xsecToken,
    title: row.title,
  };

  const client = getXiaohongshuMCPClient();
  const invokeMcp = createMcpInvoker(client);

  try {
    const loginStatus = await invokeMcp("check_login_status", () => client.checkLoginStatus());
    if (!isLoggedIn(loginStatus)) {
      throw new Error(`Xiaohongshu MCP is not logged in: ${JSON.stringify(loginStatus)}`);
    }

    let currentFeed = baseFeed;
    let lastError = "";
    let lastCategory: DetailFailCategory = "unknown";

    for (let attempt = 0; attempt <= DETAIL_RETRY_DELAYS_MS.length; attempt++) {
      // 重试顺序是：直接取详情 -> 若 lookup_miss 则回搜补 token -> 对可重试错误做有限退避。
      try {
        const feedId = getCandidateId(currentFeed);
        const xsecToken = getCandidateToken(currentFeed);
        if (!feedId || !xsecToken) {
          lastError = "feed_id or xsec_token missing before get_feed_detail";
          lastCategory = classifyDetailError(lastError);
          break;
        }

        const detail = await invokeMcp("get_feed_detail", () => client.getFeedDetail(feedId, xsecToken));
        const detailContent = extractDetailContent(detail);
        const unavailable = isDetailUnavailableText(detailContent);

        if (!unavailable && detailContent.trim()) {
          const mergedFeed = {
            ...currentFeed,
            _detailRaw: detail,
            _detailText: detailContent,
          };
          const normalized = syncService.normalizeFeedToPostInput(mergedFeed);
          if (!normalized) {
            throw new Error(`normalized feed is empty after retry: ${postId}`);
          }

          await repository.upsertByDedupRules(normalized);
          const updatedRecord = await repository.findByPostId(postId);
          // 这里必须重新查库确认“原始这条 postId 自己真的变成 new”。
          // 之前就踩过一次坑：相似标题帖子被误当成恢复成功，前端因此出现了假成功提示。
          if (!updatedRecord || updatedRecord.status !== "new") {
            throw new Error(`post ${postId} was not updated to new after retry`);
          }
          return {
            ok: true,
            status: "recovered",
            category: null,
            message: "detail recovered and stored successfully",
          };
        }

        lastError = unavailable
          ? "detail page unavailable from get_feed_detail"
          : "detail content empty or inaccessible from get_feed_detail";
        lastCategory = classifyDetailError(lastError);
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastCategory = classifyDetailError(lastError);
      }

      if (lastCategory === "lookup_miss") {
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
            // 这里必须继续校验 matchedFeed 的 id 与原帖一致，
            // 否则仅凭相似标题会把别的帖子误并到当前失败样本上。
            if (matchedFeed && getCandidateId(matchedFeed) === postId) {
              currentFeed = {
                ...currentFeed,
                xsecToken: getCandidateToken(matchedFeed) ?? getCandidateToken(currentFeed),
                noteCard: matchedFeed.noteCard ?? currentFeed.noteCard,
                note_card: matchedFeed.note_card ?? currentFeed.note_card,
                user: matchedFeed.user ?? currentFeed.user,
                interactInfo: matchedFeed.interactInfo ?? currentFeed.interactInfo,
                _detailRefreshQuery: query,
              };
              lastError = "";
              break;
            }
          } catch (refreshError) {
            logger.warn("Refresh search for single retry failed", {
              postId,
              query,
              error: refreshError instanceof Error ? refreshError.message : String(refreshError),
            });
          }
        }
      }

      if (attempt < DETAIL_RETRY_DELAYS_MS.length && isRetryableDetailError(lastError)) {
        await sleep(DETAIL_RETRY_DELAYS_MS[attempt]);
        continue;
      }

      break;
    }

    // 失败时也要把最后一次错误和分类写回库，方便看板和后续诊断继续使用这条样本。
    const fallbackFeed = {
      ...currentFeed,
      _detailError: lastError || "detail content unavailable after retry",
      _detailErrorCategory: lastCategory,
    };
    const normalized = syncService.normalizeFeedToPostInput(fallbackFeed);
    if (normalized) {
      await repository.upsertByDedupRules(normalized);
    }

    return {
      ok: true,
      status: "still_unavailable",
      category: lastCategory,
      message: lastError || "detail content unavailable after retry",
    };
  } finally {
    await client.close();
  }
}
