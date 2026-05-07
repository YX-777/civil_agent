/**
 * 瞬时记忆管理器 - 滑动窗口裁剪
 *
 * 大白话解释：
 * 就像你正在说的话，立刻就能回忆起来。
 * 我们用滑动窗口只保留最近 N 条消息，避免无限增长消耗太多 token。
 */

export interface InstantMemoryConfig {
  maxMessages: number;        // 最大消息数（默认 10）
  maxTokens: number;          // 最大 token 数（默认 2000）
  preserveSystemPrompt: boolean; // 是否保留系统提示
}

export interface InstantMemorySlice {
  messages: Message[];        // 滑动窗口内的消息
  tokenCount: number;         // 当前 token 数
  windowStartIndex: number;   // 窗口起始索引（用于日志）
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// 默认配置
const DEFAULT_CONFIG: InstantMemoryConfig = {
  maxMessages: 10,
  maxTokens: 2000,
  preserveSystemPrompt: true,
};

export class InstantMemoryManager {
  private config: InstantMemoryConfig;

  constructor(config?: Partial<InstantMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 滑动窗口裁剪：保留最近 N 条或最大 Token 数
   *
   * 技术原理：
   * 从最新消息往前遍历，直到达到限制。
   * 这样确保 Agent 总是能看到最近的对话上下文。
   */
  trimMessages(messages: Message[]): InstantMemorySlice {
    console.log("=".repeat(60));
    console.log("[InstantMemory] 开始滑动窗口裁剪");
    console.log(`[InstantMemory] 输入消息数: ${messages.length}`);
    console.log(`[InstantMemory] 配置: maxMessages=${this.config.maxMessages}, maxTokens=${this.config.maxTokens}`);

    let totalTokens = 0;
    let trimmedMessages: Message[] = [];

    // 先处理系统提示（如果需要保留）
    let systemPrompt: Message | null = null;
    let startIndex = 0;

    if (this.config.preserveSystemPrompt && messages.length > 0) {
      const firstMsg = messages[0];
      if (firstMsg.role === "system") {
        systemPrompt = firstMsg;
        startIndex = 1;
        totalTokens = this.estimateTokens(firstMsg.content);
        console.log(`[InstantMemory] 系统提示已保留，tokens=${totalTokens}`);
      }
    }

    // 从最新消息往前遍历（滑动窗口核心逻辑）
    for (let i = messages.length - 1; i >= startIndex; i--) {
      const msg = messages[i];
      const msgTokens = this.estimateTokens(msg.content);

      // 检查是否超过限制
      if (trimmedMessages.length >= this.config.maxMessages ||
          totalTokens + msgTokens > this.config.maxTokens) {
        console.log(`[InstantMemory] 达到限制，停止裁剪。已裁剪 ${trimmedMessages.length} 条`);
        break;
      }

      trimmedMessages.unshift(msg);
      totalTokens += msgTokens;
    }

    // 如果有系统提示，放回开头
    if (systemPrompt) {
      trimmedMessages.unshift(systemPrompt);
    }

    const windowStartIndex = messages.length - trimmedMessages.length + (systemPrompt ? 1 : 0);

    console.log(`[InstantMemory] 输出消息数: ${trimmedMessages.length}`);
    console.log(`[InstantMemory] 总 tokens: ${totalTokens}`);
    console.log(`[InstantMemory] 窗口起始索引: ${windowStartIndex}`);
    console.log("=".repeat(60));

    return {
      messages: trimmedMessages,
      tokenCount: totalTokens,
      windowStartIndex,
    };
  }

  /**
   * Token 估算（面试可讲）
   *
   * 技术原理：
   * - 中文约 2 字/token
   * - 英文约 4 字/token
   * 这是简化估算，实际可以用 tiktoken 精确计算
   */
  estimateTokens(content: string): number {
    if (!content) return 0;

    // 统计中文字符
    const chineseChars = content.match(/[一-龥]/g)?.length || 0;
    // 其他字符（英文、数字、符号等）
    const otherChars = content.length - chineseChars;

    // 中文 2 字/token，英文 4 字/token
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  /**
   * 获取当前配置
   */
  getConfig(): InstantMemoryConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<InstantMemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 单例实例（供全局使用）
let instantMemoryManager: InstantMemoryManager | null = null;

export function getInstantMemoryManager(config?: Partial<InstantMemoryConfig>): InstantMemoryManager {
  if (!instantMemoryManager) {
    instantMemoryManager = new InstantMemoryManager(config);
  }
  return instantMemoryManager;
}