import { weeklyXiaohongshuSyncJob } from "../jobs/weekly-xiaohongshu-sync";
import { getPrismaClient, initializeDatabase, disconnectDatabase } from "@civil-agent/database";

function parseLimit(): number {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return 5;
  const raw = Number(arg.split("=")[1]);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(Math.floor(raw), 50);
}

async function main() {
  const limit = parseLimit();
  console.log(`[xhs-sync-test] start, limit=${limit}`);

  await initializeDatabase({ skipVectorDB: true });

  const result = await weeklyXiaohongshuSyncJob({ limit, page: 1 });
  console.log("[xhs-sync-test] job result:", result);

  const prisma = getPrismaClient();
  const [run, posts] = await Promise.all([
    prisma.xhsSyncRun.findUnique({
      where: { id: result.runId },
    }),
    prisma.xhsPost.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        postId: true,
        title: true,
        authorName: true,
        likeCount: true,
        createdAt: true,
      },
    }),
  ]);

  console.log("[xhs-sync-test] latest run:", run);
  console.log(`[xhs-sync-test] latest ${posts.length} posts:`);
  for (const [index, post] of posts.entries()) {
    console.log(
      `${index + 1}. postId=${post.postId} title=${post.title} author=${post.authorName ?? "unknown"} likes=${post.likeCount}`
    );
  }
}

main()
  .catch((error) => {
    console.error("[xhs-sync-test] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });

