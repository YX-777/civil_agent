import type { XhsPost } from "@prisma/client";
import { BaseRepository } from "./base.repository";

export interface UpsertXhsPostInput {
  postId: string;
  xsecToken?: string;
  title: string;
  contentRaw: string;
  contentClean: string;
  contentHash: string;
  authorId?: string;
  authorName?: string;
  publishTime?: Date;
  likeCount?: number;
  commentCount?: number;
  collectCount?: number;
  shareCount?: number;
  sourceUrl?: string;
  tags?: string;
  status?: string;
  errorMessage?: string;
}

export type UpsertXhsPostResult =
  | { action: "inserted"; record: XhsPost }
  | { action: "deduped_post_id"; record: XhsPost }
  | { action: "deduped_hash"; record: XhsPost };

export class XhsPostRepository extends BaseRepository<XhsPost> {
  constructor(prisma: any) {
    super(prisma, "xhsPost");
  }

  async findByPostId(postId: string): Promise<XhsPost | null> {
    return this.prisma.xhsPost.findUnique({
      where: { postId },
    });
  }

  async findByContentHash(contentHash: string): Promise<XhsPost | null> {
    return this.prisma.xhsPost.findFirst({
      where: { contentHash },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsertByDedupRules(input: UpsertXhsPostInput): Promise<UpsertXhsPostResult> {
    const existingByPostId = await this.findByPostId(input.postId);
    if (existingByPostId) {
      // Allow recovery: refresh records that were previously detail_unavailable.
      if (existingByPostId.status === "detail_unavailable") {
        const recovered = input.status !== "detail_unavailable";
        const shouldRefreshErrorMessage = input.errorMessage && input.errorMessage !== existingByPostId.errorMessage;

        if (recovered || shouldRefreshErrorMessage) {
          const updated = await this.prisma.xhsPost.update({
            where: { postId: input.postId },
            data: {
              xsecToken: input.xsecToken ?? existingByPostId.xsecToken,
              title: input.title || existingByPostId.title,
              contentRaw: input.contentRaw || existingByPostId.contentRaw,
              contentClean: input.contentClean || existingByPostId.contentClean,
              contentHash: input.contentHash || existingByPostId.contentHash,
              authorId: input.authorId ?? existingByPostId.authorId,
              authorName: input.authorName ?? existingByPostId.authorName,
              publishTime: input.publishTime ?? existingByPostId.publishTime,
              likeCount: input.likeCount ?? existingByPostId.likeCount,
              commentCount: input.commentCount ?? existingByPostId.commentCount,
              collectCount: input.collectCount ?? existingByPostId.collectCount,
              shareCount: input.shareCount ?? existingByPostId.shareCount,
              sourceUrl: input.sourceUrl ?? existingByPostId.sourceUrl,
              tags: input.tags ?? existingByPostId.tags,
              status: recovered ? "new" : "detail_unavailable",
              errorMessage: recovered ? null : (input.errorMessage ?? existingByPostId.errorMessage),
            },
          });
          return { action: "deduped_post_id", record: updated };
        }
      }

      return { action: "deduped_post_id", record: existingByPostId };
    }

    const existingByHash = await this.findByContentHash(input.contentHash);
    if (existingByHash) {
      return { action: "deduped_hash", record: existingByHash };
    }

    const created = await this.prisma.xhsPost.create({
      data: {
        postId: input.postId,
        xsecToken: input.xsecToken,
        title: input.title,
        contentRaw: input.contentRaw,
        contentClean: input.contentClean,
        contentHash: input.contentHash,
        authorId: input.authorId,
        authorName: input.authorName,
        publishTime: input.publishTime,
        likeCount: input.likeCount ?? 0,
        commentCount: input.commentCount ?? 0,
        collectCount: input.collectCount ?? 0,
        shareCount: input.shareCount ?? 0,
        sourceUrl: input.sourceUrl,
        tags: input.tags,
        status: input.status ?? "new",
        errorMessage: input.errorMessage,
      },
    });

    return { action: "inserted", record: created };
  }

  async listRecent(limit = 20): Promise<XhsPost[]> {
    return this.prisma.xhsPost.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async listDetailUnavailableForRetry(limit = 20): Promise<XhsPost[]> {
    return this.prisma.xhsPost.findMany({
      where: {
        status: "detail_unavailable",
        xsecToken: {
          not: null,
        },
      },
      orderBy: { updatedAt: "asc" },
      take: limit,
    });
  }
}
