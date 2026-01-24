/**
 * 上下文增强中间件
 * 增强对话上下文信息
 */

import { logger } from "@civil-agent/core";
import { getMCPToolClient } from "../tools/mcp-tools";
import { TimeTools } from "../tools/local-tools";

export interface ContextEnhancement {
  timeContext: string;
  dateContext: string;
  learningContext?: string;
  emotionContext?: string;
  ragContext?: any[];
}

/**
 * 上下文增强器
 */
export class ContextEnhancer {
  /**
   * 增强对话上下文
   */
  async enhanceContext(userId: string, message: string): Promise<ContextEnhancement> {
    const enhancement: ContextEnhancement = {
      timeContext: this.getTimeContext(),
      dateContext: this.getDateContext(),
    };

    try {
      enhancement.learningContext = await this.getLearningContext(userId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn("Failed to get learning context", err);
    }

    return enhancement;
  }

  /**
   * 获取时间上下文
   */
  private getTimeContext(): string {
    const hour = TimeTools.getCurrentHour();

    if (hour >= 5 && hour < 9) {
      return "早上";
    } else if (hour >= 9 && hour < 12) {
      return "上午";
    } else if (hour >= 12 && hour < 14) {
      return "中午";
    } else if (hour >= 14 && hour < 18) {
      return "下午";
    } else if (hour >= 18 && hour < 22) {
      return "晚上";
    } else {
      return "深夜";
    }
  }

  /**
   * 获取日期上下文
   */
  private getDateContext(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    return `${TimeTools.formatDate(now)} ${dayNames[dayOfWeek]}`;
  }

  /**
   * 获取学习上下文
   */
  private async getLearningContext(userId: string): Promise<string> {
    try {
      const mcpClient = getMCPToolClient();
      const result = await mcpClient.searchKnowledge({
        query: `用户 ${userId} 的学习历史`,
        category: "user_history",
        topK: 3,
      });

      if (result.success && result.data?.results?.length > 0) {
        const contexts = result.data.results.map((r: any) => r.content);
        return contexts.join("\n");
      }

      return "暂无学习记录";
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn("Failed to retrieve learning context", err);
      return "学习上下文获取失败";
    }
  }

  /**
   * 增强用户消息
   */
  async enhanceUserMessage(userId: string, message: string): Promise<string> {
    const context = await this.enhanceContext(userId, message);

    let enhancedMessage = message;

    if (context.timeContext) {
      enhancedMessage = `[时间：${context.timeContext}] ${enhancedMessage}`;
    }

    if (context.dateContext) {
      enhancedMessage = `[日期：${context.dateContext}] ${enhancedMessage}`;
    }

    if (context.learningContext && context.learningContext !== "暂无学习记录") {
      enhancedMessage = `[学习上下文：${context.learningContext}] ${enhancedMessage}`;
    }

    return enhancedMessage;
  }

  /**
   * 生成系统提示词增强
   */
  generateSystemPromptEnhancement(context: ContextEnhancement): string {
    let enhancement = "";

    if (context.timeContext) {
      enhancement += `\n当前时间：${context.timeContext}`;
    }

    if (context.dateContext) {
      enhancement += `\n当前日期：${context.dateContext}`;
    }

    if (context.learningContext) {
      enhancement += `\n学习上下文：${context.learningContext}`;
    }

    return enhancement;
  }

  /**
   * 提取对话历史摘要
   */
  summarizeConversationHistory(messages: any[], maxMessages: number = 5): string {
    const recentMessages = messages.slice(-maxMessages);
    const summary = recentMessages
      .map((msg) => {
        const role = msg.role === "user" ? "用户" : "助手";
        return `${role}：${msg.content}`;
      })
      .join("\n");

    return summary;
  }

  /**
   * 检测对话主题变化
   */
  detectTopicChange(messages: any[]): boolean {
    if (messages.length < 2) return false;

    const lastMessage = messages[messages.length - 1];
    const secondLastMessage = messages[messages.length - 2];

    if (lastMessage.role !== "user" || secondLastMessage.role !== "assistant") {
      return false;
    }

    const lastUserMessage = lastMessage.content;
    const lastAssistantMessage = secondLastMessage.content;

    const topicChangeKeywords = ["另外", "还有", "换个话题", "不谈这个", "别的"];
    return topicChangeKeywords.some((keyword) => lastUserMessage.includes(keyword));
  }
}

/**
 * 单例上下文增强器
 */
let contextEnhancerInstance: ContextEnhancer | null = null;

export function getContextEnhancer(): ContextEnhancer {
  if (!contextEnhancerInstance) {
    contextEnhancerInstance = new ContextEnhancer();
  }
  return contextEnhancerInstance;
}