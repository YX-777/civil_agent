import type { XhsSyncRun } from "@prisma/client";
import { BaseRepository } from "./base.repository";

export interface XhsSyncRunStats {
  fetchedCount: number;
  insertedCount: number;
  dedupedPostIdCount: number;
  dedupedHashCount: number;
  invalidCount: number;
  failedCount: number;
  reportJson?: string;
}

export class XhsSyncRunRepository extends BaseRepository<XhsSyncRun> {
  constructor(prisma: any) {
    super(prisma, "xhsSyncRun");
  }

  async createRun(jobName: string, requestedLimit: number): Promise<XhsSyncRun> {
    return this.prisma.xhsSyncRun.create({
      data: {
        jobName,
        requestedLimit,
        status: "running",
      },
    });
  }

  async finishRunSuccess(id: string, stats: XhsSyncRunStats): Promise<XhsSyncRun> {
    return this.prisma.xhsSyncRun.update({
      where: { id },
      data: {
        status: "success",
        fetchedCount: stats.fetchedCount,
        insertedCount: stats.insertedCount,
        dedupedPostIdCount: stats.dedupedPostIdCount,
        dedupedHashCount: stats.dedupedHashCount,
        invalidCount: stats.invalidCount,
        failedCount: stats.failedCount,
        reportJson: stats.reportJson,
        endedAt: new Date(),
      },
    });
  }

  async finishRunFailed(id: string, errorMessage: string, stats?: Partial<XhsSyncRunStats>): Promise<XhsSyncRun> {
    return this.prisma.xhsSyncRun.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage,
        fetchedCount: stats?.fetchedCount ?? 0,
        insertedCount: stats?.insertedCount ?? 0,
        dedupedPostIdCount: stats?.dedupedPostIdCount ?? 0,
        dedupedHashCount: stats?.dedupedHashCount ?? 0,
        invalidCount: stats?.invalidCount ?? 0,
        failedCount: stats?.failedCount ?? 1,
        reportJson: stats?.reportJson,
        endedAt: new Date(),
      },
    });
  }
}

