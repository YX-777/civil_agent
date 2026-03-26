import crypto from "crypto";
import { XhsPostRepository, type UpsertXhsPostInput } from "../repositories/xhs-post.repository";
import { XhsSyncRunRepository } from "../repositories/xhs-sync-run.repository";

export interface XhsIngestStats {
  fetchedCount: number;
  insertedCount: number;
  dedupedPostIdCount: number;
  dedupedHashCount: number;
  invalidCount: number;
  failedCount: number;
}

export interface XhsIngestReport extends XhsIngestStats {
  [key: string]: any;
}

function asNumber(value: any, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    return value > 10_000_000_000 ? new Date(value) : new Date(value * 1000);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildContentHash(content: string): string {
  // 内容哈希用于“不同 postId 但正文相同”的去重，避免重复入库近乎相同的搬运内容。
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getFirst<T>(...values: T[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
}

function classifyDetailError(
  message: string
): "access_denied" | "transient" | "parse_empty" | "login_required" | "invalid_param" | "unknown" {
  // 这里保留一份数据库侧的轻量分类兜底，避免 ingest 时过度依赖调用方一定传好 _detailErrorCategory。
  const text = (message || "").toLowerCase();
  if (
    text.includes("未登录") ||
    text.includes("not logged in") ||
    text.includes("login required") ||
    text.includes("xiaohongshu mcp is not logged in")
  ) {
    return "login_required";
  }
  if (
    text.includes("missing required") ||
    text.includes("feed_id") ||
    text.includes("xsec_token") ||
    text.includes("invalid argument") ||
    text.includes("bad request")
  ) {
    return "invalid_param";
  }
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

export class XhsSyncService {
  constructor(
    private xhsPostRepository: XhsPostRepository,
    private xhsSyncRunRepository: XhsSyncRunRepository
  ) {}

  normalizeFeedToPostInput(feed: any): UpsertXhsPostInput | null {
    // 这里的职责是把“搜索结果 / 详情结果 / 重试结果 / 历史失败样本”
    // 统一折叠成同一种数据库入参，尽量让上游少关心 feed 原始结构差异。
    const note = feed?.noteCard ?? feed?.note_card ?? feed;
    const user = note?.user ?? feed?.user ?? {};
    const interact = note?.interactInfo ?? note?.interact_info ?? feed?.interactInfo ?? {};

    const postId = getFirst(
      feed?.id,
      feed?.postId,
      feed?.post_id,
      note?.noteId,
      note?.note_id,
      note?.id
    ) as string | undefined;

    if (!postId) {
      return null;
    }

    const xsecToken = getFirst(feed?.xsecToken, feed?.xsec_token, note?.xsecToken, note?.xsec_token) as
      | string
      | undefined;
    const title = (getFirst(note?.displayTitle, note?.display_title, note?.title) as string | undefined) ?? "无标题";
    const desc = (getFirst(note?.desc, note?.description, feed?.desc, feed?.description) as string | undefined) ?? "";
    const detailText = (getFirst(feed?._detailText, feed?.detailText, feed?.contentText) as string | undefined) ?? "";
    const contentClean = normalizeText(`${title}\n${detailText || desc}`);
    const contentRaw = JSON.stringify(feed);
    const contentHash = buildContentHash(contentClean);
    const authorName = getFirst(user?.nickname, user?.nickName, note?.authorName, feed?.authorName) as
      | string
      | undefined;
    const authorId = getFirst(user?.userId, user?.user_id, note?.authorId, feed?.authorId) as string | undefined;
    const publishTime = toDate(getFirst(note?.time, note?.publishTime, feed?.publishTime, feed?.time));

    const likeCount = asNumber(getFirst(interact?.likedCount, interact?.liked_count, note?.likeCount, feed?.likeCount));
    const commentCount = asNumber(
      getFirst(interact?.commentCount, interact?.comment_count, note?.commentCount, feed?.commentCount)
    );
    const collectCount = asNumber(
      getFirst(interact?.collectedCount, interact?.collected_count, note?.collectCount, feed?.collectCount)
    );
    const shareCount = asNumber(
      getFirst(interact?.sharedCount, interact?.shared_count, note?.shareCount, feed?.shareCount)
    );

    const tags = Array.isArray(note?.tagList)
      ? JSON.stringify(note.tagList)
      : Array.isArray(feed?.tags)
      ? JSON.stringify(feed.tags)
      : undefined;

    const sourceUrl =
      (getFirst(feed?.url, feed?.noteUrl, note?.url) as string | undefined) ??
      (xsecToken ? `https://www.xiaohongshu.com/explore/${postId}?xsec_token=${xsecToken}` : undefined);
    const detailError = getFirst(feed?._detailError, feed?.detailError) as string | undefined;
    // 只要当前 feed 明确带了详情错误，就落成 detail_unavailable，
    // 这样看板、重试、失败补偿任务都能围绕同一状态工作。
    const status = detailError ? "detail_unavailable" : "new";

    return {
      postId,
      xsecToken,
      title,
      contentRaw,
      contentClean,
      contentHash,
      authorId,
      authorName,
      publishTime,
      likeCount,
      commentCount,
      collectCount,
      shareCount,
      sourceUrl,
      tags,
      status,
      errorMessage: detailError,
    };
  }

  async ingestFeeds(jobName: string, feeds: any[], requestedLimit: number): Promise<{ runId: string; stats: XhsIngestStats }> {
    const run = await this.xhsSyncRunRepository.createRun(jobName, requestedLimit);

    const stats: XhsIngestStats = {
      fetchedCount: feeds.length,
      insertedCount: 0,
      dedupedPostIdCount: 0,
      dedupedHashCount: 0,
      invalidCount: 0,
      failedCount: 0,
    };

    try {
      for (const feed of feeds) {
        const normalized = this.normalizeFeedToPostInput(feed);
        if (!normalized) {
          stats.invalidCount += 1;
          continue;
        }

        try {
          // Repository 内部会按 postId / contentHash 做去重，这里只负责累计结果统计。
          const result = await this.xhsPostRepository.upsertByDedupRules(normalized);
          if (result.action === "inserted") {
            stats.insertedCount += 1;
          } else if (result.action === "deduped_post_id") {
            stats.dedupedPostIdCount += 1;
          } else if (result.action === "deduped_hash") {
            stats.dedupedHashCount += 1;
          }
        } catch {
          stats.failedCount += 1;
        }
      }

      const detailErrorBreakdown = {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        login_required: 0,
        invalid_param: 0,
        unknown: 0,
      };
      let detailErrorCount = 0;

      for (const feed of feeds) {
        if (!feed?._detailError) continue;
        detailErrorCount += 1;
        // run 级报表从原始 feed 再扫一遍错误分类，保证“入库成功/去重成功”之外，
        // 仍然能知道这一轮抓取质量到底如何。
        const category = String(feed?._detailErrorCategory ?? classifyDetailError(String(feed?._detailError ?? "")));
        if (
          category === "access_denied" ||
          category === "transient" ||
          category === "parse_empty" ||
          category === "login_required" ||
          category === "invalid_param"
        ) {
          detailErrorBreakdown[category] += 1;
        } else {
          detailErrorBreakdown.unknown += 1;
        }
      }

      const report: XhsIngestReport = {
        ...stats,
        detailErrorCount,
        detailErrorBreakdown,
      };

      // 即使是成功 run，也要把 report_json 写完整，前端看板和历史统计都依赖这里。
      await this.xhsSyncRunRepository.finishRunSuccess(run.id, {
        ...stats,
        reportJson: JSON.stringify(report),
      });

      return { runId: run.id, stats };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const detailErrorBreakdown = {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        login_required: 0,
        invalid_param: 0,
        unknown: 0,
      };
      let detailErrorCount = 0;

      for (const feed of feeds) {
        if (!feed?._detailError) continue;
        detailErrorCount += 1;
        const category = String(feed?._detailErrorCategory ?? classifyDetailError(String(feed?._detailError ?? "")));
        if (
          category === "access_denied" ||
          category === "transient" ||
          category === "parse_empty" ||
          category === "login_required" ||
          category === "invalid_param"
        ) {
          detailErrorBreakdown[category] += 1;
        } else {
          detailErrorBreakdown.unknown += 1;
        }
      }

      const report: XhsIngestReport = {
        ...stats,
        detailErrorCount,
        detailErrorBreakdown,
      };
      // 失败 run 也要尽量留下完整 report，避免页面上只能看到“失败”却看不到失败分布。
      await this.xhsSyncRunRepository.finishRunFailed(run.id, msg, {
        ...stats,
        reportJson: JSON.stringify(report),
      });
      throw error;
    }
  }
}
