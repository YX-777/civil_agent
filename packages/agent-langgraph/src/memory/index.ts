/**
 * 四阶分层记忆系统
 *
 * 大白话解释：
 * 模拟人类大脑的记忆机制，分为四层：
 * 1. Instant（瞬时）：当前对话上下文，滑动窗口管理
 * 2. Short（短期）：近期对话历史，新鲜度衰减
 * 3. Long（长期）：重要记忆向量存储，权重管理
 * 4. Meta（元）：用户画像和能力图谱
 */

// 瞬时记忆
export {
  InstantMemoryManager,
  getInstantMemoryManager,
  type InstantMemoryConfig,
  type InstantMemorySlice,
  type Message,
} from "./instant";

// 短期记忆衰减
export {
  ShortMemoryDecayCalculator,
  getShortMemoryDecayCalculator,
  type ShortMemory,
  type DecayResult,
} from "./short";

// 短期记忆强化
export {
  ShortMemoryReinforcer,
  getShortMemoryReinforcer,
  type ReinforceTrigger,
} from "./reinforce";

// 长期记忆归档
export {
  LongMemoryArchiver,
  getLongMemoryArchiver,
  type LongMemoryMetadata,
  type ArchiveResult,
} from "./long";

// 元记忆聚合
export {
  MetaMemoryAggregator,
  getMetaMemoryAggregator,
  type SkillGraphNode,
  type MetaMemoryData,
} from "./meta";

// 四层融合检索
export {
  MemoryFusionRetriever,
  getMemoryFusionRetriever,
  type FusedMemoryContext,
} from "./fusion";