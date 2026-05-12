/**
 * 四层记忆融合检索器
 *
 * 大白话解释：
 * 就像回忆一件事，你会结合：
 * - 当前正在想的（瞬时）
 * - 最近发生的（短期）
 * - 以前学过的（长期）
 * - 自己的性格习惯（元）
 * 来综合判断。
 */

import {
  getShortTermMemoryRepository,
  getMetaMemoryRepository,
  getUserRepository,
} from "@tech-mate/database";
import {
  getInstantMemoryManager,
  getLongMemoryArchiver,
  getMetaMemoryAggregator,
  type Message,
  type InstantMemorySlice,
} from "./index";

export interface FusedMemoryContext {
  instant: InstantMemorySlice;
  short: any[];
  long: any[];
  meta: any;
  fusedContext: string;
}

export class MemoryFusionRetriever {
  /**
   * 四层记忆融合检索（面试可讲）
   *
   * 技术流程：
   * 1. 瞬时记忆：当前对话最近的 N 条消息（滑动窗口）
   * 2. 短期记忆：按新鲜度排序的近期话题（7天内）
   * 3. 长期记忆：向量相似检索（权重加权）
   * 4. 元记忆：用户画像和能力图谱
   * 5. 融合：按权重拼接上下文，提供给 Agent
   */
  async retrieve(userId: string, query: string, messages: Message[]): Promise<FusedMemoryContext> {
    console.log("=".repeat(60));
    console.log("[Memory] 开始四层记忆融合检索");
    console.log(`[Memory] 用户: ${userId}`);
    console.log(`[Memory] 查询: "${query.slice(0, 50)}..."`);
    console.log("=".repeat(60));

    // 1-4: 四个 retriever 独立、无依赖，全部并行检索
    // instant 是内存操作几乎瞬时；short/meta 走 SQLite；long 走 ChromaDB 向量检索
    // 串行总耗时 ≈ 各项相加；并行后 ≈ max(各项) ≈ 长期记忆耗时
    const t0 = Date.now();
    const [instantMemory, shortMemory, longMemory, metaMemory] = await Promise.all([
      this.getInstantMemory(messages),
      this.getShortMemory(userId, query),
      this.getLongMemory(userId, query),
      this.getMetaMemory(userId),
    ]);
    console.log(`[Memory] 4 路并行检索完成 ${Date.now() - t0}ms`);
    console.log(`[Memory] 瞬时记忆: ${instantMemory.messages.length} 条消息`);
    console.log(`[Memory] 短期记忆: ${shortMemory.length} 条相关记忆`);
    shortMemory.slice(0, 3).forEach((m: any) => {
      console.log(`  - ${m.topicTags || "无话题"}: 新鲜度=${(m.freshnessScore || 0).toFixed(2)}`);
    });
    console.log(`[Memory] 长期记忆: ${longMemory.length} 条相关经验`);
    longMemory.slice(0, 3).forEach((m: any) => {
      console.log(`  - 权重=${(m.metadata?.weight || 0).toFixed(2)}, 分数=${m.score.toFixed(2)}`);
    });
    console.log(`[Memory] 元记忆: 强项=${metaMemory.strongAreas?.join(",") || "暂无"}, 弱项=${metaMemory.weakAreas?.join(",") || "暂无"}`);
    console.log(`[Memory] 元记忆: 学习风格=${metaMemory.learningStyle || "未知"}, 连续学习=${metaMemory.consecutiveDays || 0}天`);

    // 5. 融合：按权重拼接上下文
    const fusedContext = this.fuseContexts(instantMemory, shortMemory, longMemory, metaMemory);
    console.log(`[Memory] 融合后上下文长度: ${fusedContext.length} 字符`);
    console.log("=".repeat(60));

    return {
      instant: instantMemory,
      short: shortMemory,
      long: longMemory,
      meta: metaMemory,
      fusedContext,
    };
  }

  /**
   * 获取瞬时记忆（滑动窗口裁剪）
   */
  private async getInstantMemory(messages: Message[]): Promise<InstantMemorySlice> {
    const manager = getInstantMemoryManager();
    return manager.trimMessages(messages);
  }

  /**
   * 获取短期记忆（新鲜度排序）
   */
  private async getShortMemory(userId: string, query: string): Promise<any[]> {
    try {
      const repo = getShortTermMemoryRepository();
      const memories = await repo.findActiveByUserId(userId, 10);

      // 按新鲜度排序
      return memories.sort((a: any, b: any) => b.freshnessScore - a.freshnessScore);
    } catch (error) {
      console.error("[Memory] 短期记忆获取失败:", error);
      return [];
    }
  }

