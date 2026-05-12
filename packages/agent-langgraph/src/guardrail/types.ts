/**
 * GuardRail 类型定义 —— 三层防护通用 schema
 */

export type GuardLayer = "input" | "tool" | "output";

/** 风险等级 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** 单条命中规则 */
export interface GuardHit {
  ruleId: string;
  ruleName: string;
  layer: GuardLayer;
  risk: RiskLevel;
  reason: string;          // 大白话说明为啥命中（面试演示时直接展示）
  matchedText?: string;    // 命中的具体片段
  suggestion?: string;     // 给业务侧的处理建议
}

/** GuardRail 检查结果 */
export interface GuardResult {
  layer: GuardLayer;
  passed: boolean;                 // 是否通过（关键决策位）
  hits: GuardHit[];                // 命中的规则列表
  maxRisk: RiskLevel;              // 命中规则中的最高风险
  action: "allow" | "sanitize" | "block";  // 给业务侧的处理建议
  sanitizedInput?: string;         // 脱敏后的输入（仅 action=sanitize 时返回）
  metadata?: Record<string, any>;  // 各层自定义元数据
  durationMs: number;
}

/** GuardRail 配置（黑名单 / 阈值，方便后续替换） */
export interface GuardRailPolicies {
  // L1
  injectionRules: { id: string; pattern: RegExp; risk: RiskLevel; reason: string }[];
  /** 注入检测最长允许长度 */
  maxInputLength: number;
  // L2
  toolBlacklist: { pattern: RegExp; reason: string }[];
  /** 工具 query 最长长度（防止 prompt-overflow 攻击） */
  maxToolQueryLength: number;
  // L3
  /** 相关性阈值（cosine sim 低于此值标记 LOW relevance） */
  relevanceThreshold: number;
  /** 抽取的事实陈述中，多少比例需要被 RAG 命中才认为通过 */
  factVerificationRatio: number;
}
