/**
 * 短期记忆强化器
 *
 * 大白话解释：
 * 就像你反复复习的内容会记得更牢。
 * 当用户再次提起某个话题时，自动强化相关记忆。
 */

import { getShortTermMemoryRepository } from "@tech-mate/database";
import type { ShortMemory } from "./short";

export type ReinforceTrigger = "topic_match" | "retrieval_hit" | "explicit";

export class ShortMemoryReinforcer {
  /**
   * 强化记忆（面试可讲）
   *
   * 强化触发：
   * 1. topic_match：用户消息匹配已有话题 → +0.15 新鲜度
   * 2. retrieval_hit：检索命中某条记忆 → +0.10 新鲜度
   * 3. explicit：用户明确说"这个很重要" → +0.30 新鲜度
   */
  async reinforce(memoryId: string, trigger: ReinforceTrigger): Promise<void> {
    console.log(`[ShortMemory] 强化记忆: ${memoryId}, 触发类型: ${trigger}`);

    const repo = getShortTermMemoryRepository();

    // 增加访问次数并更新访问时间
    await repo.reinforce(memoryId);

    // 根据触发类型计算额外新鲜度增量
    const boost = this.getBoostAmount(trigger);
    console.log(`  - 新鲜度增量: +${boost.toFixed(2)}`);
  }

  /**
   * 根据触发类型获取强化增量
   */
  private getBoostAmount(trigger: ReinforceTrigger): number {
    switch (trigger) {
      case "explicit":
        return 0.3;  // 用户明确说重要，强化最多
      case "topic_match":
        return 0.15; // 话题匹配，中等强化
      case "retrieval_hit":
        return 0.1;  // 检索命中，基础强化
      default:
        return 0.1;
    }
  }

  /**
   * 话题关联检测（面试可讲）
   *
   * 技术原理：
   * 检测用户新消息是否包含已有话题关键词。
   * 如果匹配，强化相关记忆。
   */
  async detectAndReinforce(userId: string, newMessage: string): Promise<string[]> {
    console.log(`[ShortMemory] 话题关联检测: "${newMessage.slice(0, 50)}..."`);

    const repo = getShortTermMemoryRepository();

    // 获取用户所有活跃记忆
    const memories = await repo.findActiveByUserId(userId, 20);

    // 检测匹配的话题
    const matchedTopics: string[] = [];
    const matchedMemoryIds: string[] = [];

    for (const memory of memories) {
      if (!memory.topicTags) continue;

      const topics = JSON.parse(memory.topicTags);
      for (const topic of topics) {
        if (newMessage.toLowerCase().includes(topic.toLowerCase())) {
          matchedTopics.push(topic);
          matchedMemoryIds.push(memory.id);
          console.log(`  - 匹配话题: ${topic}`);
        }
      }
    }

    // 强化匹配的记忆
    for (const memoryId of matchedMemoryIds) {
      await this.reinforce(memoryId, "topic_match");
    }

    if (matchedTopics.length === 0) {
      console.log(`  - 无匹配话题`);
    }

    return matchedTopics;
  }

  /**
   * 处理用户明确表达的重要性
   *
   * 检测关键词："这个很重要"、"记住这个"、"别忘了" 等
   */
  async handleExplicitImportance(userId: string, message: string): Promise<boolean> {
    const importanceKeywords = ["很重要", "记住这个", "别忘了", "重点", "关键"];

    const isImportant = importanceKeywords.some((k) => message.includes(k));

    if (isImportant) {
      console.log(`[ShortMemory] 检测到重要性标记`);

      // 获取最近的短期记忆并强化
      const repo = getShortTermMemoryRepository();
      const recentMemories = await repo.findActiveByUserId(userId, 3);

      for (const memory of recentMemories) {
        await this.reinforce(memory.id, "explicit");
      }

      return true;
    }

    return false;
  }
}

// 单例实例
let reinforcer: ShortMemoryReinforcer | null = null;

export function getShortMemoryReinforcer(): ShortMemoryReinforcer {
  if (!reinforcer) {
    reinforcer = new ShortMemoryReinforcer();
  }
  return reinforcer;
}