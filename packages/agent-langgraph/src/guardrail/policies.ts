/**
 * GuardRail 默认策略 —— 配置中心，方便审计 / 调整
 *
 * 设计原则：
 *   1. 规则可枚举（黑名单 / 模式），不依赖 LLM 二次判断 → 0 token 0 延迟
 *   2. 中英文双语覆盖（多语种）
 *   3. 分级触发，HIGH 直接拒绝，MEDIUM 脱敏，LOW 仅记录
 */

import type { GuardRailPolicies } from "./types";

export const DEFAULT_POLICIES: GuardRailPolicies = {
  // ============ L1 注入检测规则 ============
  injectionRules: [
    // 经典 prompt injection（允许中间有"所有"/"全部"/"的"等连接词）
    {
      id: "inj-ignore-prev",
      pattern: /(忽略|忽视|无视|清空)[\s\S]{0,5}?(以上|之前|以前|前面|上面)[\s\S]{0,8}?(指令|提示|内容|规则|prompt)/i,
      risk: "high",
      reason: "尝试覆盖系统指令（中文）",
    },
    {
      id: "inj-ignore-en",
      pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
      risk: "high",
      reason: "Classic English prompt injection",
    },
    {
      id: "inj-jailbreak-dan",
      pattern: /\b(DAN|do anything now|developer mode|jailbreak)\b/i,
      risk: "high",
      reason: "已知越狱模板（DAN / Developer Mode / Jailbreak）",
    },
    {
      id: "inj-roleplay-system",
      pattern: /(你现在是|你扮演|从现在开始你是|act as|you are now)\s*[（(]?\s*(管理员|admin|root|系统|sudoer|无限制|开发者|超级用户)/i,
      risk: "high",
      reason: "试图通过角色扮演绕过限制",
    },
    {
      id: "inj-pseudo-role",
      pattern: /(^|\n)\s*(system|assistant|user)\s*[:：]\s/i,
      risk: "medium",
      reason: "伪造 system / assistant / user 角色头",
    },
    {
      id: "inj-prompt-leak",
      pattern: /(打印|输出|告诉我|reveal|show me|print|输出原始)(.*?)(system\s*prompt|系统提示|系统指令|原始指令)/i,
      risk: "high",
      reason: "尝试泄露 system prompt",
    },
    {
      id: "inj-secret-leak",
      pattern: /(api[\s_-]?key|access[\s_-]?token|secret|密钥|access\s*key|admin\s*password|管理员密码)/i,
      risk: "medium",
      reason: "试图套取密钥 / Token / 管理员密码",
    },
    // markdown 注入（用代码块包裹假指令）
    {
      id: "inj-markdown-fence",
      pattern: /```\s*(system|assistant)[:\s]/i,
      risk: "medium",
      reason: "Markdown 代码块伪装的注入",
    },
  ],
  maxInputLength: 4000,

  // ============ L2 工具参数黑名单 ============
  toolBlacklist: [
    // SQL 注入特征
    { pattern: /\b(union\s+select|drop\s+table|or\s+1\s*=\s*1|--\s*$)/i, reason: "疑似 SQL 注入" },
    // Shell 注入
    { pattern: /(\$\{IFS\}|`.*?`|;\s*(rm|cat|curl|wget|sh)\s)/i, reason: "疑似 Shell 注入" },
    // SSRF：常见内网/特殊协议地址（云元数据 / localhost / 私网段 / file:// 等）
    { pattern: /(file:\/\/|gopher:\/\/|jar:|dict:\/\/|169\.254\.169\.254|metadata\.google\.internal|127\.0\.0\.1[:\/]|localhost[:\/]|192\.168\.\d|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d)/i, reason: "疑似 SSRF / 内网访问" },
  ],
  maxToolQueryLength: 500,

  // ============ L3 输出验证 ============
  relevanceThreshold: 0.25,    // < 0.25 标记 LOW relevance
  factVerificationRatio: 0.3,  // 30% 的事实需要有 RAG 来源对应（技术问答场景宽松些）
};
