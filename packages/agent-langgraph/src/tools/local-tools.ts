/**
 * 本地工具
 * Agent 使用的本地工具函数
 */

import { logger } from "@civil-agent/core";

/**
 * 时间工具
 */
export class TimeTools {
  /**
   * 获取当前时间的小时数
   */
  static getCurrentHour(): number {
    return new Date().getHours();
  }

  /**
   * 判断是否是早上 (6:00 - 12:00)
   */
  static isMorning(): boolean {
    const hour = this.getCurrentHour();
    return hour >= 6 && hour < 12;
  }

  /**
   * 判断是否是晚上 (18:00 - 24:00)
   */
  static isEvening(): boolean {
    const hour = this.getCurrentHour();
    return hour >= 18 && hour < 24;
  }

  /**
   * 判断是否是深夜 (22:00 - 6:00)
   */
  static isLateNight(): boolean {
    const hour = this.getCurrentHour();
    return hour >= 22 || hour < 6;
  }

  /**
   * 格式化日期
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * 格式化时间
   */
  static formatTime(date: Date): string {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * 计算日期差（天数）
   */
  static daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
    return diffDays;
  }
}

/**
 * 字符串工具
 */
export class StringTools {
  /**
   * 截断字符串
   */
  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + "...";
  }

  /**
   * 提取关键词
   */
  static extractKeywords(text: string, maxKeywords: number = 5): string[] {
    const words = text.split(/\s+/);
    const stopWords = ["的", "了", "是", "在", "我", "你", "他", "她", "它", "们", "和", "与", "或"];
    const keywords = words
      .filter((word) => word.length > 1 && !stopWords.includes(word))
      .slice(0, maxKeywords);
    return keywords;
  }

  /**
   * 清理文本
   */
  static cleanText(text: string): string {
    return text.trim().replace(/\s+/g, " ");
  }
}

/**
 * 数据工具
 */
export class DataTools {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 合并对象
   */
  static merge<T extends Record<string, any>>(...objs: T[]): T {
    return Object.assign({}, ...objs);
  }

  /**
   * 检查是否为空
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  }

  /**
   * 生成唯一 ID
   */
  static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 学习进度工具
 */
export class ProgressTools {
  /**
   * 计算正确率
   */
  static calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }

  /**
   * 计算学习强度
   */
  static calculateStudyIntensity(daysStudied: number, totalDays: number): number {
    if (totalDays === 0) return 0;
    return Math.round((daysStudied / totalDays) * 100);
  }

  /**
   * 分析薄弱模块
   */
  static identifyWeakModules(
    moduleScores: Record<string, number>,
    threshold: number = 60
  ): string[] {
    return Object.entries(moduleScores)
      .filter(([_, score]) => score < threshold)
      .map(([module]) => module);
  }

  /**
   * 分析优势模块
   */
  static identifyStrongModules(
    moduleScores: Record<string, number>,
    threshold: number = 80
  ): string[] {
    return Object.entries(moduleScores)
      .filter(([_, score]) => score >= threshold)
      .map(([module]) => module);
  }
}

/**
 * 验证工具
 */
export class ValidationTools {
  /**
   * 验证用户 ID
   */
  static validateUserId(userId: string): boolean {
    return typeof userId === "string" && userId.length > 0;
  }

  /**
   * 验证消息内容
   */
  static validateMessage(message: string): boolean {
    return typeof message === "string" && message.trim().length > 0;
  }

  /**
   * 验证任务计划
   */
  static validateTaskPlan(plan: any): boolean {
    if (!plan || typeof plan !== "object") return false;
    if (!plan.module || !plan.dailyQuestions || !plan.difficulty || !plan.duration) {
      return false;
    }
    return true;
  }
}

/**
 * 日志工具
 */
export class LogTools {
  /**
   * 记录用户交互
   */
  static logUserInteraction(userId: string, action: string, data?: any): void {
    logger.info(`User interaction: ${userId} - ${action}`, data);
  }

  /**
   * 记录 Agent 决策
   */
  static logAgentDecision(userId: string, intent: string, decision: string): void {
    logger.info(`Agent decision: ${userId} - Intent: ${intent} - Decision: ${decision}`);
  }

  /**
   * 记录错误
   */
  static logError(context: string, error: Error): void {
    logger.error(`Error in ${context}`, error);
  }
}