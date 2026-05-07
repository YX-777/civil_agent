/**
 * 记忆衰减和归档定时任务
 *
 * 功能：
 * 1. 每日衰减计算：更新短期记忆新鲜度
 * 2. 自动归档：将过期记忆归档到长期记忆
 *
 * 运行方式：
 * - 手动触发：tsx memory-cron.ts --run
 * - 定时运行：tsx memory-cron.ts --daemon
 */

import {
  getShortTermMemoryRepository,
  getVectorDBService,
  getEmbeddingService,
} from "./src/index";

const HALF_LIFE_DAYS = 7;
const ARCHIVE_THRESHOLD = 0.1;

// 计算衰减后的新鲜度
function calculateDecayedFreshness(
  createdAt: Date,
  lastAccessedAt: Date,
  accessCount: number
): number {
  const now = new Date();
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceAccess = Math.floor(
    (now.getTime() - lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 基础衰减
  const baseDecay = Math.pow(0.5, daysSinceCreation / HALF_LIFE_DAYS);

  // 访问强化
  const accessBoost = Math.min(accessCount * 0.1, 0.5);

  // 最近访问奖励
  const recentAccessBonus = daysSinceAccess < 1 ? 0.2 : 0;

  return Math.min(baseDecay + accessBoost + recentAccessBonus, 1.0);
}

async function runDecayAndArchive() {
  console.log("=".repeat(60));
  console.log("⏰ 记忆衰减和归档定时任务");
  console.log(`   时间: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  const shortRepo = getShortTermMemoryRepository();
  const vectorService = getVectorDBService();
  const embeddingService = getEmbeddingService();

  // Step 1: 获取所有活跃记忆
  console.log("\n📝 Step 1: 获取所有活跃记忆");
  const allMemories = await shortRepo.findAllActive();
  console.log(`   活跃记忆总数: ${allMemories.length}`);

  if (allMemories.length === 0) {
    console.log("   ❌ 无活跃记忆，任务结束");
    return;
  }

  // Step 2: 计算衰减
  console.log("\n📝 Step 2: 计算衰减并更新新鲜度");
  let updatedCount = 0;
  let toArchive: any[] = [];

  for (const memory of allMemories) {
    const newFreshness = calculateDecayedFreshness(
      memory.createdAt,
      memory.lastAccessedAt,
      memory.accessCount
    );

    // 更新新鲜度
    await shortRepo.updateFreshness(memory.id, newFreshness);
    updatedCount++;

    // 记录需要归档的记忆
    if (newFreshness < ARCHIVE_THRESHOLD) {
      toArchive.push({ ...memory, freshnessScore: newFreshness });
    }
  }

  console.log(`   ✅ 更新了 ${updatedCount} 条记忆的新鲜度`);
  console.log(`   📦 需归档: ${toArchive.length} 条（新鲜度 < ${ARCHIVE_THRESHOLD})`);

  // Step 3: 归档到长期记忆
  if (toArchive.length > 0) {
    console.log("\n📝 Step 3: 归档到长期记忆");

    // 初始化向量服务
    await vectorService.initialize();

    let archivedCount = 0;

    for (const memory of toArchive) {
      try {
        // 生成 embedding
        const vector = await embeddingService.generateEmbedding(memory.content);

        // 计算权重
        const weight = Math.min(memory.accessCount * 0.05 + 0.1, 1.0);

        // 存入长期记忆
        const vectorId = `lm_${memory.id}`;
        await vectorService.addEmbedding(
          "long_term_memory",
          vectorId,
          vector,
          {
            user_id: memory.userId,
            memory_id: memory.id,
            content: memory.content,
            content_type: memory.contentType,
            weight,
            topics: memory.topicTags ? JSON.parse(memory.topicTags) : [],
            creation_date: new Date().toISOString(),
            source_conversation: memory.conversationId,
            access_count: memory.accessCount,
          }
        );

        // 标记归档
        await shortRepo.markArchived(memory.id);
        archivedCount++;

        console.log(`   ✅ ${memory.id.slice(0, 8)}: 权重=${weight.toFixed(2)}`);
      } catch (error) {
        console.error(`   ❌ ${memory.id} 归档失败: ${error}`);
      }
    }

    console.log(`\n   📦 归档完成: ${archivedCount} 条`);
  }

  console.log("\n" + "=" .repeat(60));
  console.log("⏰ 定时任务完成");
  console.log("=".repeat(60));
}

async function findAllActive(): Promise<any[]> {
  const repo = getShortTermMemoryRepository();
  // 需要添加一个查询所有活跃记忆的方法
  // 这里暂时用 prisma 直接查询
  const prisma = repo.prisma;
  return prisma.shortTermMemory.findMany({
    where: { archived: false },
  });
}

// 监听器模式（用于定时运行）
async function startDaemon() {
  console.log("🚀 启动记忆衰减定时任务守护进程");
  console.log("   每天凌晨 3:00 执行");

  // 这里可以用 node-cron 或 setInterval
  // 简化版：每天运行一次
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // 立即运行一次
  await runDecayAndArchive();

  // 设置定时
  setInterval(async () => {
    await runDecayAndArchive();
  }, ONE_DAY_MS);

  console.log("   ✅ 守护进程已启动");
}

// 解析参数
const args = process.argv.slice(2);
const runOnce = args.includes("--run");
const daemon = args.includes("--daemon");

if (runOnce) {
  // 覆盖 findAllActive
  (global as any).findAllActive = findAllActive;
  runDecayAndArchive().catch(console.error);
} else if (daemon) {
  startDaemon().catch(console.error);
} else {
  console.log("用法:");
  console.log("  手动触发: tsx memory-cron.ts --run");
  console.log("  定时守护: tsx memory-cron.ts --daemon");
}