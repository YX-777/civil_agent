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
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getFirst<T>(...values: T[]): T | undefined {
  return values.find((v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
}

function classifyDetailError(message: string): "access_denied" | "transient" | "parse_empty" | "unknown" {
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

export class XhsSyncService {
  constructor(
    private xhsPostRepository: XhsPostRepository,
    private xhsSyncRunRepository: XhsSyncRunRepository
  ) {}

  normalizeFeedToPostInput(feed: any): UpsertXhsPostInput | null {
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
        unknown: 0,
      };
      let detailErrorCount = 0;

      for (const feed of feeds) {
        if (!feed?._detailError) continue;
        detailErrorCount += 1;
        const category = String(feed?._detailErrorCategory ?? classifyDetailError(String(feed?._detailError ?? "")));
        if (category === "access_denied" || category === "transient" || category === "parse_empty") {
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
        unknown: 0,
      };
      let detailErrorCount = 0;

      for (const feed of feeds) {
        if (!feed?._detailError) continue;
        detailErrorCount += 1;
        const category = String(feed?._detailErrorCategory ?? classifyDetailError(String(feed?._detailError ?? "")));
        if (category === "access_denied" || category === "transient" || category === "parse_empty") {
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
      await this.xhsSyncRunRepository.finishRunFailed(run.id, msg, {
        ...stats,
        reportJson: JSON.stringify(report),
      });
      throw error;
    }
  }
}
