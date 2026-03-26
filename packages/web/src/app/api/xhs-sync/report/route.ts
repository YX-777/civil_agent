import { NextResponse } from "next/server";
import { getPrismaClient } from "@civil-agent/database";

function parseKeyword(contentRaw: string): string | null {
  try {
    const parsed = JSON.parse(contentRaw);
    const keyword = parsed?._keyword;
    return typeof keyword === "string" && keyword.trim() ? keyword.trim() : null;
  } catch {
    return null;
  }
}

function parseErrorCategory(contentRaw: string): string | null {
  try {
    // 错误分类目前没有单独落表，而是先保存在 content_raw 的扩展字段里，
    // 这里在报表层把它解析出来，供前端做更友好的错误展示。
    const parsed = JSON.parse(contentRaw);
    const category = parsed?._detailErrorCategory;
    return typeof category === "string" && category.trim() ? category.trim() : null;
  } catch {
    return null;
  }
}

function parseReportJson(reportJson: string | null | undefined) {
  if (!reportJson) {
    return {
      detailErrorCount: 0,
      detailErrorBreakdown: {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        login_required: 0,
        invalid_param: 0,
        lookup_miss: 0,
        unknown: 0,
      },
    };
  }

  try {
    // 报表需要兼容历史 run 记录，所以这里全部走兜底数值转换，
    // 避免因为旧 JSON 缺字段而让整个页面报错。
    const parsed = JSON.parse(reportJson);
    return {
      detailErrorCount: Number(parsed?.detailErrorCount ?? 0),
      detailErrorBreakdown: {
        access_denied: Number(parsed?.detailErrorBreakdown?.access_denied ?? 0),
        transient: Number(parsed?.detailErrorBreakdown?.transient ?? 0),
        parse_empty: Number(parsed?.detailErrorBreakdown?.parse_empty ?? 0),
        login_required: Number(parsed?.detailErrorBreakdown?.login_required ?? 0),
        invalid_param: Number(parsed?.detailErrorBreakdown?.invalid_param ?? 0),
        lookup_miss: Number(parsed?.detailErrorBreakdown?.lookup_miss ?? 0),
        unknown: Number(parsed?.detailErrorBreakdown?.unknown ?? 0),
      },
    };
  } catch {
    return {
      detailErrorCount: 0,
      detailErrorBreakdown: {
        access_denied: 0,
        transient: 0,
        parse_empty: 0,
        login_required: 0,
        invalid_param: 0,
        lookup_miss: 0,
        unknown: 0,
      },
    };
  }
}

function buildContentPreview(contentClean: string, maxLength = 220): string {
  // 预览内容统一压成单行摘要，避免表格被长正文撑爆。
  const normalized = contentClean.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

export async function GET() {
  try {
    const prisma = getPrismaClient();

    // 看板首页需要的都是轻聚合信息，这里尽量一次性并行取回，
    // 避免前端为了一个页面多次往返调用。
    const [recentRuns, recentPosts, totalRuns, successRuns, failedRuns, totalPosts, newPosts, detailUnavailablePosts] =
      await Promise.all([
        prisma.xhsSyncRun.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
        prisma.xhsPost.findMany({
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        prisma.xhsSyncRun.count(),
        prisma.xhsSyncRun.count({ where: { status: "success" } }),
        prisma.xhsSyncRun.count({ where: { status: "failed" } }),
        prisma.xhsPost.count(),
        prisma.xhsPost.count({ where: { status: "new" } }),
        prisma.xhsPost.count({ where: { status: "detail_unavailable" } }),
      ]);

    const mappedRuns = recentRuns.map((run) => {
      const parsed = parseReportJson(run.reportJson);
      return {
        id: run.id,
        status: run.status,
        requestedLimit: run.requestedLimit,
        fetchedCount: run.fetchedCount,
        insertedCount: run.insertedCount,
        dedupedPostIdCount: run.dedupedPostIdCount,
        dedupedHashCount: run.dedupedHashCount,
        invalidCount: run.invalidCount,
        failedCount: run.failedCount,
        detailErrorCount: parsed.detailErrorCount,
        detailErrorBreakdown: parsed.detailErrorBreakdown,
        createdAt: run.createdAt.toISOString(),
        endedAt: run.endedAt?.toISOString() ?? null,
      };
    });

    const mappedPosts = recentPosts.map((post) => ({
      postId: post.postId,
      title: post.title,
      authorName: post.authorName,
      keyword: parseKeyword(post.contentRaw),
      status: post.status,
      errorCategory: parseErrorCategory(post.contentRaw),
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      publishTime: post.publishTime?.toISOString() ?? null,
      updatedAt: post.updatedAt.toISOString(),
      sourceUrl: post.sourceUrl,
      contentPreview: buildContentPreview(post.contentClean),
      errorMessage: post.errorMessage,
    }));

    const runTrend = [...mappedRuns]
      .reverse()
      .map((run, index) => ({
        // 趋势图只展示最近几次执行的相对顺序，不依赖精确 run 名称。
        label: `第${index + 1}次`,
        fetchedCount: run.fetchedCount,
        insertedCount: run.insertedCount,
        detailErrorCount: run.detailErrorCount,
        transient: run.detailErrorBreakdown.transient,
        parseEmpty: run.detailErrorBreakdown.parse_empty,
        accessDenied: run.detailErrorBreakdown.access_denied,
        unknown: (run.detailErrorBreakdown.lookup_miss ?? 0) + run.detailErrorBreakdown.unknown,
      }));

    const keywordMap = new Map<
      string,
      { keyword: string; totalPosts: number; availablePosts: number; detailUnavailablePosts: number }
    >();

    for (const post of mappedPosts) {
      const keyword = post.keyword ?? "未识别关键词";
      const current = keywordMap.get(keyword) ?? {
        keyword,
        totalPosts: 0,
        availablePosts: 0,
        detailUnavailablePosts: 0,
      };
      current.totalPosts += 1;
      if (post.status === "new") {
        current.availablePosts += 1;
      }
      if (post.status === "detail_unavailable") {
        current.detailUnavailablePosts += 1;
      }
      keywordMap.set(keyword, current);
    }

    const keywordStats = [...keywordMap.values()].sort((a, b) => b.totalPosts - a.totalPosts);

    return NextResponse.json({
      summary: {
        totalRuns,
        successRuns,
        failedRuns,
        totalPosts,
        newPosts,
        detailUnavailablePosts,
      },
      latestRun: mappedRuns[0] ?? null,
      recentRuns: mappedRuns,
      recentPosts: mappedPosts,
      runTrend,
      keywordStats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load xiaohongshu sync report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