  /**
   * 获取长期记忆（向量相似检索 + 权重加权）
   */
  private async getLongMemory(userId: string, query: string): Promise<any[]> {
    try {
      const archiver = getLongMemoryArchiver();
      return await archiver.search(userId, query, 5);
    } catch (error) {
      console.error("[Memory] 长期记忆获取失败:", error);
      return [];
    }
  }

  /**
   * 获取元记忆（用户画像）
   *
   * 额外读取 UserProfile.nickname —— 这是用户跨会话的"身份"，
   * 必须放进 fusedContext 让 LLM 看到，否则用户刷新一次就被遗忘。
   */
  private async getMetaMemory(userId: string): Promise<any> {
    try {
      const aggregator = getMetaMemoryAggregator();
      const summary = await aggregator.getSummary(userId);

      // 解析摘要获取结构化数据
      const repo = getMetaMemoryRepository();
      const meta = await repo.findByUserId(userId);

      // 读取用户昵称（跨会话身份）
      let nickname: string | null = null;
      try {
        const userRepo = getUserRepository();
        const profile = await userRepo.getUserProfile(userId);
        // 过滤默认值"学习者"——它不是用户真名
        if (profile?.nickname && profile.nickname !== "学习者") {
          nickname = profile.nickname;
        }
      } catch (e) {
        console.warn("[Memory] 读取 nickname 失败", e);
      }

      if (meta) {
        return {
          summary,
          nickname,
          strongAreas: JSON.parse(meta.strongAreas || "[]"),
          weakAreas: JSON.parse(meta.weakAreas || "[]"),
          learningStyle: meta.learningStyle,
          consecutiveDays: meta.consecutiveDays,
          averageAccuracy: meta.averageAccuracy,
        };
      }

      // 如果没有元记忆，返回默认值
      return {
        summary,
        nickname,
        strongAreas: [],
        weakAreas: [],
        learningStyle: null,
        consecutiveDays: 0,
        averageAccuracy: 0,
      };
    } catch (error) {
      console.error("[Memory] 元记忆获取失败:", error);
      return {
        summary: "",
        nickname: null,
        strongAreas: [],
        weakAreas: [],
        learningStyle: null,
        consecutiveDays: 0,
        averageAccuracy: 0,
      };
    }
  }

  /**
   * 融合上下文（面试可讲）
   *
   * 技术原理：
   * 按权重拼接各层记忆，构建 Agent 能理解的上下文：
   * - 元记忆作为系统提示的一部分（用户画像）
   * - 长期记忆作为知识背景（相关经验）
   * - 短期记忆作为近期话题（最近聊过什么）
   * - 瞬时记忆作为当前对话（正在说什么）
   */
  private fuseContexts(
    instant: InstantMemorySlice,
    short: any[],
    long: any[],
    meta: any
  ): string {
    let context = "";

    // 用户身份（跨会话的核心信息，放最前面让 LLM 一眼看到）
    if (meta.nickname) {
      context += `【用户称呼】${meta.nickname}（请使用此称呼与用户交流；用户已自报姓名，不要忽略）\n\n`;
    }

    // 元记忆作为系统提示的一部分
    if (meta.summary) {
      context += meta.summary + "\n\n";
    }

    // 长期记忆作为知识背景
    if (long.length > 0) {
      context += "【相关经验】\n";
      long.slice(0, 3).forEach((m: any) => {
        context += `- ${m.content?.slice(0, 100) || "无内容"}\n`;
      });
      context += "\n";
    }

    // 短期记忆作为近期话题
    if (short.length > 0) {
      context += "【近期话题】\n";
      short.slice(0, 3).forEach((m: any) => {
        const topics = m.topicTags ? JSON.parse(m.topicTags) : [];
        context += `- ${topics.join(", ") || "无话题"}: ${m.content?.slice(0, 50) || "无内容"}\n`;
      });
      context += "\n";
    }

    // 瞬时记忆作为当前对话（已裁剪）
    if (instant.messages.length > 0) {
      context += "【当前对话】\n";
      instant.messages.slice(-3).forEach((m: any) => {
        const role = m.role === "user" ? "用户" : m.role === "assistant" ? "助手" : "系统";
        context += `- ${role}: ${m.content?.slice(0, 100) || "无内容"}\n`;
      });
    }

    return context;
  }
}

// 单例实例
let retriever: MemoryFusionRetriever | null = null;

export function getMemoryFusionRetriever(): MemoryFusionRetriever {
  if (!retriever) {
    retriever = new MemoryFusionRetriever();
  }
  return retriever;
}