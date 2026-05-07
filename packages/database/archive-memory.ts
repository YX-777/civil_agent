/**
 * 短期记忆归档脚本
 *
 * 运行方式：
 * - 手动触发：tsx archive-memory.ts --user=test-user-001
 * - 全量归档：tsx archive-memory.ts --all
 */

import {
  getShortTermMemoryRepository,
  getVectorDBService,
  getEmbeddingService,
} from "./src/index";

// 模拟衰减（用于测试）
function simulateDecay(days: number): number {
  // 指数衰减：0.5^(days/7)
  return Math.pow(0.5, days / 7);
}

async function archiveMemory(userId?: string, simulateDays?: number) {
  console.log("=".repeat(60));
  console.log("📦 短期记忆归档到长期记忆");
  console.log("=".repeat(60));

  const shortRepo = getShortTermMemoryRepository();
  const vectorService = getVectorDBService();
  const embeddingService = getEmbeddingService();

  // 初始化向量服务
  await vectorService.initialize();

  // 获取需要归档的记忆
  let memories: any[];

  if (userId) {
    // 指定用户：获取所有活跃记忆（用于测试模拟衰减）
    memories = await shortRepo.findActiveByUserId(userId, 100);
    console.log(`[Archive] 用户 ${userId}: ${memories.length} 条活跃记忆`);
  } else {
    // 全量：获取所有需要归档的记忆（真实衰减）
    memories = await shortRepo.findAllExpired(0.1);
    console.log(`[Archive] 全量: ${memories.length} 条待归档记忆`);
  }

  if (memories.length === 0) {
    console.log("❌ 无需归档的记忆");
    return { archived: 0 };
  }

  // 模拟衰减（测试用）
  if (simulateDays) {
    console.log(`[Archive] 模拟 ${simulateDays} 天衰减...`);
    for (const memory of memories) {
      const decayedFreshness = simulateDecay(simulateDays);
      console.log(`  - 记忆 ${memory.id.slice(0, 8)}: 新鲜度 ${memory.freshnessScore.toFixed(2)} → ${decayedFreshness.toFixed(2)}`);
      memory.freshnessScore = decayedFreshness;
    }
  }

  // 过滤需要归档的记忆（新鲜度 < 0.1）
  const toArchive = memories.filter(m => m.freshnessScore < 0.1);
  console.log(`[Archive] 需归档: ${toArchive.length} 条（新鲜度 < 0.1）`);

  if (toArchive.length === 0) {
    console.log("❌ 模拟衰减后仍无需归档");
    return { archived: 0 };
  }

  // 执行归档
  let archivedCount = 0;

  for (const memory of toArchive) {
    try {
      console.log(`\n[Archive] 处理: ${memory.id}`);
      console.log(`  - 内容: "${memory.content.slice(0, 50)}..."`);
      console.log(`  - 话题: ${memory.topicTags || "无"}`);

      // 生成 embedding
      const vector = await embeddingService.generateEmbedding(memory.content);
      console.log(`  - 向量维度: ${vector.length}`);

      // 计算初始权重（基于访问次数）
      const weight = Math.min(memory.accessCount * 0.05 + 0.1, 1.0);
      console.log(`  - 初始权重: ${weight.toFixed(2)} (访问次数: ${memory.accessCount})`);

      // 存入长期记忆向量库
      const vectorId = `lm_${memory.id}`;
      await vectorService.addEmbedding(
        "long_term_memory",
        vectorId,
        vector,
        {
          user_id: memory.userId,
          memory_id: memory.id,
          content_type: memory.contentType,
          content: memory.content,
          weight,
          topics: memory.topicTags ? JSON.parse(memory.topicTags) : [],
          creation_date: new Date().toISOString(),
          source_conversation: memory.conversationId,
          access_count: memory.accessCount,
        }
      );
      console.log(`  ✅ 向量已存储: ${vectorId}`);

      // 标记短期记忆为已归档
      await shortRepo.markArchived(memory.id);
      console.log(`  ✅ 短期记忆已标记归档`);

      archivedCount++;
    } catch (error) {
      console.error(`  ❌ 归档失败: ${error}`);
    }
  }

  console.log("\n" + "=" .repeat(60));
  console.log(`📦 归档完成: ${archivedCount} 条`);
  console.log("=".repeat(60));

  return { archived: archivedCount };
}

// 解析命令行参数
const args = process.argv.slice(2);
const userArg = args.find(a => a.startsWith("--user="));
const daysArg = args.find(a => a.startsWith("--days="));
const allArg = args.includes("--all");

const userId = userArg ? userArg.split("=")[1] : undefined;
const simulateDays = daysArg ? parseInt(daysArg.split("=")[1]) : undefined;

archiveMemory(allArg ? undefined : userId, simulateDays).catch(console.error);